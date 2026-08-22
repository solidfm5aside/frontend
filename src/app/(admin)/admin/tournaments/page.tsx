'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';
import { Plus, CheckCircle2, RefreshCw, CalendarDays, AlertCircle, Flame, Clock, Archive, LockKeyhole, Trophy } from 'lucide-react';
import { PageSpinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { V2CompetitionPanel } from '@/components/admin/V2CompetitionPanel';
import { WomensCompetitionPanel } from '@/components/admin/WomensCompetitionPanel';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  fixturesGenerated: boolean;
  currentStage: string;
  formatVersion?: 1 | 2 | 3;
  format?: 'legacy_league' | 'two_group_knockout' | 'single_table_final';
  division?: 'men' | 'women';
}

interface TournamentCardProps {
  tournament: Tournament;
  stageProgress?: { total: number; completed: number } | null;
  canManageTournament: boolean;
  onStatusUpdate: (id: string, status: string) => void;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MatchStatusSummary {
  status: string;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const STAGES = [
  { key: 'league', label: 'League' },
  { key: 'playoff', label: 'Playoff' },
  { key: 'round_of_16', label: 'R16' },
  { key: 'quarter_finals', label: 'QF' },
  { key: 'semi_finals', label: 'SF' },
  { key: 'final', label: 'Final' },
];

const NEW_TOURNAMENT_RULES = {
  men: [
    '14 men’s teams • two groups of seven',
    'Single-leg group stage • 42 matches',
    'Top four per group • physical knockout record',
    'Maximum 10 players • no third place',
  ],
  women: [
    'Exactly three women’s teams • one table',
    'Single round robin • three matches total',
    'Each team plays twice • top two reach final',
    'Physical fixture record • no third place',
  ],
} as const;

interface NewTournamentDraft {
  name: string;
  season: string;
  startDate: string;
  endDate: string;
  division: 'men' | 'women';
}

const EMPTY_TOURNAMENT_DRAFT: NewTournamentDraft = {
  name: '',
  season: '',
  startDate: '',
  endDate: '',
  division: 'men',
};

function SectionHeader({ icon, label, count, color }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <h2 className="text-sm font-black uppercase tracking-widest text-white">{label}</h2>
      <span className="ml-1 rounded-full bg-white/5 px-3 py-0.5 text-[10px] font-black text-neutral-500">{count}</span>
    </div>
  );
}

function TournamentCard({
  tournament,
  stageProgress,
  canManageTournament,
  onStatusUpdate,
}: TournamentCardProps) {
  const currentStageIdx = STAGES.findIndex(s => s.key === tournament.currentStage);
  const allCurrentStageDone = stageProgress ? stageProgress.completed === stageProgress.total && stageProgress.total > 0 : false;

  return (
    <div className="group rounded-[30px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl transition-all hover:bg-white/[0.04] hover:border-blue-500/20 relative overflow-hidden">
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div>
          <span className={`inline-flex px-3 py-1 mb-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            tournament.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
            tournament.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
            'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
          }`}>
            {tournament.status === 'ongoing' ? '🔴 Live' : tournament.status === 'upcoming' ? '⏳ Pending' : '🏆 Archived'}
          </span>
          <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">{tournament.name}</h3>
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">
            Season {tournament.season} • {new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-2xl">
          {tournament.status === 'completed' ? '🏆' : tournament.status === 'ongoing' ? '🔥' : '⏳'}
        </div>
      </div>

      {/* Stage Progress Timeline (visible for ongoing tournaments) */}
      {tournament.status === 'ongoing' && tournament.fixturesGenerated && (
        <div className="relative z-10 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Stage Progress</p>
            {stageProgress && (
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                allCurrentStageDone ? 'text-emerald-500' : 'text-yellow-500'
              }`}>
                {stageProgress.completed}/{stageProgress.total} completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {STAGES.map((s, idx) => {
              const isDone = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div key={s.key} className="flex items-center gap-1 flex-1">
                  <div className={`flex-1 flex flex-col items-center gap-1`}>
                    <div className={`h-2 w-full rounded-full transition-all ${
                      isDone ? 'bg-emerald-500' :
                      isCurrent ? 'bg-blue-500' :
                      'bg-white/10'
                    }`} />
                    <span className={`text-[7px] font-black uppercase ${
                      isDone ? 'text-emerald-500' :
                      isCurrent ? 'text-blue-400' :
                      'text-neutral-700'
                    }`}>{s.label}</span>
                  </div>
                  {idx < STAGES.length - 1 && <div className={`w-1.5 h-1.5 rounded-full shrink-0 mb-3 ${
                    idx < currentStageIdx ? 'bg-emerald-500' : 'bg-white/10'
                  }`} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col border-t border-white/5 pt-6 gap-4">
        {tournament.status === 'upcoming' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[10px] font-bold text-blue-200">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Fixture pairings and schedules must come from the official physical process. This legacy season will not create them automatically.</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href={`/admin/matches?tournament=${tournament._id}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-600 hover:text-white">
                <CalendarDays className="h-4 w-4" /> Match Centre
              </Link>
              {canManageTournament ? (
                <button
                  type="button"
                  onClick={() => onStatusUpdate(tournament._id, 'ongoing')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" /> Start Season
                </button>
              ) : (
                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600" title="Administrator access is required to update the season">
                  <LockKeyhole className="h-3.5 w-3.5" /> Administrator Only
                </div>
              )}
            </div>
          </div>
        )}

        {tournament.status === 'ongoing' && tournament.fixturesGenerated && (
          <div className="flex flex-col gap-2">
            {!allCurrentStageDone && stageProgress && (
              <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 p-3 text-[10px] font-bold text-yellow-400 border border-yellow-500/20">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {stageProgress.total - stageProgress.completed} match(es) in{' '}
                  <span className="uppercase">{tournament.currentStage.replace(/_/g, ' ')}</span>{' '}
                  still pending before advancing.
                </span>
              </div>
            )}
            {allCurrentStageDone && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>All <span className="uppercase">{tournament.currentStage.replace(/_/g, ' ')}</span> matches are complete. Automatic legacy progression is disabled; use Match Centre to review the completed results.</span>
              </div>
            )}
            <Link href={`/admin/matches?tournament=${tournament._id}`} className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-600 hover:text-white">
              <CalendarDays className="h-3.5 w-3.5" /> Open Match Centre
            </Link>
          </div>
        )}

        {tournament.status === 'ongoing' && (
          <button
            onClick={() => { if (confirm('Mark this season as completed?')) onStatusUpdate(tournament._id, 'completed'); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-all hover:bg-red-600/10 hover:text-red-400 border border-white/5"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Completed
          </button>
        )}
        {tournament.status === 'completed' && (
          <div className="w-full text-center py-3 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">
            Archived Edition
          </div>
        )}
      </div>

      {tournament.status === 'ongoing' && (
        <div className="absolute inset-0 bg-emerald-500/5 opacity-50 z-0"></div>
      )}
    </div>
  );
}

export default function TournamentsManagementPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stageProgress, setStageProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentLoadError, setTournamentLoadError] = useState<string | null>(null);
  const [isTournamentCatalogueCurrent, setIsTournamentCatalogueCurrent] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmittingTournament, setIsSubmittingTournament] = useState(false);
  const [newTournament, setNewTournament] = useState<NewTournamentDraft>(EMPTY_TOURNAMENT_DRAFT);
  const [selectedWomensTournamentId, setSelectedWomensTournamentId] = useState('');
  const tournamentRequestSequence = useRef(0);

  const { admin } = useAuthStore();
  const canManageTournaments = admin?.role === 'admin' || admin?.role === 'super_admin';

  const fetchTournaments = useCallback(async (silent = false) => {
    const requestSequence = ++tournamentRequestSequence.current;
    if (!silent) setIsLoading(true);
    setTournamentLoadError(null);
    setIsTournamentCatalogueCurrent(false);
    try {
      const response = await apiClient.get<ApiResponse<Tournament[]>, ApiResponse<Tournament[]>>('/tournaments');
      if (!response.success) throw new Error(response.message || 'Tournament catalogue could not be loaded');

      const legacyOngoing = response.data.filter(
        (tournament) => tournament.status === 'ongoing' &&
          (tournament.formatVersion === undefined || tournament.formatVersion === 1 || tournament.format === 'legacy_league'),
      );
      const progressResults = await Promise.all(
        legacyOngoing.map(async (tournament): Promise<[
          string,
          { total: number; completed: number },
        ] | null> => {
          try {
            const matchesResponse = await apiClient.get<
              ApiResponse<MatchStatusSummary[]>,
              ApiResponse<MatchStatusSummary[]>
            >(`/matches?tournamentId=${tournament._id}&stage=${tournament.currentStage}`);
            if (!matchesResponse.success) return null;
            return [
              tournament._id,
              {
                total: matchesResponse.data.length,
                completed: matchesResponse.data.filter((match) => match.status === 'completed').length,
              },
            ];
          } catch {
            return null;
          }
        }),
      );

      if (requestSequence !== tournamentRequestSequence.current) return;
      setTournaments(response.data);

      const pData: Record<string, { total: number; completed: number }> = {};
      for (const result of progressResults) {
        if (result) pData[result[0]] = result[1];
      }
      setStageProgress(pData);
      setIsTournamentCatalogueCurrent(true);
    } catch (error: unknown) {
      if (requestSequence !== tournamentRequestSequence.current) return;
      const message = getErrorMessage(error, 'Failed to fetch tournaments');
      setTournamentLoadError(message);
      toast.error(message);
    } finally {
      if (!silent && requestSequence === tournamentRequestSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTournaments();
    return () => {
      tournamentRequestSequence.current += 1;
    };
  }, [fetchTournaments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTournamentCatalogueCurrent) {
      toast.error('Reload the tournament catalogue before creating a season');
      return;
    }
    if (isSubmittingTournament) return;
    setIsSubmittingTournament(true);
    try {
      const response = await apiClient.post<ApiResponse<Tournament>, ApiResponse<Tournament>>('/tournaments', {
        name: newTournament.name.trim(),
        season: newTournament.season.trim(),
        startDate: newTournament.startDate,
        ...(newTournament.endDate ? { endDate: newTournament.endDate } : {}),
        formatVersion: newTournament.division === 'women' ? 3 : 2,
        format: newTournament.division === 'women' ? 'single_table_final' : 'two_group_knockout',
        division: newTournament.division,
      });
      if (response.success) {
        toast.success(newTournament.division === 'women'
          ? 'Three-team women’s competition created successfully'
          : '14-team men’s competition created successfully');
        setIsCreating(false);
        setNewTournament(EMPTY_TOURNAMENT_DRAFT);
        await fetchTournaments();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create season'));
    } finally {
      setIsSubmittingTournament(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${id}`, { status });
      if (response.success) {
        toast.success(`Season status updated to ${status}`);
        fetchTournaments(true);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const groupCompetitions = tournaments.filter(t => t.formatVersion === 2 && t.format === 'two_group_knockout');
  const womensCompetitions = tournaments.filter(t => t.formatVersion === 3 && t.format === 'single_table_final');
  const selectedWomensCompetition = womensCompetitions.find((tournament) => tournament._id === selectedWomensTournamentId)
    ?? womensCompetitions.find((tournament) => tournament.status === 'ongoing')
    ?? womensCompetitions.find((tournament) => tournament.status === 'upcoming')
    ?? womensCompetitions[0];
  const legacyTournaments = tournaments.filter(t => !(
    (t.formatVersion === 2 && t.format === 'two_group_knockout') ||
    (t.formatVersion === 3 && t.format === 'single_table_final')
  ));
  const ongoing = legacyTournaments.filter(t => t.status === 'ongoing');
  const upcoming = legacyTournaments.filter(t => t.status === 'upcoming');
  const completed = legacyTournaments.filter(t => t.status === 'completed');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-14 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Seasons.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Tournament Configuration</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          disabled={!isTournamentCatalogueCurrent}
          title={isTournamentCatalogueCurrent ? undefined : 'Reload the tournament catalogue first'}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Plus className="h-4 w-4" /> Initialize Season
        </button>
      </div>

      {tournamentLoadError ? (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="text-xs font-bold text-red-100">The tournament catalogue is unavailable.</p>
              <p className="mt-1 text-[10px] text-red-200/70">{tournamentLoadError} Creation is paused to prevent a duplicate season.</p>
            </div>
          </div>
          <button type="button" onClick={() => void fetchTournaments()} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-100 transition-colors hover:bg-red-500/20">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : null}

      {isCreating && isTournamentCatalogueCurrent && (
        <div className="rounded-[40px] border border-blue-500/20 bg-blue-500/5 p-8 backdrop-blur-3xl animate-reveal">
          <h2 className="text-xl font-black italic tracking-tighter text-white uppercase mb-2">
            New {newTournament.division === 'women' ? 'Women’s Three-Team' : 'Men’s 14-Team'} Season
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {newTournament.division === 'women'
              ? 'Creates a separate women’s workspace: three registered women’s teams, three physical league fixtures, then a top-two final.'
              : 'Creates the approved men’s workspace. You will enter 14 men’s teams and place seven manually into each group.'}
          </p>
          <div className="my-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Confirmed competition format">
            {NEW_TOURNAMENT_RULES[newTournament.division].map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                {rule}
              </div>
            ))}
          </div>
          <form onSubmit={handleCreate} aria-busy={isSubmittingTournament} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
            <div className="space-y-2">
              <label htmlFor="new-tournament-division" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Competition Format</label>
              <Select
                id="new-tournament-division"
                controlSize="large"
                surface="neutral"
                disabled={isSubmittingTournament}
                value={newTournament.division}
                onChange={(event) => setNewTournament({
                  ...newTournament,
                  division: event.target.value as NewTournamentDraft['division'],
                })}
              >
                <option value="men">Men — 14 teams / two groups</option>
                <option value="women">Women — 3 teams / top-two final</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-name" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tournament Name</label>
              <input id="new-tournament-name" type="text" required minLength={3} maxLength={120} disabled={isSubmittingTournament} value={newTournament.name} onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} placeholder="e.g. SolidFM 5-Aside" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-base font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(pointer:fine)]:text-sm" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-season" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Season</label>
              <input id="new-tournament-season" type="text" required maxLength={40} disabled={isSubmittingTournament} value={newTournament.season} onChange={(e) => setNewTournament({ ...newTournament, season: e.target.value })} placeholder="e.g. 2026" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-base font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(pointer:fine)]:text-sm" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-start-date" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
              <input id="new-tournament-start-date" type="date" required disabled={isSubmittingTournament} value={newTournament.startDate} onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-base font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-sm" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-end-date" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">End Date <span className="normal-case tracking-normal">(optional)</span></label>
              <input id="new-tournament-end-date" type="date" min={newTournament.startDate || undefined} disabled={isSubmittingTournament} value={newTournament.endDate} onChange={(e) => setNewTournament({ ...newTournament, endDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-base font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="button" disabled={isSubmittingTournament} onClick={() => setIsCreating(false)} className="h-[54px] flex-1 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSubmittingTournament} className="h-[54px] flex-1 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isSubmittingTournament ? 'Creating…' : 'Confirm'}</button>
            </div>
          </form>
        </div>
      )}

      {groupCompetitions.length > 0 && (
        <section className="space-y-6" aria-labelledby="group-competitions-title">
          <SectionHeader icon={<Trophy className="h-4 w-4 text-blue-400" />} label="14-Team Competitions" count={groupCompetitions.length} color="bg-blue-500/10" />
          <h2 id="group-competitions-title" className="sr-only">14-team two-group competitions</h2>
          {groupCompetitions.map((tournament) => (
            <V2CompetitionPanel key={tournament._id} tournamentId={tournament._id} canManageCompetition={canManageTournaments} />
          ))}
        </section>
      )}

      {womensCompetitions.length > 0 && (
        <section className="space-y-6" aria-labelledby="womens-competitions-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionHeader icon={<Trophy className="h-4 w-4 text-blue-400" />} label="Women’s Competitions" count={womensCompetitions.length} color="bg-blue-500/10" />
              <h2 id="womens-competitions-title" className="sr-only">Three-team women’s single-table competitions</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">One workspace is loaded at a time so current and archived seasons stay fast.</p>
            </div>
            {womensCompetitions.length > 1 ? (
              <div className="w-full space-y-2 sm:w-80">
                <label htmlFor="women-workspace-season" className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Women’s season workspace</label>
                <Select id="women-workspace-season" surface="neutral" value={selectedWomensCompetition?._id ?? ''} onChange={(event) => setSelectedWomensTournamentId(event.target.value)}>
                  {womensCompetitions.map((tournament) => <option key={tournament._id} value={tournament._id}>{tournament.name} — {tournament.season} ({tournament.status})</option>)}
                </Select>
              </div>
            ) : null}
          </div>
          {selectedWomensCompetition ? <WomensCompetitionPanel key={selectedWomensCompetition._id} tournamentId={selectedWomensCompetition._id} canManageCompetition={canManageTournaments} /> : null}
        </section>
      )}

      {/* ONGOING */}
      {ongoing.length > 0 && (
        <section>
          <SectionHeader icon={<Flame className="h-4 w-4 text-emerald-500" />} label="Active Season" count={ongoing.length} color="bg-emerald-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ongoing.map(t => (
              <TournamentCard key={t._id} tournament={t} stageProgress={stageProgress[t._id]} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeader icon={<Clock className="h-4 w-4 text-yellow-500" />} label="Upcoming / Pending" count={upcoming.length} color="bg-yellow-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcoming.map(t => (
              <TournamentCard key={t._id} tournament={t} stageProgress={stageProgress[t._id]} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} />
            ))}
          </div>
        </section>
      )}

      {/* COMPLETED */}
      {completed.length > 0 && (
        <section>
          <SectionHeader icon={<Archive className="h-4 w-4 text-blue-400" />} label="Past Editions" count={completed.length} color="bg-blue-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completed.map(t => (
              <TournamentCard key={t._id} tournament={t} stageProgress={stageProgress[t._id]} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} />
            ))}
          </div>
        </section>
      )}

      {tournaments.length === 0 && !tournamentLoadError && (
        <div className="p-12 text-center rounded-[40px] border border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] italic">No tournaments found. Initialize the first season!</p>
        </div>
      )}
    </div>
  );
}
