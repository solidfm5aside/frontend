'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { X, Plus, Trash2, Trophy, Clock, Check, Square } from 'lucide-react';
import { Match, MatchEvent, Player, ApiResponse } from '@/types';

const KNOCKOUT_STAGES = new Set([
  'playoff',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'final',
  'third_place',
]);



interface MatchControllerModalProps {
  matchId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface EventMutationResult {
  match: Match;
  eventId: string;
  replayed: boolean;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function MatchControllerModal({ matchId, onClose, onUpdate }: MatchControllerModalProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rosterLoadError, setRosterLoadError] = useState<string | null>(null);
  
  // --- Optimistic local state (decoupled from match object) ---
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchStatus, setMatchStatus] = useState<Match['status'] | ''>('');

  // Speed Logging State
  const [eventMode, setEventMode] = useState<'goal' | 'yellow_card' | 'red_card'>('goal');
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeSearch, setHomeSearch] = useState('');
  const [awaySearch, setAwaySearch] = useState('');
  const [activeTeamTab, setActiveTeamTab] = useState<'home' | 'away' | 'timeline'>('home');
  const [pendingGoalScorer, setPendingGoalScorer] = useState<Player | null>(null);
  const [lastLoggedEventId, setLastLoggedEventId] = useState<string | null>(null);
  const [flashPlayerId, setFlashPlayerId] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isEventUpdating, setIsEventUpdating] = useState(false);

  // New state to track atomic goal creation (prevents double logging)
  const [pendingGoalInfo, setPendingGoalInfo] = useState<{ 
    playerId: string, 
    teamId: string, 
    tempId: string,
    minute: number 
  } | null>(null);
  
  // Knockout specific state
  const [showKnockoutResolve, setShowKnockoutResolve] = useState(false);
  const [showPenaltyPanel, setShowPenaltyPanel] = useState(false);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [shootoutScore, setShootoutScore] = useState({ home: 0, away: 0 });

  // Track in-flight requests to prevent double-submit (useRef persists across renders)
  const pendingRef = useRef(false);
  const pendingGoalRef = useRef(false);

  const fetchPlayers = useCallback(async (
    teamId: string,
    tournamentId: string,
  ): Promise<Player[]> => {
    const response = await apiClient.get<ApiResponse<Player[]>, ApiResponse<Player[]>>(
      `/players/admin?teamId=${encodeURIComponent(teamId)}&tournamentId=${encodeURIComponent(tournamentId)}&limit=100`,
    );
    if (!response.success || !Array.isArray(response.data)) {
      throw new Error(response.message || 'The squad could not be loaded');
    }
    return response.data;
  }, []);

  const fetchMatchDetails = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setRosterLoadError(null);
    try {
      const response = await apiClient.get<ApiResponse<Match[]>, ApiResponse<Match[]>>(
        `/matches?matchId=${encodeURIComponent(matchId)}`,
      );
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || 'The match could not be loaded');
      }
      const m = response.data.find((item) => item._id === matchId);

      if (m) {
        setMatch(m);
        setEvents(m.events || []);
        setHomeScore(m.homeScore ?? 0);
        setAwayScore(m.awayScore ?? 0);
        setMatchStatus(m.status);


        const homeId = m.homeTeam?._id || '';
        const awayId = m.awayTeam?._id || '';
        const tournamentId = typeof m.tournamentId === 'string'
          ? m.tournamentId
          : m.tournamentId?._id || '';
        const [homeResult, awayResult] = await Promise.allSettled([
          homeId && tournamentId
            ? fetchPlayers(homeId, tournamentId)
            : Promise.resolve([]),
          awayId && tournamentId
            ? fetchPlayers(awayId, tournamentId)
            : Promise.resolve([]),
        ]);

        setHomePlayers(homeResult.status === 'fulfilled' ? homeResult.value : []);
        setAwayPlayers(awayResult.status === 'fulfilled' ? awayResult.value : []);
        if (homeResult.status === 'rejected' || awayResult.status === 'rejected') {
          setRosterLoadError('One or both squads could not be loaded. Retry before recording match events.');
        }
      } else {
        throw new Error('Match not found');
      }
    } catch (error: unknown) {
      setMatch(null);
      setHomePlayers([]);
      setAwayPlayers([]);
      setLoadError(getErrorMessage(error, 'Failed to fetch match details'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPlayers, matchId]);

  useEffect(() => {
    void fetchMatchDetails();
  }, [fetchMatchDetails]);

  // --- OPTIMISTIC EVENT ADD (MAIN GRID) ---
  const handleAddEvent = async (playerId: string, teamId: string) => {
    if (matchStatus !== 'live' && matchStatus !== 'completed') {
      toast.error('Start or reopen this match before recording events');
      return;
    }
    if (pendingRef.current || pendingGoalRef.current || isStatusUpdating) return;

    // Flash animation immediately
    setFlashPlayerId(playerId);
    setTimeout(() => setFlashPlayerId(null), 800);

    const tempId = `temp_${crypto.randomUUID()}`;
    const allPlayers = [...homePlayers, ...awayPlayers];
    const playerObj = allPlayers.find(p => p._id === playerId);

    // 1. Build temp event for UI
    const tempEvent: MatchEvent = {
      _id: tempId,
      type: eventMode,
      minute: currentMinute,
      playerId: { _id: playerId, name: playerObj?.name || '' },
      teamId,
    };

    // 2. Update UI instantly
    setEvents(prev => [...prev, tempEvent]);
    if (eventMode === 'goal') {
      // Lock synchronously before React renders so a fast double click cannot
      // create a second optimistic goal or orphan the first assist prompt.
      pendingGoalRef.current = true;
      if (teamId === match?.homeTeam._id) setHomeScore(s => s + 1);
      else setAwayScore(s => s + 1);
      
      // Goal logic: Wait for assist (Atomic Flow)
      setPendingGoalScorer(playerObj || null);
      setPendingGoalInfo({ playerId, teamId, tempId, minute: currentMinute });
      setLastLoggedEventId(tempId);
      return;
    }

    // Non-Goal logic (Cards): API call immediately
    setLastLoggedEventId(tempId);
    if (autoAdvance) setCurrentMinute(prev => Math.min(120, prev + 1));
    
    await commitEventToServer(eventMode, teamId, playerId, currentMinute, undefined, tempId);
  };

  // --- ATOMIC GOAL FINALIZATION (ASSIST OVERLAY) ---
  const handleFinalizeGoal = async (assistId?: string) => {
    if (!pendingGoalInfo || pendingRef.current) return;
    const { playerId, teamId, tempId, minute } = pendingGoalInfo;

    pendingGoalRef.current = false;
    setPendingGoalScorer(null);
    setPendingGoalInfo(null);
    
    if (autoAdvance) setCurrentMinute(prev => Math.min(120, prev + 1));
    
    await commitEventToServer('goal', teamId, playerId, minute, assistId, tempId);
  };

  const commitEventToServer = async (
    type: MatchEvent['type'],
    teamId: string, 
    playerId: string, 
    minute: number, 
    assistId: string | undefined,
    tempId: string
  ) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsEventUpdating(true);

    try {
      const payload = { type, teamId, playerId, minute, assistPlayerId: assistId || undefined };
      const submitEvent = () => apiClient.post<
          ApiResponse<EventMutationResult>,
          ApiResponse<EventMutationResult>
        >(
          `/matches/${matchId}/events`,
          payload,
          { headers: { 'Idempotency-Key': tempId } },
        );
      let resp: ApiResponse<EventMutationResult>;
      try {
        resp = await submitEvent();
      } catch (firstError: unknown) {
        const status = isAxiosError(firstError) ? firstError.response?.status : undefined;
        if (!isAxiosError(firstError) || (status !== undefined && status < 500)) throw firstError;
        resp = await submitEvent();
      }
      
      if (resp.success && resp.data.match.events) {
        const serverEvents = resp.data.match.events as MatchEvent[];
        setEvents([...serverEvents].sort((a, b) => a.minute - b.minute));
        setHomeScore(resp.data.match.homeScore ?? 0);
        setAwayScore(resp.data.match.awayScore ?? 0);
        setLastLoggedEventId(resp.data.eventId);
        onUpdate();
      } else throw new Error();
    } catch (error: unknown) {
      setEvents(prev => prev.filter(e => e._id !== tempId));
      if (type === 'goal') {
        if (teamId === match?.homeTeam._id) setHomeScore(s => Math.max(0, s - 1));
        else setAwayScore(s => Math.max(0, s - 1));
      }
      toast.error(getErrorMessage(error, 'Failed to sync event with server'));
    } finally {
      pendingRef.current = false;
      pendingGoalRef.current = false;
      setIsEventUpdating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const eventToDelete = events.find(e => e._id === eventId);
    if (!eventToDelete) return;

    if (eventId.startsWith('temp_')) {
      if (pendingGoalInfo?.tempId !== eventId) return;
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (eventToDelete.teamId === match?.homeTeam._id) {
        setHomeScore(score => Math.max(0, score - 1));
      } else {
        setAwayScore(score => Math.max(0, score - 1));
      }
      pendingGoalRef.current = false;
      setPendingGoalInfo(null);
      setPendingGoalScorer(null);
      setLastLoggedEventId(null);
      return;
    }
    if (pendingRef.current || pendingGoalRef.current || isStatusUpdating) return;
    pendingRef.current = true;
    setIsEventUpdating(true);

    setEvents(prev => prev.filter(e => e._id !== eventId));
    if (eventToDelete.type === 'goal') {
      if (eventToDelete.teamId === match?.homeTeam._id) setHomeScore(s => Math.max(0, s - 1));
      else setAwayScore(s => Math.max(0, s - 1));
    }
    if (lastLoggedEventId === eventId) setLastLoggedEventId(null);

    try {
      const resp = await apiClient.delete<ApiResponse<Match>, ApiResponse<Match>>(
        `/matches/${matchId}/events/${eventId}`,
      );
      if (resp.success && resp.data.events) {
        setEvents([...resp.data.events].sort((a: MatchEvent, b: MatchEvent) => a.minute - b.minute));
        setHomeScore(resp.data.homeScore ?? 0);
        setAwayScore(resp.data.awayScore ?? 0);
        onUpdate();
      } else if (!resp.success) throw new Error('Failed');
    } catch (error: unknown) {
      setEvents(prev => {
        const updated = [...prev];
        if (!updated.some(e => e._id === eventId)) {
          updated.push(eventToDelete);
        }
        return updated.sort((a, b) => a.minute - b.minute);
      });
      if (eventToDelete.type === 'goal') {
        if (eventToDelete.teamId === match?.homeTeam._id) setHomeScore(s => s + 1);
        else setAwayScore(s => s + 1);
      }
      toast.error(getErrorMessage(error, 'Failed to delete event'));
    } finally {
      pendingRef.current = false;
      setIsEventUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Match['status']) => {
    if (pendingRef.current || pendingGoalRef.current || isStatusUpdating) {
      toast.error('Finish the current match event before changing status');
      return;
    }
    const isKnockout = Boolean(match && KNOCKOUT_STAGES.has(match.stage));
    if (newStatus === 'completed' && isKnockout) {
      if (homeScore === awayScore) {
        setShowKnockoutResolve(true);
        return;
      }

      const winnerId = homeScore > awayScore ? match!.homeTeam._id : match!.awayTeam._id;
      await handleSetWinner(winnerId);
      return;
    }

    const previousStatus = matchStatus;
    setIsStatusUpdating(true);
    setMatchStatus(newStatus);
    try {
      const resp = await apiClient.patch<ApiResponse<Match>, ApiResponse<Match>>(
        `/matches/${matchId}/status`,
        { status: newStatus },
      );
      if (resp.success) {
        setMatch(resp.data);
        setMatchStatus(resp.data.status);
        setEvents(resp.data.events || []);
        setHomeScore(resp.data.homeScore ?? 0);
        setAwayScore(resp.data.awayScore ?? 0);
        if (newStatus === 'live') {
          setIsExtraTime(false);
          setShootoutScore({ home: 0, away: 0 });
          setShowKnockoutResolve(false);
          setShowPenaltyPanel(false);
        }
        toast.success(`Match marked as ${newStatus}`);
        onUpdate();
      } else throw new Error();
    } catch (error: unknown) {
      setMatchStatus(previousStatus);
      toast.error(getErrorMessage(error, 'Failed to update status'));
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleReopenForCorrection = () => {
    if (!window.confirm('Reopen this completed match for correction? Its saved winner and shootout decision will be cleared until the match is completed again.')) return;
    void handleStatusUpdate('live');
  };

  const handleCancelMatch = () => {
    if (!window.confirm('Cancel this match? It can be restored to the schedule later.')) return;
    void handleStatusUpdate('cancelled');
  };

  async function handleSetWinner(winnerId: string, pens?: { home: number, away: number }) {
    if (pendingRef.current || pendingGoalRef.current || isStatusUpdating) return;
    setIsStatusUpdating(true);
    try {
      const payload = { winnerId, isExtraTime, shootoutScore: pens || undefined };
      const resp = await apiClient.patch<ApiResponse<Match>, ApiResponse<Match>>(
        `/matches/${matchId}/winner`,
        payload,
      );
      if (resp.success) {
        toast.success('Knockout match resolved and completed!');
        setShowKnockoutResolve(false);
        setShowPenaltyPanel(false);
        onUpdate();
        onClose();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to set winner'));
    } finally {
      setIsStatusUpdating(false);
    }
  }

  if (isLoading || !match) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 font-outfit backdrop-blur-xl">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-console-state-title"
          aria-busy={isLoading}
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0a0a0a] p-7 text-center shadow-2xl"
        >
          <h2 id="match-console-state-title" className="text-xl font-black uppercase italic tracking-tight text-white">
            {isLoading ? 'Loading match console' : 'Match console unavailable'}
          </h2>
          <p className="mt-3 text-xs font-bold leading-relaxed text-neutral-400" role={loadError ? 'alert' : undefined}>
            {isLoading ? 'Loading the match and both registered squads…' : loadError}
          </p>
          {!isLoading && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void fetchMatchDetails()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-500"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredHomePlayers = homePlayers.filter(p => p.name.toLowerCase().includes(homeSearch.toLowerCase()));
  const filteredAwayPlayers = awayPlayers.filter(p => p.name.toLowerCase().includes(awaySearch.toLowerCase()));
  const canLogEvents = matchStatus === 'live' || matchStatus === 'completed';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xl bg-black/80 font-outfit">
      <div className="w-full max-w-6xl h-[98vh] sm:h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.1)] animate-in fade-in zoom-in duration-200 flex flex-col relative">
        
        {/* Glow Effects */}
        <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${
          eventMode === 'goal' ? 'bg-blue-600' : eventMode === 'yellow_card' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-white/5 bg-white/[0.02] gap-3 shrink-0">
           <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-2xl font-black italic uppercase tracking-tighter text-white truncate">Match Console</h2>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full ${matchStatus === 'live' ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'}`}></span>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 truncate">
                    {matchStatus} Status • {match.stage !== 'league' ? `${match.stage.replace(/_/g, ' ')} Mode` : 'League Mode'}
                  </p>
                </div>
              </div>
           </div>

           {/* Match Status Controls */}
           <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center bg-white/5 rounded-xl p-0.5 sm:p-1 border border-white/5">
                {matchStatus === 'scheduled' && (
                  <>
                    <button
                      type="button"
                      disabled={isStatusUpdating || isEventUpdating || Boolean(pendingGoalInfo)}
                      onClick={() => void handleStatusUpdate('live')}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white transition-all whitespace-nowrap disabled:opacity-40"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      disabled={isStatusUpdating || isEventUpdating || Boolean(pendingGoalInfo)}
                      onClick={handleCancelMatch}
                      className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {matchStatus === 'live' && (
                  <>
                    <button
                      type="button"
                      disabled={isStatusUpdating || isEventUpdating || Boolean(pendingGoalInfo)}
                      onClick={() => void handleStatusUpdate('completed')}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all whitespace-nowrap disabled:opacity-40"
                    >
                      End Match
                    </button>
                    <button
                      type="button"
                      disabled={isStatusUpdating || isEventUpdating || Boolean(pendingGoalInfo)}
                      onClick={handleCancelMatch}
                      className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {matchStatus === 'completed' && (
                  <button
                    type="button"
                    disabled={isStatusUpdating || isEventUpdating || Boolean(pendingGoalInfo)}
                    onClick={handleReopenForCorrection}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap disabled:opacity-40"
                  >
                    Reopen
                  </button>
                )}
                {matchStatus === 'cancelled' && (
                  <button
                    type="button"
                    disabled={isStatusUpdating || isEventUpdating}
                    onClick={() => void handleStatusUpdate('scheduled')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap disabled:opacity-40"
                  >
                    Restore
                  </button>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close match console" className="h-8 w-8 sm:h-11 sm:w-11 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 shrink-0">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
           </div>
        </div>

        {/* Split UI: Action & Grid | Timeline */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
           
           {/* Mobile Tab Toggle (Persistent) */}
           <div className="flex md:hidden p-1 bg-white/5 border-b border-white/5 shrink-0">
              <button 
                onClick={() => setActiveTeamTab('home')} 
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTeamTab === 'home' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-500'}`}
              >
                HOME
              </button>
              <button 
                onClick={() => setActiveTeamTab('away')} 
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTeamTab === 'away' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-500'}`}
              >
                AWAY
              </button>
              <button 
                onClick={() => setActiveTeamTab('timeline')} 
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTeamTab === 'timeline' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-500'}`}
              >
                 LOG
              </button>
           </div>
          
           {/* LEFT: Grid Console */}
           <div className={`flex-1 flex flex-col overflow-hidden ${activeTeamTab === 'timeline' ? 'hidden md:flex' : 'flex'}`}>
             {rosterLoadError && (
               <div className="flex flex-col gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
                 <p className="text-[9px] font-black uppercase tracking-widest text-yellow-200">{rosterLoadError}</p>
                 <button
                   type="button"
                   disabled={isLoading}
                   onClick={() => void fetchMatchDetails()}
                   className="self-start text-[9px] font-black uppercase tracking-widest text-white underline underline-offset-4 disabled:opacity-40 sm:self-auto"
                 >
                   Retry squads
                 </button>
               </div>
             )}
            
             {/* ACTION ZONE: Mode & Minute */}
             <div className="p-3 sm:p-6 bg-white/[0.01] border-b border-white/5 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
                  
                  {/* 1. Mode Selector */}
                  <div className="flex bg-white/5 p-1 rounded-[16px] sm:rounded-2xl border border-white/5 flex-1 max-w-sm">
                    {[
                      { type: 'goal', label: 'Goal', icon: <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                      { type: 'yellow_card', label: 'Yellow', icon: <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 bg-yellow-500 rounded-[2px]" /> },
                      { type: 'red_card', label: 'Red', icon: <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 bg-red-600 rounded-[2px]" /> }
                    ].map(mode => (
                      <button
                        key={mode.type}
                        type="button"
                        disabled={!canLogEvents || Boolean(rosterLoadError) || isEventUpdating || Boolean(pendingGoalInfo)}
                        onClick={() => setEventMode(mode.type as typeof eventMode)}
                        className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                          eventMode === mode.type 
                          ? mode.type === 'goal' ? 'bg-blue-600 text-white shadow-lg' :
                             mode.type === 'yellow_card' ? 'bg-yellow-500 text-black shadow-lg' :
                             'bg-red-600 text-white shadow-lg'
                          : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {mode.icon}
                        <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 2. Minute Controller */}
                  <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6">
                     <div className="flex items-center gap-1">
                        <button type="button" disabled={!canLogEvents || Boolean(rosterLoadError) || Boolean(pendingGoalInfo)} onClick={() => setCurrentMinute(Math.max(0, currentMinute - 5))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black disabled:opacity-40">-5</button>
                        <button type="button" disabled={!canLogEvents || Boolean(rosterLoadError) || Boolean(pendingGoalInfo)} onClick={() => setCurrentMinute(Math.max(0, currentMinute - 1))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black disabled:opacity-40">-1</button>
                     </div>
                     
                     <div className="relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">
                           Min
                        </div>
                        <div className={`h-11 w-16 sm:h-16 sm:w-24 rounded-2xl flex items-center justify-center border transition-all duration-500 bg-gradient-to-b from-neutral-800 to-neutral-900 border-white/10`}>
                           <span className="text-xl sm:text-4xl font-black italic text-white tracking-tighter">{currentMinute}</span>
                        </div>
                     </div>

                     <div className="flex items-center gap-1">
                        <button type="button" disabled={!canLogEvents || Boolean(rosterLoadError) || Boolean(pendingGoalInfo) || currentMinute >= 120} onClick={() => setCurrentMinute(Math.min(120, currentMinute + 1))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black disabled:opacity-40">+1</button>
                        <button type="button" disabled={!canLogEvents || Boolean(rosterLoadError) || Boolean(pendingGoalInfo) || currentMinute >= 120} onClick={() => setCurrentMinute(Math.min(120, currentMinute + 5))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black disabled:opacity-40">+5</button>
                     </div>
                  </div>

                  {/* 3. Settings */}
                  <div className="flex items-center justify-center lg:justify-end gap-6 sm:gap-8 ml-auto">
                     <button 
                       type="button"
                       disabled={!canLogEvents || Boolean(rosterLoadError) || Boolean(pendingGoalInfo)}
                       onClick={() => setAutoAdvance(!autoAdvance)}
                       className="group flex flex-col items-center gap-1"
                     >
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600 transition-colors group-hover:text-blue-500">Auto +1m</span>
                        <div className={`h-4 w-9 rounded-full p-0.5 transition-all ${autoAdvance ? 'bg-blue-600' : 'bg-neutral-800'}`}>
                           <div className={`h-3 w-3 bg-white rounded-full transition-transform ${autoAdvance ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                     </button>
                     
                     {lastLoggedEventId && (
                       <button 
                         type="button"
                         disabled={!canLogEvents || Boolean(rosterLoadError) || isEventUpdating}
                         onClick={() => void handleDeleteEvent(lastLoggedEventId)}
                         className="flex flex-col items-center gap-1 group disabled:opacity-40"
                       >
                          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-red-500">Undo</span>
                          <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-lg group-hover:shadow-red-600/20">
                             <Trash2 className="h-4 w-4" />
                          </div>
                       </button>
                     )}
                  </div>
                </div>
             </div>

             {/* ROSTER GRID ZONE */}
             <div className="flex-1 overflow-hidden flex flex-col sm:flex-row relative">
                
                {/* Assist Overlay */}
                {pendingGoalScorer && (
                  <div className="absolute inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
                     <div className="mx-auto max-w-2xl bg-blue-600 rounded-t-[24px] sm:rounded-t-[32px] p-4 sm:p-6 shadow-2xl border-x border-t border-white/20">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                           <div>
                             <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Goal Logged!</p>
                             <h4 className="text-sm sm:text-xl font-black text-white italic uppercase tracking-tighter">Who provided the assist?</h4>
                           </div>
                           <button type="button" disabled={isEventUpdating} onClick={() => void handleFinalizeGoal()} className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-40">Skip</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                           {(homePlayers.some(p => p._id === pendingGoalScorer?._id) ? homePlayers : awayPlayers)
                             .filter(p => p._id !== pendingGoalScorer?._id)
                             .map(player => (
                             <button
                               key={player._id}
                               type="button"
                               disabled={isEventUpdating}
                               onClick={() => void handleFinalizeGoal(player._id)}
                               className="p-2 sm:p-3 rounded-xl bg-white/10 hover:bg-white text-white hover:text-blue-600 transition-all text-center min-w-0"
                             >
                                <span className="text-[9px] sm:text-[10px] font-black uppercase truncate block">{player.name}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
                )}


                {/* Home Team Column */}
                <div className={`flex-1 flex flex-col border-r border-white/5 min-w-0 ${activeTeamTab === 'home' ? 'flex' : 'hidden md:flex'}`}>
                   <div className="p-3 sm:p-4 border-b border-white/5 bg-blue-600/5">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                         <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-black flex items-center justify-center font-black italic text-blue-500 border border-blue-500/20">{match.homeTeam?.name?.charAt(0)}</div>
                         <h3 className="text-[10px] sm:text-sm font-black italic text-white uppercase truncate">{match.homeTeam?.name}</h3>
                      </div>
                      <input 
                         type="text" 
                         placeholder="Filter roster..." 
                         value={homeSearch}
                         onChange={(e) => setHomeSearch(e.target.value)}
                         className="w-full h-8 sm:h-10 bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 text-[10px] sm:text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 sm:p-4 grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2 auto-rows-max">
                      {filteredHomePlayers.map(p => (
                         <button
                           key={p._id}
                           type="button"
                           disabled={!canLogEvents || Boolean(rosterLoadError) || isEventUpdating || Boolean(pendingGoalInfo) || isStatusUpdating}
                           onClick={() => void handleAddEvent(p._id, match.homeTeam._id)}
                           className={`group relative p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left overflow-hidden min-h-[60px] sm:min-h-[80px] flex flex-col justify-end ${
                             flashPlayerId === p._id ? 'bg-green-500 border-green-400 scale-95' :
                             'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 active:scale-95'
                           }`}
                         >
                            <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-1 ${flashPlayerId === p._id ? 'text-green-100' : 'text-neutral-600 group-hover:text-blue-500'}`}>#{p._id.slice(-2)}</span>
                            <span className={`text-[10px] sm:text-xs font-bold leading-tight uppercase ${flashPlayerId === p._id ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{p.name}</span>
                            {flashPlayerId === p._id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500 animate-in fade-in duration-200">
                                 <Check className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                              </div>
                            )}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Away Team Column */}
                <div className={`flex-1 flex flex-col min-w-0 ${activeTeamTab === 'away' ? 'flex' : 'hidden md:flex'}`}>
                   <div className="p-3 sm:p-4 border-b border-white/5 bg-red-600/5">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                         <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-black flex items-center justify-center font-black italic text-red-500 border border-red-500/20">{match.awayTeam?.name?.charAt(0)}</div>
                         <h3 className="text-[10px] sm:text-sm font-black italic text-white uppercase truncate">{match.awayTeam?.name}</h3>
                      </div>
                      <input 
                         type="text" 
                         placeholder="Filter roster..." 
                         value={awaySearch}
                         onChange={(e) => setAwaySearch(e.target.value)}
                         className="w-full h-8 sm:h-10 bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 text-[10px] sm:text-xs text-white focus:outline-none focus:border-red-500"
                      />
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 sm:p-4 grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2 auto-rows-max">
                      {filteredAwayPlayers.map(p => (
                         <button
                           key={p._id}
                           type="button"
                           disabled={!canLogEvents || Boolean(rosterLoadError) || isEventUpdating || Boolean(pendingGoalInfo) || isStatusUpdating}
                           onClick={() => void handleAddEvent(p._id, match.awayTeam._id)}
                           className={`group relative p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left overflow-hidden min-h-[60px] sm:min-h-[80px] flex flex-col justify-end ${
                             flashPlayerId === p._id ? 'bg-green-500 border-green-400 scale-95' :
                             'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 active:scale-95'
                           }`}
                         >
                            <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest mb-1 ${flashPlayerId === p._id ? 'text-green-100' : 'text-neutral-600 group-hover:text-red-500'}`}>#{p._id.slice(-2)}</span>
                            <span className={`text-[10px] sm:text-xs font-bold leading-tight uppercase ${flashPlayerId === p._id ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{p.name}</span>
                            {flashPlayerId === p._id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500 animate-in fade-in duration-200">
                                 <Check className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                              </div>
                            )}
                         </button>
                      ))}
                   </div>
                </div>
             </div>
           </div>

           {/* RIGHT: Timeline Sidebar */}
           <div className={`w-full md:w-[280px] lg:w-[400px] border-l border-white/5 bg-white/[0.01] flex flex-col shrink-0 overflow-hidden ${activeTeamTab === 'timeline' ? 'flex' : 'hidden md:flex'}`}>
              <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                 <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Live Log</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                       <span className="text-xs sm:text-sm font-black italic text-white uppercase">{homeScore} — {awayScore}</span>
                    </div>
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-neutral-500">{events.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                 {events.length === 0 ? (
                   <div className="py-20 text-center opacity-30">
                     <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">Waiting for kickoff...</p>
                   </div>
                 ) : (
                   [...events].sort((a,b) => b.minute - a.minute).map((ev) => (
                     <div key={ev._id} className={`flex items-center gap-2.5 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl border group relative transition-all ${
                        ev._id.startsWith('temp_') ? 'bg-blue-600/10 border-blue-500/20 animate-pulse' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                     }`}>
                         <div className={`h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center border ${
                           ev.type === 'goal' ? 'bg-blue-600/10 border-blue-500/20' : 
                           ev.type === 'yellow_card' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'
                         }`}>
                            {ev.type === 'goal' && <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />}
                            {ev.type === 'yellow_card' && <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />}
                            {ev.type === 'red_card' && <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 fill-red-500" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs font-black text-white truncate uppercase tracking-tight">
                              {ev.playerId?.name}
                            </p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                               <span className="text-[9px] sm:text-[10px] font-black text-blue-500 italic">{ev.minute}′</span>
                               <span className="h-0.5 w-0.5 rounded-full bg-neutral-700"></span>
                               <span className="text-[7px] sm:text-[8px] font-bold text-neutral-500 uppercase tracking-widest truncate">
                                 {ev.type.replace('_', ' ')}
                                 {ev.assistPlayerId && <span className="text-blue-400/60 ml-1">({ev.assistPlayerId.name.split(' ')[0]})</span>}
                               </span>
                            </div>
                         </div>
                         {!ev._id.startsWith('temp_') && (
                           <button 
                             type="button"
                             disabled={!canLogEvents || Boolean(rosterLoadError) || isEventUpdating || Boolean(pendingGoalInfo) || isStatusUpdating}
                             onClick={() => void handleDeleteEvent(ev._id)}
                             aria-label={`Delete ${ev.type.replace('_', ' ')} by ${ev.playerId?.name ?? 'player'}`}
                             className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-red-500/20 disabled:opacity-20"
                           >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                           </button>
                         )}
                     </div>
                   ))
                 )}
              </div>

              {/* Footer Score Display */}
              <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="text-center">
                       <p className="text-[8px] font-black uppercase text-neutral-600 mb-0.5 sm:mb-1">{match.homeTeam?.name?.slice(0, 3)}</p>
                       <span className="text-xl sm:text-2xl font-black italic text-white tracking-tighter">{homeScore}</span>
                    </div>
                    <div className="h-0.5 w-8 sm:w-12 bg-white/5 rounded-full"></div>
                    <div className="text-center">
                       <p className="text-[8px] font-black uppercase text-neutral-600 mb-0.5 sm:mb-1">{match.awayTeam?.name?.slice(0, 3)}</p>
                       <span className="text-xl sm:text-2xl font-black italic text-white tracking-tighter">{awayScore}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* KNOCKOUT RESOLVE DIALOG */}
        {showKnockoutResolve && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6 sm:mb-8">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
                   </div>
                   <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase">Match Level</h3>
                   <p className="text-[9px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-2">{match.homeTeam.name} {homeScore} - {awayScore} {match.awayTeam.name}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                   <button 
                     type="button"
                     onClick={() => { setIsExtraTime(true); setShowKnockoutResolve(false); }}
                     className="w-full p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-blue-600/5 transition-all text-left flex items-center justify-between group"
                   >
                      <div>
                         <p className="text-xs sm:text-sm font-black text-white uppercase">Approved Extra Time</p>
                         <p className="text-[9px] sm:text-[10px] font-bold text-neutral-500 mt-1">Continue under the competition committee&apos;s approved procedure</p>
                      </div>
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-700 group-hover:text-blue-500 transition-colors" />
                   </button>

                   <button 
                     type="button"
                     onClick={() => { setShowPenaltyPanel(true); setShowKnockoutResolve(false); }}
                     className="w-full p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 hover:bg-amber-600/5 transition-all text-left flex items-center justify-between group"
                   >
                      <div>
                         <p className="text-xs sm:text-sm font-black text-white uppercase">Penalties</p>
                         <p className="text-[9px] sm:text-[10px] font-bold text-neutral-500 mt-1">Decide match with a shootout</p>
                      </div>
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-700 group-hover:text-amber-500 transition-colors" />
                   </button>

                   <button 
                     type="button"
                     onClick={() => setShowKnockoutResolve(false)}
                     className="w-full py-2 text-[10px] font-black text-neutral-600 uppercase tracking-widest hover:text-white transition-colors"
                   >
                     Cancel
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* PENALTY SHOOTOUT PANEL */}
        {showPenaltyPanel && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
             <div className="w-full max-w-xl bg-black border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-12 shadow-[0_0_100px_rgba(245,158,11,0.2)] animate-in slide-in-from-bottom-8 duration-300">
                <div className="text-center mb-8 sm:mb-12">
                   <div className="inline-flex px-3 sm:px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-4">
                      Goalmouth Showdown
                   </div>
                   <h3 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-white uppercase">Penalty Shootout</h3>
                </div>

                <div className="flex items-center justify-between gap-4 sm:gap-8 mb-8 sm:mb-12">
                   <div className="flex-1 text-center space-y-3 sm:space-y-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-sm sm:text-lg font-black italic text-neutral-400 uppercase">{match.homeTeam.name.charAt(0)}</div>
                      <p className="text-[8px] sm:text-[10px] font-black text-neutral-500 uppercase truncate">{match.homeTeam.name}</p>
                      <input 
                        type="number" 
                        min={0}
                        inputMode="numeric"
                        aria-label={`${match.homeTeam.name} penalty shootout score`}
                        value={shootoutScore.home}
                        onChange={(e) => setShootoutScore({ ...shootoutScore, home: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-3xl sm:text-6xl font-black italic text-center text-white focus:outline-none focus:border-amber-500 transition-all"
                      />
                   </div>

                   <div className="text-xl sm:text-2xl font-black italic text-neutral-700 pt-12 sm:pt-16 uppercase italic">VS</div>

                   <div className="flex-1 text-center space-y-3 sm:space-y-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-sm sm:text-lg font-black italic text-neutral-400 uppercase">{match.awayTeam.name.charAt(0)}</div>
                      <p className="text-[8px] sm:text-[10px] font-black text-neutral-500 uppercase truncate">{match.awayTeam.name}</p>
                      <input 
                        type="number" 
                        min={0}
                        inputMode="numeric"
                        aria-label={`${match.awayTeam.name} penalty shootout score`}
                        value={shootoutScore.away}
                        onChange={(e) => setShootoutScore({ ...shootoutScore, away: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-3xl sm:text-6xl font-black italic text-center text-white focus:outline-none focus:border-amber-500 transition-all font-outfit"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <button 
                      type="button"
                      onClick={() => {
                        if (shootoutScore.home === shootoutScore.away) {
                          toast.error('Shootout cannot end in a draw!');
                          return;
                        }
                        const winnerId = shootoutScore.home > shootoutScore.away ? match.homeTeam._id : match.awayTeam._id;
                        handleSetWinner(winnerId, shootoutScore);
                      }}
                      className="col-span-2 sm:col-span-1 h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-amber-500 text-black text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                   >
                      Confirm Winner
                   </button>
                   <button 
                      type="button"
                      onClick={() => setShowPenaltyPanel(false)}
                      className="col-span-2 sm:col-span-1 h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-neutral-400 text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                   >
                      Back
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* REGULAR KNOCKOUT WINNER (IF NOT LEVEL) */}
        {matchStatus === 'live' && KNOCKOUT_STAGES.has(match.stage) && homeScore !== awayScore && (
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-blue-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                   <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                   <p className="text-[7px] sm:text-[8px] font-black uppercase text-neutral-500 tracking-widest">Advances</p>
                   <p className="text-[9px] sm:text-[11px] font-black text-white italic uppercase tracking-tighter truncate max-w-[100px] sm:max-w-none">
                     {homeScore > awayScore ? match.homeTeam.name : match.awayTeam.name}
                   </p>
                </div>
                <button 
                   onClick={() => {
                     const winnerId = homeScore > awayScore ? match.homeTeam._id : match.awayTeam._id;
                     handleSetWinner(winnerId);
                   }}
                   className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                >
                   Finalize
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
