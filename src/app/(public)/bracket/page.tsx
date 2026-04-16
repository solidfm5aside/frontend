'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import KnockoutBracket from '@/components/KnockoutBracket';
import { Trophy, ChevronDown } from 'lucide-react';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  currentStage: string;
}

export default function BracketPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const resp: any = await apiClient.get('/tournaments');
      if (resp.success) {
        setTournaments(resp.data);
        // Default to the first one that is ongoing or the latest
        const ongoing = resp.data.find((t: any) => t.status === 'ongoing');
        if (ongoing) setSelectedId(ongoing._id);
        else if (resp.data.length > 0) setSelectedId(resp.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTournament = tournaments.find(t => t._id === selectedId);

  if (isLoading) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 font-outfit animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-white/5 pb-12">
        <div>
           <div className="flex items-center gap-3 mb-4">
              <div className="h-1 bg-blue-600 w-12 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Live Bracket</span>
           </div>
           <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none">
             Knockout <br/> <span className="text-blue-600">Roadmap.</span>
           </h1>
        </div>

        <div className="relative group shrink-0">
           <select 
             value={selectedId}
             onChange={(e) => setSelectedId(e.target.value)}
             className="appearance-none bg-white/5 border border-white/10 rounded-2xl px-8 py-5 pr-14 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer min-w-[280px]"
           >
             {tournaments.map(t => (
               <option key={t._id} value={t._id} className="bg-black text-white">
                 {t.name} (S{t.season})
               </option>
             ))}
           </select>
           <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-hover:text-blue-500 transition-colors pointer-events-none" />
        </div>
      </div>

      {selectedId && (
        <KnockoutBracket tournamentId={selectedId} />
      )}

      <div className="mt-20 p-8 rounded-[40px] bg-gradient-to-br from-blue-600/5 to-transparent border border-white/5 relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="max-w-md">
               <h4 className="text-xl font-black italic tracking-tighter text-white uppercase italic mb-2">Tournament Rules</h4>
               <p className="text-[10px] font-bold text-neutral-500 leading-relaxed uppercase tracking-wider">
                 All matches after the league stage are single-leg formats. 
                 In case of a draw at 90 minutes, Extra Time (30 mins) will be played. 
                 If still level, a Penalty Shootout decides the winner.
               </p>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-center">
                  <div className="text-2xl font-black text-white italic">16</div>
                  <div className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Qualifiers</div>
               </div>
               <div className="h-8 w-px bg-white/5"></div>
               <div className="text-center">
                  <div className="text-2xl font-black text-white italic">1</div>
                  <div className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Champion</div>
               </div>
               <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/30 ml-4">
                  <Trophy className="h-7 w-7 text-white" />
               </div>
            </div>
         </div>
         <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-blue-600/5 rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
}
