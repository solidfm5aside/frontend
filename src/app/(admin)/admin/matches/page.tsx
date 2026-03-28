'use client';

import { useEffect, useState, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import MatchControllerModal from '@/components/admin/MatchControllerModal';
import EditMatchModal from '@/components/admin/EditMatchModal';


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
  date: string;
  venue?: string;
}

type StatusFilter = 'all' | 'scheduled' | 'live' | 'completed';

const STATUS_STYLES: Record<string, string> = {
  live:      'bg-red-500 text-white animate-pulse',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  scheduled: 'bg-white/5 text-neutral-500 border border-white/10',
  cancelled: 'bg-neutral-800 text-neutral-600 border border-white/5',
};

function formatMatchDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getDayKey(dateStr: string) {
  return new Date(dateStr).toISOString().split('T')[0]; // YYYY-MM-DD
}

export default function MatchesManagementPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dayPage, setDayPage] = useState(0); 
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [editMatchId, setEditMatchId] = useState<string | null>(null);


  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter === 'all' ? '/matches' : `/matches?status=${statusFilter}`;
      const response: any = await apiClient.get(url);
      if (response.success) {
        setMatches(response.data);
        setDayPage(0);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, [statusFilter]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response: any = await apiClient.patch(`/matches/${id}/status`, { status });
      if (response.success) {
        setMatches(prev => prev.map(m => m._id === id ? { ...m, status: status as any } : m));
        toast.success(`Match updated to ${status}`);
      }
    } catch (error) {
      toast.error('Failed to update match status');
    }
  };

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
  const totalDays = sortedDays.length;
  const currentDay = sortedDays[dayPage] ?? null;
  const currentDayMatches = currentDay ? matchesByDay[currentDay] : [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
            Matches.
          </h1>
          <p className="mt-1.5 text-[9px] sm:text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">
            Command Central Control
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-x-auto">
          {(['all', 'scheduled', 'live', 'completed'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                statusFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {totalDays === 0 ? (
        <div className="py-32 text-center rounded-[32px] border border-white/5 bg-white/[0.01]">
          <span className="text-3xl block mb-4 opacity-30">🔍</span>
          <p className="text-[9px] sm:text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] italic">
            No matches found in this category
          </p>
        </div>
      ) : (
        <>
          {/* Day Pagination Header */}
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.02] border border-white/5 px-4 sm:px-6 py-4">
            <button
              disabled={dayPage === 0}
              onClick={() => setDayPage(p => p - 1)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center min-w-0">
              <p className="text-xs sm:text-sm font-black italic text-white uppercase tracking-tight truncate">
                {currentDay ? formatMatchDay(currentDay + 'T00:00:00') : '—'}
              </p>
              <p className="text-[9px] sm:text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">
                Matchday {dayPage + 1} of {totalDays} · {currentDayMatches.length} fixture{currentDayMatches.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              disabled={dayPage === totalDays - 1}
              onClick={() => setDayPage(p => p + 1)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Day Jump Dots */}
          {totalDays > 1 && (
            <div className="flex justify-center gap-1.5 flex-wrap">
              {sortedDays.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDayPage(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === dayPage ? 'w-6 bg-blue-500' : 'w-2 bg-white/10 hover:bg-white/25'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Match Cards for Current Day */}
          <div className="space-y-3 sm:space-y-4">
            {currentDayMatches.map((match) => (
              <div
                key={match._id}
                className="group rounded-2xl sm:rounded-[28px] border border-white/5 bg-white/[0.01] p-4 sm:p-5 backdrop-blur-3xl transition-all hover:bg-white/[0.03] hover:border-blue-500/20"
              >
                {/* Top row: Status + Time */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[match.status] ?? ''}`}>
                    {match.status}
                  </span>
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(match.date)}
                  </div>
                </div>

                {/* Teams + Score — 3 column grid */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  {/* Home */}
                  <div className="text-right">
                    <p className="text-[11px] sm:text-sm md:text-base font-black italic text-white uppercase leading-tight break-words">
                      {match.homeTeam?.name ?? 'TBD'}
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">Home</p>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-xl font-black italic text-blue-500">
                      {match.homeScore}
                    </div>
                    <span className="text-[8px] font-black text-neutral-700 uppercase">–</span>
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-xl font-black italic text-blue-500">
                      {match.awayScore}
                    </div>
                  </div>

                  {/* Away */}
                  <div className="text-left">
                    <p className="text-[11px] sm:text-sm md:text-base font-black italic text-white uppercase leading-tight break-words">
                      {match.awayTeam?.name ?? 'TBD'}
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">Away</p>
                  </div>
                </div>

                {/* Bottom row: Venue + Action */}
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

                  <div className="flex items-center gap-2 shrink-0">
                    {match.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => setEditMatchId(match._id)}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                        >
                          🖊 Edit
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(match._id, 'live')}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 whitespace-nowrap"
                        >
                          🚀 Start
                        </button>
                      </>
                    )}
                    {match.status === 'live' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(match._id, 'completed')}
                          className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                        >
                          ✓ Finish
                        </button>
                          <button 
                            onClick={() => setSelectedMatchId(match._id)}
                            className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                          >
                            + Event
                          </button>
                        </>
                      )}
                      {(match.status === 'completed' || match.status === 'live') && (
                         <button 
                           onClick={() => setSelectedMatchId(match._id)}
                           className="h-7 sm:h-8 px-2 rounded-lg bg-white/5 text-neutral-500 hover:text-white transition-all"
                         >
                           ⚙
                         </button>
                      )}

                    {match.status === 'completed' && (
                      <span className="text-[8px] sm:text-[9px] font-black text-neutral-700 uppercase tracking-widest italic">Finalized</span>
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
          onUpdate={fetchMatches}
        />
      )}

      {editMatchId && (
        <EditMatchModal
          matchId={editMatchId}
          initialDate={matches.find(m => m._id === editMatchId)?.date || ''}
          initialVenue={matches.find(m => m._id === editMatchId)?.venue || ''}
          onClose={() => setEditMatchId(null)}
          onUpdate={fetchMatches}
        />
      )}
    </div>
  );
}

