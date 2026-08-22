'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { AlertCircle, ChevronLeft, ChevronRight, MapPin, Clock, Trophy } from 'lucide-react';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { Select } from '@/components/ui/Select';
import { FullPageSpinner, PageSpinner } from '@/components/ui/Spinner';
import { formatMatchDay, formatTime, getDayKey } from '@/utils/format';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';
import { useSocket } from '@/hooks/use-socket';
import { Match, ApiResponse } from '@/types';
import {
  chooseTournament,
  tournamentLabel,
  type TournamentSummary,
} from '@/utils/tournament-selection';

export default function ResultsClient() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tournamentRequestKey, setTournamentRequestKey] = useState(0);
  const backgroundRefreshQueued = useRef(false);
  const foregroundRequestPending = useRef(false);
  const requestSequence = useRef(0);
  const socket = useSocket();

  const activeTournament = useMemo(
    () => tournaments.find((tournament) => tournament._id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );
  const isLegacyTournament = Boolean(activeTournament) && !(
    activeTournament?.formatVersion === 2 &&
    activeTournament.format === 'two_group_knockout'
  );

  useEffect(() => {
    let cancelled = false;

    const loadTournaments = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await apiClient.get<
          ApiResponse<TournamentSummary[]>,
          ApiResponse<TournamentSummary[]>
        >('/tournaments');
        if (!response.success) throw new Error(response.message || 'Tournaments could not be loaded');
        if (cancelled) return;

        const preferredTournament = chooseTournament(response.data, ['completed', 'upcoming']);
        setTournaments(response.data);
        setSelectedTournamentId(preferredTournament?._id ?? '');
        foregroundRequestPending.current = Boolean(preferredTournament);
        if (!preferredTournament) setIsLoading(false);
      } catch (error: unknown) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load tournaments');
        setIsLoading(false);
      }
    };

    void loadTournaments();
    return () => {
      cancelled = true;
    };
  }, [tournamentRequestKey]);

  const fetchMatches = useCallback(async (silent = false) => {
    if (!selectedTournamentId) return;
    if (silent && foregroundRequestPending.current) {
      backgroundRefreshQueued.current = true;
      return;
    }
    const requestId = ++requestSequence.current;
    if (!silent) {
      foregroundRequestPending.current = true;
      setIsLoading(true);
    }
    if (!silent) setLoadError(null);
    try {
      const params = new URLSearchParams({ tournamentId: selectedTournamentId, status: 'completed' });
      const response = await apiClient.get<ApiResponse<Match[]>, ApiResponse<Match[]>>(`/matches?${params.toString()}`);
      if (!response.success) throw new Error(response.message || 'Results could not be loaded');
      if (requestId === requestSequence.current) {
        const completed = [...response.data]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMatches(completed);
        setLoadError(null);
      }
    } catch (error: unknown) {
      console.warn('Results are temporarily unavailable:', error);
      if (requestId === requestSequence.current && !silent) {
        setMatches([]);
        setLoadError(error instanceof Error ? error.message : 'Failed to load results');
      }
    } finally {
      if (!silent && requestId === requestSequence.current) {
        foregroundRequestPending.current = false;
        setIsLoading(false);
        if (backgroundRefreshQueued.current) {
          backgroundRefreshQueued.current = false;
          queueMicrotask(() => void fetchMatches(true));
        }
      }
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!socket) return;
    const refreshMatches = () => void fetchMatches(true);
    socket.on('match:list:updated', refreshMatches);
    return () => {
      socket.off('match:list:updated', refreshMatches);
    };
  }, [fetchMatches, socket]);

  const matchesByDay = useMemo(() => {
    const map: Record<string, Match[]> = {};
    matches.forEach(m => {
      const key = getDayKey(m.date);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [matches]);

  // RESULTS: Newest days first (Descending)
  const sortedDays = useMemo(() => Object.keys(matchesByDay).sort((a, b) => b.localeCompare(a)), [matchesByDay]);

  // Keep the newest valid matchday selected as tournaments change.
  useEffect(() => {
    if (sortedDays.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }

    if (!selectedDate || !sortedDays.includes(selectedDate)) {
      setSelectedDate(sortedDays[0]);
    }
  }, [sortedDays, selectedDate]);

  const currentIndex = selectedDate ? sortedDays.indexOf(selectedDate) : -1;
  const currentDayMatches = selectedDate ? matchesByDay[selectedDate] ?? [] : [];
  const totalDays = sortedDays.length;

  useRevealOnScroll([matches, selectedDate, isLoading, selectedTournamentId]);

  if (isLoading && tournaments.length === 0 && !loadError) return <FullPageSpinner />;

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      <section className="relative py-20 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Match Archives</h1>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-8xl lg:text-9xl mb-8 leading-tight">Full <span className="text-neutral-800">Time.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium italic tracking-widest uppercase">
             The Ledger of War{activeTournament ? ` • Season ${activeTournament.season}` : ''}
           </p>

           {tournaments.length > 0 ? (
             <div className="mx-auto mt-8 max-w-sm text-left">
               <label htmlFor="results-tournament" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-500">
                 Competition
               </label>
               <Select
                 id="results-tournament"
                 surface="neutral"
                 aria-busy={isLoading}
                 value={selectedTournamentId}
                 onChange={(event) => {
                   requestSequence.current += 1;
                   foregroundRequestPending.current = true;
                   setSelectedTournamentId(event.target.value);
                   setMatches([]);
                   setSelectedDate(null);
                   setLoadError(null);
                   setIsLoading(true);
                 }}
               >
                 {tournaments.map((tournament) => (
                   <option key={tournament._id} value={tournament._id}>
                     {tournamentLabel(tournament)}
                   </option>
                 ))}
               </Select>
             </div>
           ) : null}
        </div>
      </section>

      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {isLoading ? (
            <PageSpinner />
          ) : loadError ? (
            <div className="py-24 text-center rounded-[40px] border border-red-500/20 bg-red-500/5 reveal-on-scroll" role="alert">
              <AlertCircle className="mx-auto mb-5 h-8 w-8 text-red-400" />
              <p className="text-xs font-black text-red-200 uppercase tracking-[0.25em]">{loadError}</p>
              <button
                type="button"
                onClick={() => selectedTournamentId
                  ? void fetchMatches()
                  : setTournamentRequestKey((key) => key + 1)}
                className="mt-5 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : totalDays === 0 ? (
            <div className="py-32 text-center rounded-[40px] border border-white/5 bg-white/[0.01] reveal-on-scroll">
               <span className="text-4xl block mb-6 opacity-30">⚽</span>
               <p className="text-[10px] md:text-xs font-black text-neutral-600 uppercase tracking-[0.4em] italic leading-loose">
                 {tournaments.length === 0 ? 'No tournament has been published yet.' : 'No matches have been completed yet.'}
                 {tournaments.length > 0 ? <><br/>The story is still being written.</> : null}
               </p>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-12">
              <div className="reveal-on-scroll flex items-center justify-between gap-4 rounded-[30px] bg-white/[0.02] border border-white/5 p-4 md:p-8 backdrop-blur-xl">
                <button
                  type="button"
                  disabled={currentIndex >= totalDays - 1} // Index 0 is newest, so max index is oldest
                  onClick={() => setSelectedDate(sortedDays[currentIndex + 1])}
                  aria-label="Show older results"
                  className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>

                <div className="text-center min-w-0 px-2 md:px-4">
                  <h3 className="text-sm md:text-3xl font-black italic text-white uppercase tracking-tighter truncate leading-none">
                    {selectedDate ? formatMatchDay(selectedDate + 'T00:00:00') : '—'}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2 md:mt-3">
                    Results • Record {currentIndex + 1} of {totalDays} • {currentDayMatches.length} Matches
                  </p>
                </div>

                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() => setSelectedDate(sortedDays[currentIndex - 1])}
                  aria-label="Show newer results"
                  className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-8">
                {currentDayMatches.map((match, idx) => {
                  const homeGoals = match.events?.filter(e => e.type === 'goal' && e.teamId === match.homeTeam._id) ?? [];
                  const awayGoals = match.events?.filter(e => e.type === 'goal' && e.teamId === match.awayTeam._id) ?? [];
                  const recordedWinnerId = typeof match.winner === 'string'
                    ? match.winner
                    : match.winner?._id;
                  const homeWon = recordedWinnerId
                    ? recordedWinnerId === match.homeTeam._id
                    : match.homeScore > match.awayScore;
                  const awayWon = recordedWinnerId
                    ? recordedWinnerId === match.awayTeam._id
                    : match.awayScore > match.homeScore;

                  return (
                    <div
                      key={match._id}
                      className={`group relative rounded-[24px] md:rounded-[48px] border border-white/5 bg-white/[0.02] p-5 md:p-12 transition-all hover:bg-white/[0.04] reveal-on-scroll stagger-${(idx % 5) + 1}`}
                    >
                      <div className="flex justify-center mb-5 md:mb-10">
                        <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {match.stage?.replace('_', ' ')} • Full Time
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:gap-6 md:gap-12">
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-2 md:gap-6 text-right min-w-0">
                          <div className="flex flex-col items-center md:items-end gap-1 order-2 md:order-1 min-w-0">
                            <span className="text-[9px] sm:text-xs md:text-3xl font-black uppercase tracking-tighter italic leading-tight text-center md:text-right line-clamp-2">
                              {match.homeTeam?.name}
                            </span>
                            {homeGoals.length > 0 && (
                              <div className="flex flex-wrap justify-center md:justify-end gap-1 mt-0.5">
                                {homeGoals.map((e, ei) => (
                                  <span key={ei} className="text-[7px] md:text-9px font-bold text-neutral-500 uppercase tracking-tight truncate max-w-[60px] sm:max-w-none">
                                    {e.playerId?.name} {e.minute}′
                                    {ei < homeGoals.length - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <TeamAvatar name={match.homeTeam.name} logo={match.homeTeam.logo} size="lg" className="order-1 md:order-2" />
                        </div>

                        <div className="flex flex-col items-center gap-2 md:gap-4 shrink-0 px-1 sm:px-4">
                          <div className="flex items-center gap-1 md:gap-3">
                            <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${homeWon ? 'bg-yellow-400 text-black shadow-yellow-400/30' : 'bg-neutral-800 text-neutral-400'}`}>
                              {match.homeScore}
                            </div>
                            <div className="h-1.5 w-1.5 md:h-2.5 md:w-2.5 rounded-full bg-blue-500/40"></div>
                            <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${awayWon ? 'bg-yellow-400 text-black shadow-yellow-400/30' : 'bg-neutral-800 text-neutral-400'}`}>
                              {match.awayScore}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[7px] md:text-xs font-bold text-neutral-600 tracking-widest uppercase">
                            <Clock className="h-2 w-2 md:h-3.5 md:w-3.5" />
                            {formatTime(match.date)}
                          </div>
                          {match.shootoutScore ? (
                            <div className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-yellow-300 md:text-[9px]">
                              Pens {match.shootoutScore.home}–{match.shootoutScore.away}
                            </div>
                          ) : match.isExtraTime ? (
                            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-blue-300 md:text-[9px]">
                              After extra time
                            </div>
                          ) : null}
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row-reverse items-center justify-end gap-2 md:gap-6 text-left min-w-0">
                          <TeamAvatar name={match.awayTeam.name} logo={match.awayTeam.logo} size="lg" />
                          <div className="flex flex-col items-center md:items-start gap-1 min-w-0">
                            <span className="text-[9px] sm:text-xs md:text-3xl font-black uppercase tracking-tighter italic leading-tight text-center md:text-left line-clamp-2">
                              {match.awayTeam?.name}
                            </span>
                            {awayGoals.length > 0 && (
                              <div className="flex flex-wrap justify-center md:justify-start gap-1 mt-0.5">
                                {awayGoals.map((e, ei) => (
                                  <span key={ei} className="text-[7px] md:text-9px font-bold text-neutral-500 uppercase tracking-tight truncate max-w-[60px] sm:max-w-none">
                                    {e.playerId?.name} {e.minute}′
                                    {ei < awayGoals.length - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 md:mt-16 pt-4 md:pt-10 border-t border-white/5 flex flex-row justify-center gap-4 md:gap-12 items-center">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <MapPin className="h-2.5 w-2.5 md:h-4 md:w-4 text-blue-500" />
                          <span className="text-[7px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-500">{match.venue || 'Solid FM Arena'}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-white/10"></div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Trophy className="h-2.5 w-2.5 md:h-4 md:w-4 text-yellow-400" />
                          <span className="text-[7px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-600">{match.stage?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 md:py-40 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl opacity-30"></div>
        <div className="container mx-auto max-w-5xl text-center reveal-on-scroll px-6 relative z-10">
          <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter mb-8 leading-tight">See the <span className="text-yellow-400">Standings</span></h2>
          <p className="max-w-md mx-auto text-neutral-500 text-xs md:text-sm font-medium mb-12 uppercase tracking-widest leading-relaxed italic">
            {isLegacyTournament
              ? 'See how these results have shaped the league table and who is racing for the crown.'
              : 'See how these results shape the two group tables and the road to the quarter-finals.'}
          </p>
          <Link href="/standings" className="inline-flex h-16 md:h-24 items-center justify-center rounded-2xl md:rounded-[40px] bg-blue-600 px-10 md:px-16 text-sm md:text-2xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/40">
            Live Rankings
          </Link>
        </div>
      </section>
    </div>
  );
}
