'use client';

import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { X, Plus, Trash2, Trophy, Clock, Flame, Check, Square } from 'lucide-react';
import { Match, MatchEvent, Player, ApiResponse } from '@/types';




interface MatchControllerModalProps {
  matchId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function MatchControllerModal({ matchId, onClose, onUpdate }: MatchControllerModalProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Optimistic local state (decoupled from match object) ---
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchStatus, setMatchStatus] = useState('');

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

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const resp: ApiResponse<any> = await apiClient.get(`/matches?matchId=${matchId}`);
      const m = Array.isArray(resp.data)
        ? resp.data.find((item: any) => item._id === matchId)
        : resp.data;

      if (m) {
        setMatch(m);
        setEvents(m.events || []);
        setHomeScore(m.homeScore ?? 0);
        setAwayScore(m.awayScore ?? 0);
        setMatchStatus(m.status);


        const homeId = m.homeTeam?._id || '';
        const awayId = m.awayTeam?._id || '';
        if (homeId) fetchPlayers(homeId, setHomePlayers);
        if (awayId) fetchPlayers(awayId, setAwayPlayers);
      }
    } catch (err) {
      toast.error('Failed to fetch match details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlayers = async (teamId: string, setter: (p: Player[]) => void) => {
    try {
      const resp: any = await apiClient.get(`/players?teamId=${teamId}&limit=100`);
      if (resp.success) setter(resp.data);
    } catch (err) {
      console.error('Failed to fetch players for team', teamId);
    }
  };

  // --- OPTIMISTIC EVENT ADD (MAIN GRID) ---
  const handleAddEvent = async (playerId: string, teamId: string) => {
    if (pendingRef.current) return;

    // Flash animation immediately
    setFlashPlayerId(playerId);
    setTimeout(() => setFlashPlayerId(null), 800);

    const tempId = `temp_${Date.now()}`;
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
    if (autoAdvance) setCurrentMinute(prev => prev + 1);
    
    await commitEventToServer(eventMode, teamId, playerId, currentMinute, undefined, tempId);
  };

  // --- ATOMIC GOAL FINALIZATION (ASSIST OVERLAY) ---
  const handleFinalizeGoal = async (assistId?: string) => {
    if (!pendingGoalInfo) return;
    const { playerId, teamId, tempId, minute } = pendingGoalInfo;
    
    setPendingGoalScorer(null);
    setPendingGoalInfo(null);
    
    if (autoAdvance) setCurrentMinute(prev => prev + 1);
    
    await commitEventToServer('goal', teamId, playerId, minute, assistId, tempId);
  };

  const commitEventToServer = async (
    type: string, 
    teamId: string, 
    playerId: string, 
    minute: number, 
    assistId: string | undefined,
    tempId: string
  ) => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    try {
      const payload = { type, teamId, playerId, minute, assistPlayerId: assistId || undefined };
      const resp: any = await apiClient.post(`/matches/${matchId}/events`, payload);
      
      if (resp.success && resp.data.events) {
        setEvents(prev => {
          const serverEvents = resp.data.events;
          const otherTemps = prev.filter(e => e._id.startsWith('temp_') && e._id !== tempId);
          
          const unresolvedTemps = otherTemps.filter(temp => {
            return !serverEvents.some((s: any) => 
              s.type === temp.type && 
              s.playerId?._id === temp.playerId?._id && 
              s.minute === temp.minute
            );
          });

          const merged = [...serverEvents, ...unresolvedTemps];
          const seen = new Set();
          return merged.filter(e => {
            if (seen.has(e._id)) return false;
            seen.add(e._id);
            return true;
          }).sort((a, b) => a.minute - b.minute);
        });

        const realEvent = resp.data.events.find((e: any) => 
          e.type === type && e.playerId?._id === playerId && e.minute === minute
        ) || resp.data.events[resp.data.events.length - 1];
        
        if (realEvent) setLastLoggedEventId(realEvent._id);
        
      } else throw new Error();
    } catch (err: any) {
      setEvents(prev => prev.filter(e => e._id !== tempId));
      if (type === 'goal') {
        if (teamId === match?.homeTeam._id) setHomeScore(s => s - 1);
        else setAwayScore(s => s - 1);
      }
      toast.error('Failed to sync event with server');
    } finally {
      pendingRef.current = false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const eventToDelete = events.find(e => e._id === eventId);
    if (!eventToDelete) return;

    setEvents(prev => prev.filter(e => e._id !== eventId));
    if (eventToDelete.type === 'goal') {
      if (eventToDelete.teamId === match?.homeTeam._id) setHomeScore(s => s - 1);
      else setAwayScore(s => s - 1);
    }
    if (lastLoggedEventId === eventId) setLastLoggedEventId(null);

    try {
      const resp: any = await apiClient.delete(`/matches/${matchId}/events/${eventId}`);
      if (resp.success && resp.data.events) {
        setEvents(prev => {
          const serverEvents = resp.data.events;
          const temps = prev.filter(e => e._id.startsWith('temp_'));
          const merged = [...serverEvents, ...temps];
          const seen = new Set();
          return merged.filter(e => {
            if (seen.has(e._id)) return false;
            seen.add(e._id);
            return true;
          }).sort((a, b) => a.minute - b.minute);
        });
      } else if (!resp.success) throw new Error('Failed');
    } catch (err) {
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
      toast.error('Failed to delete event');
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    const isKnockout = match && match.stage !== 'league';
    if (newStatus === 'completed' && isKnockout && homeScore === awayScore) {
      setShowKnockoutResolve(true);
      return;
    }

    setIsStatusUpdating(true);
    setMatchStatus(newStatus);
    try {
      const resp: any = await apiClient.patch(`/matches/${matchId}/status`, { status: newStatus });
      if (resp.success) {
        toast.success(`Match marked as ${newStatus}`);
        onUpdate();
      } else throw new Error();
    } catch (err: any) {
      setMatchStatus(matchStatus);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleSetWinner = async (winnerId: string, pens?: { home: number, away: number }) => {
    setIsStatusUpdating(true);
    try {
      const payload = { winnerId, isExtraTime, shootoutScore: pens || undefined };
      const resp: any = await apiClient.patch(`/matches/${matchId}/winner`, payload);
      if (resp.success) {
        await apiClient.patch(`/matches/${matchId}/status`, { status: 'completed' });
        toast.success('Knockout match resolved and completed!');
        setShowKnockoutResolve(false);
        setShowPenaltyPanel(false);
        onUpdate();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set winner');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  if (isLoading || !match) return null;

  const filteredHomePlayers = homePlayers.filter(p => p.name.toLowerCase().includes(homeSearch.toLowerCase()));
  const filteredAwayPlayers = awayPlayers.filter(p => p.name.toLowerCase().includes(awaySearch.toLowerCase()));

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
                  <button 
                    disabled={isStatusUpdating}
                    onClick={() => handleStatusUpdate('live')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white transition-all whitespace-nowrap"
                  >
                    Start
                  </button>
                )}
                {matchStatus === 'live' && (
                  <button 
                    disabled={isStatusUpdating}
                    onClick={() => handleStatusUpdate('completed')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all whitespace-nowrap"
                  >
                    End Match
                  </button>
                )}
              </div>
              <button onClick={onClose} className="h-8 w-8 sm:h-11 sm:w-11 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 shrink-0">
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
                        onClick={() => { setEventMode(mode.type as any); setPendingGoalScorer(null); }}
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
                        <button onClick={() => setCurrentMinute(Math.max(0, currentMinute - 5))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black">-5</button>
                        <button onClick={() => setCurrentMinute(Math.max(0, currentMinute - 1))} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black">-1</button>
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
                        <button onClick={() => setCurrentMinute(currentMinute + 1)} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black">+1</button>
                        <button onClick={() => setCurrentMinute(currentMinute + 5)} className="h-8 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/5 text-neutral-500 hover:text-white border border-white/5 text-[9px] font-black">+5</button>
                     </div>
                  </div>

                  {/* 3. Settings */}
                  <div className="flex items-center justify-center lg:justify-end gap-6 sm:gap-8 ml-auto">
                     <button 
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
                         onClick={() => { handleDeleteEvent(lastLoggedEventId); setLastLoggedEventId(null); }}
                         className="flex flex-col items-center gap-1 group"
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
                           <button onClick={() => handleFinalizeGoal()} className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest">Skip</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                           {(homePlayers.some(p => p._id === pendingGoalScorer?._id) ? homePlayers : awayPlayers)
                             .filter(p => p._id !== pendingGoalScorer?._id)
                             .slice(0, 8)
                             .map(player => (
                             <button
                               key={player._id}
                               onClick={() => handleFinalizeGoal(player._id)}
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
                           onClick={() => handleAddEvent(p._id, match.homeTeam._id)}
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
                           onClick={() => handleAddEvent(p._id, match.awayTeam._id)}
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
                               <span className="text-[9px] sm:text-[10px] font-black text-blue-500 italic">{ev.minute}'</span>
                               <span className="h-0.5 w-0.5 rounded-full bg-neutral-700"></span>
                               <span className="text-[7px] sm:text-[8px] font-bold text-neutral-500 uppercase tracking-widest truncate">
                                 {ev.type.replace('_', ' ')}
                                 {ev.assistPlayerId && <span className="text-blue-400/60 ml-1">({ev.assistPlayerId.name.split(' ')[0]})</span>}
                               </span>
                            </div>
                         </div>
                         {!ev._id.startsWith('temp_') && (
                           <button 
                             onClick={() => handleDeleteEvent(ev._id)}
                             className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-red-500/20"
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
                     onClick={() => { setIsExtraTime(true); setCurrentMinute(90); setShowKnockoutResolve(false); }}
                     className="w-full p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-blue-600/5 transition-all text-left flex items-center justify-between group"
                   >
                      <div>
                         <p className="text-xs sm:text-sm font-black text-white uppercase">Extra Time</p>
                         <p className="text-[9px] sm:text-[10px] font-bold text-neutral-500 mt-1">Add 30 minutes to decide winner</p>
                      </div>
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-700 group-hover:text-blue-500 transition-colors" />
                   </button>

                   <button 
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
                        value={shootoutScore.away}
                        onChange={(e) => setShootoutScore({ ...shootoutScore, away: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-3xl sm:text-6xl font-black italic text-center text-white focus:outline-none focus:border-amber-500 transition-all font-outfit"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <button 
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
        {matchStatus === 'live' && match.stage !== 'league' && homeScore !== awayScore && (
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
