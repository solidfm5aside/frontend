'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { X, Plus, Trash2, Trophy, User, Clock, AlertTriangle } from 'lucide-react';

interface Player {
  _id: string;
  name: string;
}

interface MatchEvent {
  _id: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
  minute: number;
  playerId: { _id: string; name: string };
  assistPlayerId?: { _id: string; name: string };
  teamId: string;
}


interface Match {
  _id: string;
  homeTeam: { _id: string; name: string; logo?: string };
  awayTeam: { _id: string; name: string; logo?: string };
  homeScore: number;
  awayScore: number;
  status: string;
  events: MatchEvent[];
}

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
  
  // Form state
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card'>('goal');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedAssistId, setSelectedAssistId] = useState('');
  const [minute, setMinute] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const resp: any = await apiClient.get(`/matches`); // We'll filter or use a specific GET /matches/:id if it exists
      // Assuming we need a specific one, or just find it from the list for now
      // Better to check if we have a GET /matches/:id
      const m = resp.data.find((item: any) => item._id === matchId);
      if (m) {
        setMatch(m);
        setSelectedTeamId(m.homeTeam._id);
        fetchPlayers(m.homeTeam._id, setHomePlayers);
        fetchPlayers(m.awayTeam._id, setAwayPlayers);
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

  const handleAddEvent = async () => {
    if (!selectedPlayerId) return toast.error('Please select a player');
    setIsSubmitting(true);
    try {
      const payload = {
        type: eventType,
        teamId: selectedTeamId,
        playerId: selectedPlayerId,
        minute: minute,
        assistPlayerId: selectedAssistId || undefined
      };
      
      const resp: any = await apiClient.post(`/matches/${matchId}/events`, payload);
      if (resp.success) {
        toast.success(`${eventType.replace('_', ' ')} added!`);
        setMatch(resp.data);
        onUpdate();
        // Reset some form
        setSelectedPlayerId('');
        setSelectedAssistId('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const resp: any = await apiClient.delete(`/matches/${matchId}/events/${eventId}`);
      if (resp.success) {
        toast.success('Event removed');
        setMatch(resp.data);
        onUpdate();
      }
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  if (isLoading || !match) return null;

  const currentTeamPlayers = selectedTeamId === match.homeTeam._id ? homePlayers : awayPlayers;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md bg-black/60">
      <div className="w-full max-w-4xl max-h-[95vh] bg-[#0a0a0a] border border-white/10 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] shrink-0">
           <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-xl font-black italic uppercase tracking-tighter text-white truncate">Match Center</h2>
                <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 truncate">Live Event Logging</p>
              </div>
           </div>
           <button onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
             <X className="h-4 w-4 sm:h-5 sm:w-5" />
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] overflow-hidden flex-1 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          {/* Main Controls */}
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-8 overflow-y-auto">
            
            {/* Scoreboard Preview */}
            <div className="flex items-center justify-between gap-2 p-3 sm:p-6 rounded-[16px] sm:rounded-[24px] bg-gradient-to-r from-blue-600/5 to-transparent border border-blue-500/10">
               <div className="flex-1 text-center min-w-0">
                  <p className="text-[8px] sm:text-xs font-black uppercase text-neutral-500 mb-1 truncate">{match.homeTeam.name}</p>
                  <span className="text-xl sm:text-4xl font-black italic text-white leading-none">{match.homeScore}</span>
               </div>
               <div className="h-0.5 w-6 bg-white/10 rounded-full"></div>
               <div className="flex-1 text-center min-w-0">
                  <p className="text-[8px] sm:text-xs font-black uppercase text-neutral-500 mb-1 truncate">{match.awayTeam.name}</p>
                  <span className="text-xl sm:text-4xl font-black italic text-white leading-none">{match.awayScore}</span>
               </div>
            </div>

            {/* Event Form */}
            <div className="space-y-4 sm:space-y-6">
               <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                 {(['goal', 'yellow_card', 'red_card'] as const).map(type => (
                   <button
                     key={type}
                     onClick={() => setEventType(type)}
                     className={`py-2 sm:py-3 rounded-lg sm:rounded-xl text-[7px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${
                       eventType === type 
                       ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                       : 'bg-white/5 border-white/10 text-neutral-500 hover:text-white'
                     }`}
                   >
                     {type.replace('_', ' ')}
                   </button>
                 ))}
               </div>

               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[7px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-0.5">Minute</label>
                    <div className="relative">
                      <Clock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-neutral-500" />
                      <input 
                        type="number" 
                        value={minute}
                        onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
                        className="w-full h-10 sm:h-12 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl pl-9 sm:pl-12 pr-2 sm:pr-4 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[7px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-0.5">Team</label>
                    <select 
                      value={selectedTeamId}
                      onChange={(e) => {
                        setSelectedTeamId(e.target.value);
                        setSelectedPlayerId('');
                        setSelectedAssistId('');
                      }}
                      className="w-full h-10 sm:h-12 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer [&>option]:bg-neutral-900 [&>option]:text-white"
                    >
                      <option value={match.homeTeam._id} className="bg-neutral-900 text-white">Home ({match.homeTeam.name.charAt(0)})</option>
                      <option value={match.awayTeam._id} className="bg-neutral-900 text-white">Away ({match.awayTeam.name.charAt(0)})</option>
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[7px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-0.5">Select Player</label>
                    <select 
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                      className="w-full h-10 sm:h-12 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold cursor-pointer [&>option]:bg-neutral-900 [&>option]:text-white"
                    >
                      <option value="" className="bg-neutral-900 text-neutral-500 italic text-[10px]">Select Scor/Carded...</option>
                      {currentTeamPlayers.map(p => (
                        <option key={p._id} value={p._id} className="bg-neutral-900 text-white">{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {eventType === 'goal' ? (
                   <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[7px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-0.5">Assist (Optional)</label>
                      <select 
                        value={selectedAssistId}
                        onChange={(e) => setSelectedAssistId(e.target.value)}
                        className="w-full h-10 sm:h-12 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold cursor-pointer [&>option]:bg-neutral-900 [&>option]:text-white"
                      >
                        <option value="" className="bg-neutral-900 text-neutral-500 italic text-[10px]">No assist</option>
                        {currentTeamPlayers.filter(p => p._id !== selectedPlayerId).map(p => (
                          <option key={p._id} value={p._id} className="bg-neutral-900 text-white">{p.name}</option>
                        ))}
                      </select>
                   </div>
                  ) : <div className="hidden sm:block"></div>}
               </div>

               <button
                 disabled={isSubmitting || !selectedPlayerId}
                 onClick={handleAddEvent}
                 className="w-full h-12 sm:h-16 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] italic transition-all shadow-xl shadow-blue-600/20"
               >
                 {isSubmitting ? (
                   <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   <>
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Log {eventType.replace('_', ' ')}
                   </>
                 )}
               </button>
            </div>
          </div>

          {/* Event Log Side Panel */}
          <div className="bg-white/[0.01] flex flex-col overflow-hidden min-h-[150px] lg:min-h-0">
             <div className="p-3 sm:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500">Live Timeline</h3>
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-blue-500">{match.events?.length || 0} Events</span>
             </div>
             <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
                {match.events?.length === 0 ? (
                  <div className="py-6 sm:py-12 text-center text-[7px] sm:text-[10px] font-black text-neutral-700 uppercase tracking-widest italic">
                    No events recorded yet.
                  </div>
                ) : (
                  match.events.sort((a,b) => b.minute - a.minute).map((ev) => (
                    <div key={ev._id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/5 group relative">
                        <div className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 rounded-md sm:rounded-lg flex items-center justify-center ${
                          ev.type === 'goal' ? 'bg-blue-600/10' : 
                          ev.type === 'yellow_card' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                        }`}>
                           {ev.type === 'goal' && <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />}
                           {ev.type === 'yellow_card' && <div className="h-3 w-2 sm:h-4 sm:w-3 bg-yellow-500 rounded-[2px]"></div>}
                           {ev.type === 'red_card' && <div className="h-3 w-2 sm:h-4 sm:w-3 bg-red-500 rounded-[2px]"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[9px] sm:text-[11px] font-black text-white truncate">
                             {ev.playerId?.name}
                           </p>
                           <p className="text-[6px] sm:text-[8px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">
                             {ev.minute}' • {ev.type.replace('_', ' ')}
                             {ev.assistPlayerId && ` (ast: ${ev.assistPlayerId.name})`}
                           </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteEvent(ev._id)}
                          className="h-6 w-6 sm:h-8 sm:w-8 rounded-md sm:rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        >
                           <Trash2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                        </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
