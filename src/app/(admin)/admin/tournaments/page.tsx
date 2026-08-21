'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';
import { Plus, CheckCircle2, RefreshCw, CalendarDays, AlertCircle, Flame, Clock, Archive, LockKeyhole, Trophy } from 'lucide-react';
import { PageSpinner } from '@/components/ui/Spinner';
import { FixtureConfigModal } from '@/components/admin/FixtureConfigModal';
import { V2CompetitionPanel } from '@/components/admin/V2CompetitionPanel';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  fixturesGenerated: boolean;
  currentStage: string;
  formatVersion?: 1 | 2;
  format?: 'legacy_league' | 'two_group_knockout';
}

interface TournamentCardProps {
  tournament: Tournament;
  readiness?: LegacyReadiness;
  stageProgress?: { total: number; completed: number } | null;
  isGenerating: boolean;
  canManageTournament: boolean;
  onStatusUpdate: (id: string, status: string) => void;
  onGenerateFixtures: (id: string) => void;
  onGenerateKnockout: (id: string, stage: string) => void;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface LegacyReadiness {
  isReady: boolean;
  totalTeams: number;
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

const NEXT_STAGE: Record<string, string> = {
  league: 'playoff',
  playoff: 'round_of_16',
  round_of_16: 'quarter_finals',
  quarter_finals: 'semi_finals',
  semi_finals: 'final',
};

const NEW_TOURNAMENT_RULES = [
  'Single-leg group stage • 42 matches',
  'Top four per group qualify',
  'Fixed A/B quarter-final pairings',
  'Maximum 10 players • No third place',
] as const;

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
  readiness,
  stageProgress,
  isGenerating,
  canManageTournament,
  onStatusUpdate,
  onGenerateFixtures,
  onGenerateKnockout,
}: TournamentCardProps) {
  const currentStageIdx = STAGES.findIndex(s => s.key === tournament.currentStage);
  const nextStage = NEXT_STAGE[tournament.currentStage];
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
            {readiness && !readiness.isReady && (
              <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 p-3 text-[10px] font-bold text-orange-400 border border-orange-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Requires 28 teams ({readiness.totalTeams} registered) with 5+ players each before fixtures can be generated.</span>
              </div>
            )}
            {readiness?.isReady && !tournament.fixturesGenerated && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" /> All 28 teams are ready!
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {tournament.fixturesGenerated ? (
                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 border border-white/5">
                  <LockKeyhole className="h-3.5 w-3.5" /> Fixtures Generated
                </div>
              ) : !canManageTournament ? (
                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 border border-white/5 cursor-not-allowed" title="Administrator access is required to generate fixtures">
                  <LockKeyhole className="h-3.5 w-3.5" /> Administrator Only
                </div>
              ) : (
                <button
                  disabled={!readiness?.isReady || isGenerating}
                  onClick={() => onGenerateFixtures(tournament._id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600/10 disabled:hover:text-blue-500"
                >
                  <CalendarDays className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : '1. Generate Fixtures'}
                </button>
              )}
              <button 
                onClick={() => onStatusUpdate(tournament._id, 'ongoing')}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" /> 2. Start Season
              </button>
            </div>
          </div>
        )}

        {/* Knockout Stage Generator — visible for ongoing tournaments */}
        {tournament.status === 'ongoing' && tournament.fixturesGenerated && nextStage && (
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
                <span>All <span className="uppercase">{tournament.currentStage.replace(/_/g, ' ')}</span> matches complete — ready to generate <span className="uppercase">{nextStage.replace(/_/g, ' ')}</span>!</span>
              </div>
            )}
            {canManageTournament && (
              <button
                disabled={!allCurrentStageDone || isGenerating}
                onClick={() => {
                  if (confirm(`Generate ${nextStage.replace(/_/g, ' ')} fixtures?`)) {
                    onGenerateKnockout(tournament._id, nextStage);
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all border bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Flame className="h-3.5 w-3.5" />
                Generate {nextStage.replace(/_/g, ' ')}
              </button>
            )}
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
  const [readiness, setReadiness] = useState<Record<string, LegacyReadiness>>({});
  const [stageProgress, setStageProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentLoadError, setTournamentLoadError] = useState<string | null>(null);
  const [isTournamentCatalogueCurrent, setIsTournamentCatalogueCurrent] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmittingTournament, setIsSubmittingTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', season: '', startDate: '', endDate: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTourneyId, setSelectedTourneyId] = useState<string | null>(null);
  const [venueCount, setVenueCount] = useState(0);
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

      const legacyUpcoming = response.data.filter(
        (tournament) => tournament.status === 'upcoming' && tournament.formatVersion !== 2,
      );
      const legacyOngoing = response.data.filter(
        (tournament) => tournament.status === 'ongoing' && tournament.formatVersion !== 2,
      );
      const [readinessResults, progressResults] = await Promise.all([
          Promise.all(
            legacyUpcoming.map(async (tournament): Promise<[string, LegacyReadiness] | null> => {
              try {
                const readinessResponse = await apiClient.get<
                  ApiResponse<LegacyReadiness>,
                  ApiResponse<LegacyReadiness>
                >(`/tournaments/${tournament._id}/readiness`);
                return readinessResponse.success
                  ? [tournament._id, readinessResponse.data]
                  : null;
              } catch {
                return null;
              }
            }),
          ),
          Promise.all(
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
          ),
      ]);

      if (requestSequence !== tournamentRequestSequence.current) return;
      setTournaments(response.data);

      const rData: Record<string, LegacyReadiness> = {};
      for (const result of readinessResults) {
        if (result) rData[result[0]] = result[1];
      }
      setReadiness(rData);

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

  const fetchVenues = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<unknown[]>, ApiResponse<unknown[]>>('/venues');
      if (res.success) setVenueCount(res.data.length);
    } catch {}
  }, []);

  useEffect(() => {
    void fetchTournaments();
    void fetchVenues();
    return () => {
      tournamentRequestSequence.current += 1;
    };
  }, [fetchTournaments, fetchVenues]);

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
        formatVersion: 2,
        format: 'two_group_knockout',
      });
      if (response.success) {
        toast.success('14-team competition created successfully');
        setIsCreating(false);
        setNewTournament({ name: '', season: '', startDate: '', endDate: '' });
        await fetchTournaments();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create season'));
    } finally {
      setIsSubmittingTournament(false);
    }
  };

  const handleGenerateKnockout = async (tournamentId: string, stage: string) => {
    setIsGenerating(tournamentId);
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/generate-knockout`, {
        stage
      });
      if (response.success) {
        toast.success(`Knockout fixtures generated for ${stage.replace('_', ' ')}!`);
        fetchTournaments(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to generate knockout fixtures'));
    } finally {
      setIsGenerating(null);
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

  const handleGenerateFixtures = (id: string) => {
    setSelectedTourneyId(id);
    setIsModalOpen(true);
  };

  const onConfirmGenerate = async (numRounds: number, matchesPerDay: number) => {
    if (!selectedTourneyId) return;

    setIsGenerating(selectedTourneyId);
    setIsModalOpen(false);
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${selectedTourneyId}/generate-fixtures`, {
        numRounds,
        matchesPerDay
      });
      if (response.success) {
        toast.success(`Fixtures successfully generated (${numRounds} rounds, ${matchesPerDay} matches/day)!`);
        fetchTournaments(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to generate fixtures'));
    } finally {
      setIsGenerating(null);
      setSelectedTourneyId(null);
    }
  };

  const groupCompetitions = tournaments.filter(t => t.formatVersion === 2 && t.format === 'two_group_knockout');
  const legacyTournaments = tournaments.filter(t => t.formatVersion !== 2);
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
          <Plus className="h-4 w-4" /> Initialize 14-Team Season
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
          <h2 className="text-xl font-black italic tracking-tighter text-white uppercase mb-2">New 14-Team Season</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Creates the approved fixed-format workspace. You will enter 14 teams and place seven manually into each group.</p>
          <div className="my-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Confirmed competition format">
            {NEW_TOURNAMENT_RULES.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                {rule}
              </div>
            ))}
          </div>
          <form onSubmit={handleCreate} aria-busy={isSubmittingTournament} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
            <div className="space-y-2">
              <label htmlFor="new-tournament-name" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tournament Name</label>
              <input id="new-tournament-name" type="text" required minLength={3} maxLength={120} disabled={isSubmittingTournament} value={newTournament.name} onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} placeholder="e.g. SolidFM 5-Aside" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-season" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Season</label>
              <input id="new-tournament-season" type="text" required maxLength={40} disabled={isSubmittingTournament} value={newTournament.season} onChange={(e) => setNewTournament({ ...newTournament, season: e.target.value })} placeholder="e.g. 2026" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-start-date" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
              <input id="new-tournament-start-date" type="date" required disabled={isSubmittingTournament} value={newTournament.startDate} onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-tournament-end-date" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">End Date <span className="normal-case tracking-normal">(optional)</span></label>
              <input id="new-tournament-end-date" type="date" min={newTournament.startDate || undefined} disabled={isSubmittingTournament} value={newTournament.endDate} onChange={(e) => setNewTournament({ ...newTournament, endDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark]" />
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

      {/* ONGOING */}
      {ongoing.length > 0 && (
        <section>
          <SectionHeader icon={<Flame className="h-4 w-4 text-emerald-500" />} label="Active Season" count={ongoing.length} color="bg-emerald-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ongoing.map(t => (
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} stageProgress={stageProgress[t._id]} isGenerating={isGenerating === t._id} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
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
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} stageProgress={stageProgress[t._id]} isGenerating={isGenerating === t._id} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
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
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} stageProgress={stageProgress[t._id]} isGenerating={isGenerating === t._id} canManageTournament={canManageTournaments} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
            ))}
          </div>
        </section>
      )}

      {tournaments.length === 0 && !tournamentLoadError && (
        <div className="p-12 text-center rounded-[40px] border border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] italic">No tournaments found. Initialize the first season!</p>
        </div>
      )}

      <FixtureConfigModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTourneyId(null);
        }} 
        onConfirm={onConfirmGenerate}
        venueCount={venueCount}
        startDate={tournaments.find(t => t._id === selectedTourneyId)?.startDate}
        isGenerating={!!isGenerating}
      />
    </div>
  );
}
