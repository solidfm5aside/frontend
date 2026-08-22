'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, Medal, RefreshCw, User } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { Select } from '@/components/ui/Select';
import { FullPageSpinner, PageSpinner } from '@/components/ui/Spinner';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';
import { useSocket } from '@/hooks/use-socket';
import { ApiResponse, PlayerStats, TeamStanding } from '@/types';
import { CompetitionGroupKey, GroupedStandings, GroupStandingRow } from '@/types/competition';

type TabType = 'table' | 'statistics';

const STANDINGS_TABS: readonly TabType[] = ['table', 'statistics'];
const COMPETITION_GROUPS: readonly CompetitionGroupKey[] = ['A', 'B'];

interface PublicTournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  currentStage: string;
  formatVersion?: 1 | 2;
  format?: 'legacy_league' | 'two_group_knockout';
}

interface RankedLegacyStanding extends TeamStanding {
  rank?: number;
}

const EMPTY_GROUPS: GroupedStandings = { A: [], B: [] };
const GROUP_RANKING_ORDER = [
  'Points',
  'Goal difference',
  'Goals scored',
  'Head-to-head',
  'Committee decision',
] as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function chooseDefaultTournament(tournaments: PublicTournament[]) {
  const byNewestStart = (left: PublicTournament, right: PublicTournament) =>
    new Date(right.startDate).getTime() - new Date(left.startDate).getTime();

  for (const status of ['ongoing', 'completed', 'upcoming'] as const) {
    const tournament = tournaments.filter((item) => item.status === status).sort(byNewestStart)[0];
    if (tournament) return tournament;
  }
  return null;
}

function tabClassName(active: boolean) {
  return `shrink-0 border-b-2 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all md:text-xs ${
    active ? 'border-blue-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
  }`;
}

function handleTabListKeyDown<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  tabs: readonly T[],
  currentTab: T,
  activateTab: (tab: T) => void,
) {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0 || tabs.length === 0) return;

  let nextIndex: number;
  switch (event.key) {
    case 'ArrowLeft':
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      break;
    case 'ArrowRight':
      nextIndex = (currentIndex + 1) % tabs.length;
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = tabs.length - 1;
      break;
    default:
      return;
  }

  const nextTab = tabs[nextIndex];
  if (nextTab === undefined) return;

  event.preventDefault();
  activateTab(nextTab);
  event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(nextIndex)
    .focus();
}

export default function StandingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('table');
  const [activeGroup, setActiveGroup] = useState<CompetitionGroupKey>('A');
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [legacyStandings, setLegacyStandings] = useState<RankedLegacyStanding[]>([]);
  const [groupedStandings, setGroupedStandings] = useState<GroupedStandings>(EMPTY_GROUPS);
  const [topScorers, setTopScorers] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournamentRequestKey, setTournamentRequestKey] = useState(0);
  const backgroundRefreshQueued = useRef(false);
  const foregroundRequestPending = useRef(false);
  const statsRequestSequence = useRef(0);
  const socket = useSocket();

  const activeTournament = useMemo(
    () => tournaments.find((tournament) => tournament._id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );
  const isGroupedCompetition = activeTournament?.formatVersion === 2 &&
    activeTournament.format === 'two_group_knockout';

  useEffect(() => {
    let cancelled = false;

    const loadTournaments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ApiResponse<PublicTournament[]>, ApiResponse<PublicTournament[]>>('/tournaments');
        if (!response.success) throw new Error(response.message || 'Tournaments could not be loaded');
        if (cancelled) return;

        const preferredTournament = chooseDefaultTournament(response.data);
        setTournaments(response.data);
        setSelectedTournamentId(preferredTournament?._id ?? '');
        foregroundRequestPending.current = Boolean(preferredTournament);
        if (response.data.length === 0) setIsLoading(false);
      } catch (loadError: unknown) {
        if (cancelled) return;
        setTournaments([]);
        setSelectedTournamentId('');
        setError(getErrorMessage(loadError, 'Failed to load tournament standings'));
        setIsLoading(false);
      }
    };

    void loadTournaments();
    return () => {
      cancelled = true;
    };
  }, [tournamentRequestKey]);

  const fetchSelectedTournament = useCallback(async (silent = false) => {
    if (!activeTournament) return;
    if (silent && foregroundRequestPending.current) {
      backgroundRefreshQueued.current = true;
      return;
    }
    const requestSequence = ++statsRequestSequence.current;
    if (silent) setIsRefreshing(true);
    else {
      foregroundRequestPending.current = true;
      setIsRefreshing(false);
      setIsLoading(true);
    }
    if (!silent) setError(null);

    try {
      const standingsRequest = isGroupedCompetition
        ? apiClient.get<ApiResponse<GroupedStandings>, ApiResponse<GroupedStandings>>(
            `/tournaments/${activeTournament._id}/competition/standings`,
          )
        : apiClient.get<ApiResponse<RankedLegacyStanding[]>, ApiResponse<RankedLegacyStanding[]>>(
            `/standings/${activeTournament._id}`,
          );
      const [standingsResponse, scorersResponse] = await Promise.all([
        standingsRequest,
        apiClient.get<ApiResponse<PlayerStats[]>, ApiResponse<PlayerStats[]>>(
          `/standings/${activeTournament._id}/top-scorers`,
        ),
      ]);

      if (!standingsResponse.success || !scorersResponse.success) {
        throw new Error('The selected tournament statistics could not be loaded');
      }
      if (requestSequence !== statsRequestSequence.current) return;

      if (isGroupedCompetition) {
        setGroupedStandings(standingsResponse.data as GroupedStandings);
        setLegacyStandings([]);
      } else {
        setLegacyStandings(standingsResponse.data as RankedLegacyStanding[]);
        setGroupedStandings(EMPTY_GROUPS);
      }
      setTopScorers(scorersResponse.data);
      setError(null);
    } catch (loadError: unknown) {
      if (requestSequence === statsRequestSequence.current && !silent) {
        setError(getErrorMessage(loadError, 'Failed to load tournament standings'));
      }
    } finally {
      if (requestSequence === statsRequestSequence.current) {
        if (silent) {
          setIsRefreshing(false);
        } else {
          foregroundRequestPending.current = false;
          setIsLoading(false);
          if (backgroundRefreshQueued.current) {
            backgroundRefreshQueued.current = false;
            queueMicrotask(() => void fetchSelectedTournament(true));
          }
        }
      }
    }
  }, [activeTournament, isGroupedCompetition]);

  useEffect(() => {
    if (activeTournament) void fetchSelectedTournament();
  }, [activeTournament, fetchSelectedTournament]);

  useEffect(() => {
    if (!socket || !activeTournament) return;
    const refreshStandings = () => void fetchSelectedTournament(true);
    socket.on('match:list:updated', refreshStandings);
    return () => {
      socket.off('match:list:updated', refreshStandings);
    };
  }, [activeTournament, fetchSelectedTournament, socket]);

  const visibleStandings: Array<GroupStandingRow | RankedLegacyStanding> = isGroupedCompetition
    ? groupedStandings[activeGroup]
    : legacyStandings;

  useRevealOnScroll([
    visibleStandings,
    topScorers,
    isLoading,
    activeTab,
    activeGroup,
    selectedTournamentId,
  ]);

  if (isLoading && tournaments.length === 0 && !error) {
    return <FullPageSpinner />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b161c] font-sans text-white">
      <section className="relative border-b border-white/5 bg-[#00141e] px-5 py-12 md:px-6 md:py-20">
        <div className="container relative z-10 mx-auto max-w-7xl animate-reveal">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter md:text-5xl">
                {activeTournament?.name || 'Tournament'} <span className="text-neutral-500">Standings</span>
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-blue-500 motion-safe:animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 md:text-xs">
                  {activeTournament ? `Season ${activeTournament.season} • ${activeTournament.status}` : 'Official rankings'}
                </span>
                {isRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" aria-label="Refreshing standings" /> : null}
              </div>
            </div>

            {tournaments.length > 0 ? (
              <div className="w-full space-y-2 lg:w-72">
                <label htmlFor="standings-tournament" className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Competition</label>
                <Select
                  id="standings-tournament"
                  aria-busy={isLoading}
                  value={selectedTournamentId}
                  onChange={(event) => {
                    statsRequestSequence.current += 1;
                    foregroundRequestPending.current = true;
                    setSelectedTournamentId(event.target.value);
                    setActiveGroup('A');
                    setError(null);
                    setIsRefreshing(false);
                    setIsLoading(true);
                  }}
                >
                  {tournaments.map((tournament) => (
                    <option key={tournament._id} value={tournament._id}>
                      {tournament.name} — {tournament.season} ({tournament.status})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {activeTournament ? (
        <nav className="sticky top-[72px] z-40 border-b border-white/5 bg-[#00141e]/90 backdrop-blur-md" aria-label="Standings sections">
          <div className="container mx-auto flex max-w-7xl overflow-x-auto px-4" role="tablist">
          <button
            id="standings-table-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'table'}
            aria-controls="standings-table-panel"
            tabIndex={activeTab === 'table' ? 0 : -1}
            onClick={() => setActiveTab('table')}
            onKeyDown={(event) => handleTabListKeyDown(event, STANDINGS_TABS, 'table', setActiveTab)}
            className={tabClassName(activeTab === 'table')}
          >
            {isGroupedCompetition ? 'Group Tables' : 'League Table'}
          </button>
          <button
            id="standings-statistics-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === 'statistics'}
            aria-controls="standings-statistics-panel"
            tabIndex={activeTab === 'statistics' ? 0 : -1}
            onClick={() => setActiveTab('statistics')}
            onKeyDown={(event) => handleTabListKeyDown(event, STANDINGS_TABS, 'statistics', setActiveTab)}
            className={tabClassName(activeTab === 'statistics')}
          >
            Player Statistics
          </button>
          </div>
        </nav>
      ) : null}

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl">
          {isLoading ? (
            <PageSpinner />
          ) : error ? (
            <div className="mx-4 my-10 flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center" role="alert">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (activeTournament) void fetchSelectedTournament();
                  else setTournamentRequestKey((key) => key + 1);
                }}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="mx-4 my-10 rounded-2xl border border-white/5 p-16 text-center text-sm italic text-neutral-600">No tournament has been published yet.</div>
          ) : activeTab === 'table' ? (
            <section id="standings-table-panel" role="tabpanel" aria-labelledby="standings-table-tab" className="animate-reveal">
              {isGroupedCompetition ? (
                <div className="border-b border-white/5 bg-[#00141e]/60 px-4 py-4 sm:px-6">
                  <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-fit rounded-2xl border border-white/5 bg-black/20 p-1" role="tablist" aria-label="Tournament groups">
                      {COMPETITION_GROUPS.map((groupKey) => (
                        <button
                          key={groupKey}
                          id={`group-${groupKey}-tab`}
                          type="button"
                          role="tab"
                          aria-selected={activeGroup === groupKey}
                          aria-controls="active-group-standings-panel"
                          tabIndex={activeGroup === groupKey ? 0 : -1}
                          onClick={() => setActiveGroup(groupKey)}
                          onKeyDown={(event) => handleTabListKeyDown(event, COMPETITION_GROUPS, groupKey, setActiveGroup)}
                          className={`rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors sm:px-8 ${activeGroup === groupKey ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'}`}
                        >
                          Group {groupKey}
                        </button>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">Top four qualify for the quarter-finals</p>
                      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Group ranking order">
                        {GROUP_RANKING_ORDER.map((criterion, index) => (
                          <li key={criterion} className="rounded-full border border-white/5 bg-black/20 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-neutral-500">
                            {index + 1}. {criterion}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                id={isGroupedCompetition ? 'active-group-standings-panel' : undefined}
                role={isGroupedCompetition ? 'tabpanel' : undefined}
                aria-labelledby={isGroupedCompetition ? `group-${activeGroup}-tab` : undefined}
                className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}
                aria-busy={isLoading}
              >
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <caption className="sr-only">{isGroupedCompetition ? `Group ${activeGroup}` : 'League'} standings for {activeTournament?.name}</caption>
                  <thead className="bg-[#00141e]">
                    <tr className="border-b border-white/5">
                      {['#', 'Team', 'MP', 'W', 'D', 'L', 'Goals', 'GD', 'PTS'].map((heading, index) => (
                        <th key={heading} scope="col" className={`px-4 py-3 text-[10px] font-bold uppercase text-neutral-500 ${index > 1 ? 'text-center' : ''}`}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {visibleStandings.map((standing, index) => {
                      const rank = 'rank' in standing && standing.rank ? standing.rank : index + 1;
                      const qualifiesForQuarterFinals = isGroupedCompetition && rank <= 4;
                      return (
                        <tr key={standing.teamId._id} className={`${index % 2 === 0 ? 'bg-[#0b161c]' : 'bg-[#0e1b23]'} ${isGroupedCompetition && rank === 4 ? 'border-b-2 border-emerald-500/20' : ''} transition-colors hover:bg-white/[0.04]`}>
                          <td className="px-4 py-3.5">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black shadow-lg ${qualifiesForQuarterFinals ? 'bg-emerald-600 text-white' : 'bg-[#0073e6] text-white'}`}>{rank}</span>
                          </td>
                          <th scope="row" className="px-4 py-3.5">
                            <span className="flex min-w-0 items-center gap-3">
                              <TeamAvatar name={standing.teamId.name} logo={standing.teamId.logo} size="xs" />
                              <span className="max-w-72 truncate text-xs font-bold text-white md:text-sm">{standing.teamId.name}</span>
                              {qualifiesForQuarterFinals ? <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-emerald-400">QF</span> : null}
                            </span>
                          </th>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.played}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.won}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.drawn}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.lost}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.goalsFor}:{standing.goalsAgainst}</td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-neutral-300">{standing.goalDifference}</td>
                          <td className="px-4 py-3.5 text-center text-sm font-black text-white">{standing.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visibleStandings.length === 0 && !isLoading ? (
                  <div className="py-20 text-center text-sm italic text-neutral-600">No standings data is available for this {isGroupedCompetition ? 'group' : 'tournament'} yet.</div>
                ) : null}
              </div>
            </section>
          ) : (
            <section id="standings-statistics-panel" role="tabpanel" aria-labelledby="standings-statistics-tab" className="animate-reveal px-4 py-10">
              <div className="mx-auto max-w-4xl overflow-x-auto rounded-xl border border-white/5 bg-[#00141e] shadow-2xl">
                <table className="w-full min-w-[560px] text-left">
                  <caption className="sr-only">Top player statistics for {activeTournament?.name}</caption>
                  <thead>
                    <tr className="border-b border-white/5">
                      <th scope="col" className="px-6 py-4 text-[10px] font-bold text-neutral-500">#</th>
                      <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase text-neutral-500">Player / Team</th>
                      <th scope="col" className="px-6 py-4 text-center text-[10px] font-bold uppercase text-neutral-500">Goals</th>
                      <th scope="col" className="px-6 py-4 text-center text-[10px] font-bold uppercase text-neutral-500">Assists</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {topScorers.map((player, index) => (
                      <tr key={player.playerId._id} className={`${index % 2 === 0 ? 'bg-[#0b161c]' : 'bg-[#0e1b23]'} transition-colors hover:bg-white/[0.04]`}>
                        <td className="px-6 py-4"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0073e6] text-[10px] font-black">{index + 1}</span></td>
                        <th scope="row" className="px-6 py-4">
                          <span className="flex min-w-0 items-center gap-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-neutral-500"><User className="h-5 w-5" /></span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-white">{player.playerId.name}</span>
                              <span className="mt-1 flex items-center gap-1.5">
                                <TeamAvatar name={player.teamId.name} logo={player.teamId.logo} size="xs" />
                                <span className="truncate text-[9px] font-bold uppercase text-neutral-500">{player.teamId.name}</span>
                              </span>
                            </span>
                          </span>
                        </th>
                        <td className="px-6 py-4 text-center text-xl font-black italic text-blue-500">{player.goals}</td>
                        <td className="px-6 py-4 text-center text-xl font-black italic text-neutral-400">{player.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topScorers.length === 0 && !isLoading ? <div className="py-20 text-center text-sm italic text-neutral-600">No player statistics are available yet.</div> : null}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 bg-[#00141e]/50 py-10">
        <div className="container mx-auto flex max-w-7xl items-center gap-3 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <Medal className="h-4 w-4 text-blue-500" />
          <span>{activeTournament && !isGroupedCompetition ? 'League rankings update from official results.' : 'Rankings use points, goal difference, goals scored, head-to-head, then an explicit committee decision. Only completed group matches count.'}</span>
        </div>
      </footer>
    </div>
  );
}
