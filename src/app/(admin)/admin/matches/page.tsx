'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import MatchControllerModal from '@/components/admin/MatchControllerModal';
import EditMatchModal from '@/components/admin/EditMatchModal';
import { PageSpinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMatchDay, formatTime, getDayKey } from '@/utils/format';
import type { ApiResponse } from '@/types';
import {
  chooseTournament,
  tournamentLabel,
  type TournamentSummary,
} from '@/utils/tournament-selection';

interface Team {
  _id: string;
  name: string;
}

interface Match {
  _id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  stage: string;
  date: string;
  venue?: string;
}

const KNOCKOUT_STAGES = new Set([
  'playoff',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'final',
  'third_place',
]);

type StatusFilter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled';

export default function MatchesManagementPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tournamentRequestKey, setTournamentRequestKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const backgroundRefreshQueued = useRef(false);
  const foregroundRequestPending = useRef(false);
  const requestSequence = useRef(0);

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
      const params = new URLSearchParams({ tournamentId: selectedTournamentId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await apiClient.get<ApiResponse<Match[]>, ApiResponse<Match[]>>(`/matches?${params.toString()}`);
      if (!response.success) throw new Error(response.message || 'Matches could not be loaded');
      if (requestId === requestSequence.current) {
        setMatches(response.data);
        setLoadError(null);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch matches:', error);
      if (requestId === requestSequence.current && !silent) {
        setMatches([]);
        setLoadError(error instanceof Error ? error.message : 'Failed to load matches');
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
  }, [selectedTournamentId, statusFilter]);

  useEffect(() => { void fetchMatches(); }, [fetchMatches]);

  // Group matches by their calendar day
  const matchesByDay = useMemo(() => {
    const map: Record<string, Match[]> = {};
    [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(m => {
      const key = getDayKey(m.date);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [matches]);

  const sortedDays = useMemo(() => Object.keys(matchesByDay).sort(), [matchesByDay]);

  // Keep the selected matchday valid as filters and tournaments change.
  useEffect(() => {
    if (sortedDays.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }

    if (!selectedDate || !sortedDays.includes(selectedDate)) {
      const today = new Date().toISOString().split('T')[0];
      const targetDate = sortedDays.find(d => d >= today) || sortedDays[sortedDays.length - 1];
      setSelectedDate(targetDate);
    }
  }, [sortedDays, selectedDate]);

  const currentIndex = selectedDate ? sortedDays.indexOf(selectedDate) : -1;
  const currentDayMatches = selectedDate ? matchesByDay[selectedDate] ?? [] : [];
  const totalDays = sortedDays.length;

  const handleStatusUpdate = async (id: string, status: Match['status']) => {
    if (status === 'cancelled' && !window.confirm('Cancel this match? It can be restored to the schedule later.')) return;
    const previousStatus = matches.find((match) => match._id === id)?.status;
    setMatches(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    try {
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(`/matches/${id}/status`, { status });
      if (response.success) {
        toast.success(`Match updated to ${status}`);
      } else {
        if (previousStatus) setMatches(prev => prev.map(m => m._id === id ? { ...m, status: previousStatus } : m));
        void fetchMatches(true);
        toast.error('Failed to update match status');
      }
    } catch {
      if (previousStatus) setMatches(prev => prev.map(m => m._id === id ? { ...m, status: previousStatus } : m));
      void fetchMatches(true);
      toast.error('Failed to update match status');
    }
  };

  if (isLoading && tournaments.length === 0 && !loadError) return <PageSpinner />;

  return (
    <div className="space-y-8 animate-reveal">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
            Matches.
          </h1>
          <p className="mt-1.5 text-[9px] sm:text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">
            Command Central Control
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {tournaments.length > 0 ? (
            <div className="w-full sm:w-72">
              <label htmlFor="admin-matches-tournament" className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Competition
              </label>
              <Select
                id="admin-matches-tournament"
                controlSize="compact"
                surface="neutral"
                aria-busy={isLoading}
                value={selectedTournamentId}
                onChange={(event) => {
                  requestSequence.current += 1;
                  foregroundRequestPending.current = true;
                  setSelectedTournamentId(event.target.value);
                  setMatches([]);
                  setSelectedDate(null);
                  setSelectedMatchId(null);
                  setEditMatchId(null);
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

          <div className="flex max-w-full gap-1 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-x-auto scrollbar-hide" aria-label="Filter matches by status">
            {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={statusFilter === f}
                onClick={() => {
                  if (f === statusFilter) return;
                  requestSequence.current += 1;
                  foregroundRequestPending.current = true;
                  setStatusFilter(f);
                  setMatches([]);
                  setSelectedDate(null);
                  setLoadError(null);
                  setIsLoading(true);
                }}
                className={`px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                  statusFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : loadError ? (
        <div className="py-24 text-center rounded-[32px] border border-red-500/20 bg-red-500/5" role="alert">
          <p className="text-[10px] font-black text-red-300 uppercase tracking-[0.25em]">{loadError}</p>
          <button
            type="button"
            onClick={() => selectedTournamentId
              ? void fetchMatches()
              : setTournamentRequestKey((key) => key + 1)}
            className="mt-4 text-[9px] font-black uppercase tracking-widest text-white underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : totalDays === 0 ? (
        <div className="py-32 text-center rounded-[32px] border border-white/5 bg-white/[0.01]">
          <span className="text-3xl block mb-4 opacity-30">🔍</span>
          <p className="text-[9px] sm:text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] italic">
            {tournaments.length === 0 ? 'No tournament has been published yet' : 'No matches found in this category'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.02] border border-white/5 px-4 sm:px-6 py-4">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setSelectedDate(sortedDays[currentIndex - 1])}
              aria-label="Show previous matchday"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center min-w-0">
              <p className="text-xs sm:text-sm font-black italic text-white uppercase tracking-tight truncate">
                {selectedDate ? formatMatchDay(selectedDate + 'T00:00:00') : '—'}
              </p>
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">
                Matchday {currentIndex + 1} of {totalDays} · {currentDayMatches.length} fixture{currentDayMatches.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              type="button"
              disabled={currentIndex >= totalDays - 1}
              onClick={() => setSelectedDate(sortedDays[currentIndex + 1])}
              aria-label="Show next matchday"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {totalDays > 1 && (
            <div className="flex justify-center gap-1.5 flex-wrap">
              {sortedDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  aria-label={`Show matches for ${formatMatchDay(d + 'T00:00:00')}`}
                  aria-current={d === selectedDate ? 'date' : undefined}
                  className={`h-2 rounded-full transition-all ${
                    d === selectedDate ? 'w-6 bg-blue-500' : 'w-2 bg-white/10 hover:bg-white/25'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {currentDayMatches.map((match) => (
              <div
                key={match._id}
                className="group rounded-2xl sm:rounded-[28px] border border-white/5 bg-white/[0.01] p-4 sm:p-5 backdrop-blur-3xl transition-all hover:bg-white/[0.03] hover:border-blue-500/20"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <StatusBadge status={match.status} />
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(match.date)}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  <div className="text-right">
                    <p className="text-[11px] sm:text-sm md:text-base font-black italic text-white uppercase leading-tight break-words">
                      {match.homeTeam?.name ?? 'TBD'}
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">Home</p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-xl font-black italic text-blue-500">
                      {match.homeScore}
                    </div>
                    <span className="text-[8px] font-black text-neutral-700 uppercase">–</span>
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-xl font-black italic text-blue-500">
                      {match.awayScore}
                    </div>
                  </div>

                  <div className="text-left">
                    <p className="text-[11px] sm:text-sm md:text-base font-black italic text-white uppercase leading-tight break-words">
                      {match.awayTeam?.name ?? 'TBD'}
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">Away</p>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {match.venue && (
                      <>
                        <MapPin className="h-2.5 w-2.5 text-neutral-600 shrink-0" />
                        <span className="text-[8px] sm:text-[9px] font-black text-neutral-600 uppercase tracking-widest truncate">
                          {match.venue}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    {match.status === 'scheduled' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditMatchId(match._id)}
                          aria-label={`Edit ${match.homeTeam?.name ?? 'home team'} versus ${match.awayTeam?.name ?? 'away team'}`}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                        >
                          🖊 Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(match._id, 'live')}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 whitespace-nowrap"
                        >
                          🚀 Start
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(match._id, 'cancelled')}
                          className="h-7 sm:h-8 px-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {match.status === 'live' && (
                      <>
                        <button
                          type="button"
                          onClick={() => KNOCKOUT_STAGES.has(match.stage)
                            ? setSelectedMatchId(match._id)
                            : handleStatusUpdate(match._id, 'completed')}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                        >
                          {KNOCKOUT_STAGES.has(match.stage) ? '🏆 Resolve' : '✓ Finish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMatchId(match._id)}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                        >
                          + Event
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(match._id, 'cancelled')}
                          className="h-7 sm:h-8 px-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {match.status === 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(match._id, 'scheduled')}
                        className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap"
                      >
                        Restore
                      </button>
                    )}
                    {(match.status === 'completed' || match.status === 'live' || match.status === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => setSelectedMatchId(match._id)}
                        aria-label={`Manage ${match.homeTeam?.name ?? 'home team'} versus ${match.awayTeam?.name ?? 'away team'}`}
                        className="h-7 sm:h-8 px-2 rounded-lg bg-white/5 text-neutral-500 hover:text-white transition-all"
                      >
                        ⚙
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedMatchId && (
        <MatchControllerModal
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
          onUpdate={() => void fetchMatches(true)}
        />
      )}

      {editMatchId && (
        <EditMatchModal
          matchId={editMatchId}
          initialDate={matches.find(m => m._id === editMatchId)?.date || ''}
          initialVenue={matches.find(m => m._id === editMatchId)?.venue || ''}
          onClose={() => setEditMatchId(null)}
          onUpdate={() => void fetchMatches(true)}
        />
      )}
    </div>
  );
}
