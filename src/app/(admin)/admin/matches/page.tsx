'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

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

export default function MatchesManagementPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter === 'all' ? '/matches' : `/matches?status=${statusFilter}`;
      const response: any = await apiClient.get(url);
      if (response.success) {
        setMatches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [statusFilter]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response: any = await apiClient.patch(`/matches/${id}/status`, { status });
      if (response.success) {
        setMatches(matches.map(m => m._id === id ? { ...m, status: status as any } : m));
        toast.success(`Match status updated to ${status}`);
      }
    } catch (error) {
      toast.error('Failed to update match status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Matches.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Command Central Control</p>
        </div>
        
        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-x-auto max-w-full">
           {['all', 'scheduled', 'live', 'completed'].map((f) => (
             <button
               key={f}
               onClick={() => setStatusFilter(f)}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 statusFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'
               }`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {matches.length > 0 ? matches.map((match) => (
          <div key={match._id} className="group relative rounded-[40px] border border-white/5 bg-white/[0.01] p-8 md:p-12 backdrop-blur-3xl transition-all hover:bg-white/[0.03] hover:border-blue-500/20">
             <div className="absolute top-8 right-12">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  match.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                  match.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-white/5 text-neutral-500 border border-white/10'
                }`}>
                  {match.status}
                </span>
             </div>

             <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-6 text-center md:text-right">
                   <div className="space-y-1">
                      <p className="text-2xl font-black italic text-white tracking-tighter uppercase">{match.homeTeam.name}</p>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">Home Squad</p>
                   </div>
                   <div className="h-16 w-16 md:h-20 md:w-20 rounded-[30px] bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black italic text-blue-500 shadow-2xl">
                      {match.homeScore}
                   </div>
                </div>

                <div className="px-10 flex flex-col items-center">
                    <div className="h-0.5 w-12 bg-white/10 mb-4"></div>
                    <span className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.5em] italic">VERSUS</span>
                    <div className="h-0.5 w-12 bg-white/10 mt-4"></div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row-reverse items-center justify-end gap-6 text-center md:text-left">
                   <div className="space-y-1">
                      <p className="text-2xl font-black italic text-white tracking-tighter uppercase">{match.awayTeam.name}</p>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">Away Squad</p>
                   </div>
                   <div className="h-16 w-16 md:h-20 md:w-20 rounded-[30px] bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black italic text-blue-500 shadow-2xl">
                      {match.awayScore}
                   </div>
                </div>
             </div>

             <div className="mt-12 pt-10 border-t border-white/5 flex flex-wrap items-center justify-center gap-6">
                {match.status === 'scheduled' && (
                  <button 
                    onClick={() => handleStatusUpdate(match._id, 'live')}
                    className="h-14 px-10 rounded-2xl bg-red-600 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 hover:scale-105 transition-all shadow-xl shadow-red-600/20"
                  >
                    🚀 Start Match
                  </button>
                )}
                
                {match.status === 'live' && (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(match._id, 'completed')}
                      className="h-14 px-10 rounded-2xl bg-emerald-600 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 hover:scale-105 transition-all shadow-xl shadow-emerald-600/20"
                    >
                      ✓ Finish Match
                    </button>
                    {/* Event buttons could go here */}
                    <button className="h-14 px-8 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                       Add Match Event
                    </button>
                  </>
                )}

                {match.status === 'completed' && (
                   <p className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.4em] italic leading-loose text-center">
                     Match finalized. Result synchronized with standings and player stats.
                   </p>
                )}
             </div>
             
             <div className="absolute bottom-8 left-12 flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <span className="text-[10px]">📅</span>
                   <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{new Date(match.date).toLocaleDateString()}</span>
                </div>
                {match.venue && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">🏟️</span>
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{match.venue}</span>
                  </div>
                )}
             </div>
          </div>
        )) : (
          <div className="py-40 text-center rounded-[40px] border border-white/5 bg-white/[0.01]">
             <span className="text-4xl block mb-6 opacity-30">🔍</span>
             <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] italic">No matches scheduled in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
