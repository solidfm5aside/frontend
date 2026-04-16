'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { User, Medal } from 'lucide-react';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  currentStage: string;
}

interface TeamStats {
  teamId: {
    _id: string;
    name: string;
    logo?: string;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}

interface Scorer {
  playerId: {
    _id: string;
    name: string;
  };
  teamId: {
    _id: string;
    name: string;
    logo?: string;
  };
  goals: number;
  assists: number;
}

type TabType = 'table' | 'statistics';

export default function StandingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('table');
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<TeamStats[]>([]);
  const [topScorers, setTopScorers] = useState<Scorer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [standingsRes, scorersRes]: any = await Promise.all([
          apiClient.get('/standings'),
          apiClient.get('/standings/top-scorers')
        ]);

        if (standingsRes.success && standingsRes.data.length > 0) {
          setActiveTournament(standingsRes.data[0].tournamentId);
          setStandings(standingsRes.data[0].stats);
        }

        if (scorersRes.success) {
          setTopScorers(scorersRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useRevealOnScroll([standings, topScorers, isLoading, activeTab]);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col bg-[#0b161c] font-sans text-white min-h-screen">
      {/* Hero Header - Unified with the Flashscore look */}
      <section className="relative py-12 md:py-20 px-6 border-b border-white/5 bg-[#00141e]">
        <div className="container mx-auto max-w-7xl relative z-10 animate-reveal">
           <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-4">
             {activeTournament?.name || 'Tournament'} <span className="text-neutral-500">Standings</span>
           </h1>
           <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-neutral-400">
                Season {activeTournament?.season || '2024'} • Live Ranking
              </span>
           </div>
        </div>
      </section>

      {/* Navigation Tabs - High Density */}
      <section className="sticky top-[72px] z-40 bg-[#00141e]/90 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto max-w-7xl px-4 flex justify-start">
           <button
             onClick={() => setActiveTab('table')}
             className={`px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border-b-2 transition-all ${
               activeTab === 'table' ? 'border-blue-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
             }`}
           >
             League Table
           </button>
           <button
             onClick={() => setActiveTab('statistics')}
             className={`px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border-b-2 transition-all ${
               activeTab === 'statistics' ? 'border-blue-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
             }`}
           >
             Player Statistics
           </button>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="flex-1">
        <div className="container mx-auto max-w-7xl">
          
          {activeTab === 'table' ? (
            /* FLASH SCORE TABLE VIEW */
            <div className="animate-reveal w-full overflow-hidden">
              <div className="w-full">
                {/* Table Header - Responsive Grid */}
                <div className="grid grid-cols-[35px_1fr_40px_55px_45px] md:grid-cols-[50px_1fr_60px_45px_45px_45px_80px_60px_60px] gap-0 bg-[#00141e] px-4 py-3 border-b border-white/5">
                   <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1"># <span className="text-[8px] opacity-30">▲</span></span>
                   <span className="text-[10px] font-bold text-neutral-500 uppercase">Team</span>
                   <span className="text-[10px] font-bold text-neutral-500 uppercase text-center">MP</span>
                   <span className="hidden md:block text-[10px] font-bold text-neutral-500 uppercase text-center">W</span>
                   <span className="hidden md:block text-[10px] font-bold text-neutral-500 uppercase text-center">D</span>
                   <span className="hidden md:block text-[10px] font-bold text-neutral-500 uppercase text-center">L</span>
                   <span className="text-[10px] font-bold text-neutral-500 uppercase text-center">G</span>
                   <span className="hidden md:block text-[10px] font-bold text-neutral-500 uppercase text-center">GD</span>
                   <span className="text-[10px] font-bold text-neutral-500 uppercase text-center">PTS</span>
                </div>

                {/* Table Rows */}
                {standings.length === 0 ? (
                  <div className="py-20 text-center opacity-30 italic text-sm">No standings data found.</div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {standings.map((stat, idx) => (
                      <div 
                        key={stat.teamId._id} 
                        className={`grid grid-cols-[35px_1fr_40px_55px_45px] md:grid-cols-[50px_1fr_60px_45px_45px_45px_80px_60px_60px] gap-0 px-4 py-3.5 items-center transition-colors hover:bg-white/[0.04] ${idx % 2 === 0 ? 'bg-[#0b161c]' : 'bg-[#0e1b23]'}`}
                      >
                         {/* Rank Badge */}
                         <div className="flex justify-start">
                            <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-[#0073e6] flex items-center justify-center shadow-lg">
                               <span className="text-[9px] md:text-[10px] font-black">{idx + 1}.</span>
                            </div>
                         </div>

                         {/* Team Info */}
                         <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <TeamAvatar name={stat.teamId.name} logo={stat.teamId.logo} size="xs" />
                            <span className="text-xs md:text-sm font-bold text-white truncate">{stat.teamId.name}</span>
                         </div>

                         {/* Stats Columns */}
                         <span className="text-[11px] md:text-xs font-semibold text-center text-neutral-300">{stat.played}</span>
                         <span className="hidden md:block text-xs font-semibold text-center text-neutral-300">{stat.won}</span>
                         <span className="hidden md:block text-xs font-semibold text-center text-neutral-300">{stat.drawn}</span>
                         <span className="hidden md:block text-xs font-semibold text-center text-neutral-300">{stat.lost}</span>
                         <span className="text-[11px] md:text-xs font-semibold text-center text-neutral-300">{stat.goalsFor}:{stat.goalsAgainst}</span>
                         <span className="hidden md:block text-xs font-semibold text-center text-neutral-300">{stat.goalDifference}</span>
                         <span className="text-xs md:text-sm font-black text-center text-white">{stat.points}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PLAYER STATISTICS VIEW - FLASH SCORE STYLE */
            <div className="animate-reveal max-w-4xl mx-auto py-10 px-4">
               <div className="bg-[#00141e] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                  {/* Stats Header */}
                  <div className="grid grid-cols-[50px_1fr_60px_60px] md:grid-cols-[50px_1fr_80px_80px] gap-0 bg-[#00141e] px-4 md:px-6 py-4 border-b border-white/5">
                     <span className="text-[10px] font-bold text-neutral-500">#</span>
                     <span className="text-[10px] font-bold text-neutral-500 uppercase text-left pl-14">Player / Team</span>
                     <span className="text-[10px] font-bold text-neutral-500 uppercase text-center">Goals</span>
                     <span className="text-[10px] font-bold text-neutral-500 uppercase text-center">Assists</span>
                  </div>

                  {/* Stats Rows */}
                  {topScorers.length === 0 ? (
                    <div className="py-20 text-center opacity-30 italic text-sm">No player statistics available.</div>
                  ) : (
                    <div className="divide-y divide-white/[0.03]">
                       {topScorers.map((player, idx) => (
                          <div 
                            key={idx} 
                            className={`grid grid-cols-[50px_1fr_60px_60px] md:grid-cols-[50px_1fr_80px_80px] gap-0 px-4 md:px-6 py-4 items-center transition-colors hover:bg-white/[0.04] ${idx % 2 === 0 ? 'bg-[#0b161c]' : 'bg-[#0e1b23]'}`}
                          >
                             <div className="flex justify-start">
                                <div className="h-6 w-6 rounded-full bg-[#0073e6] flex items-center justify-center">
                                   <span className="text-[10px] font-black">{idx + 1}.</span>
                                </div>
                             </div>

                             <div className="flex items-center gap-4 pl-0 min-w-0">
                                <div className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-neutral-500">
                                   <User className="h-4 w-4 md:h-5 md:w-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-xs md:text-sm font-bold text-white truncate">{player.playerId.name}</span>
                                   <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                      <TeamAvatar name={player.teamId.name} logo={player.teamId.logo} size="xs" />
                                      <span className="text-[8px] md:text-[9px] font-bold text-neutral-500 uppercase tracking-tight truncate">{player.teamId.name}</span>
                                   </div>
                                </div>
                             </div>

                             <span className="text-base md:text-xl font-black italic text-center text-blue-500">{player.goals}</span>
                             <span className="text-base md:text-xl font-black italic text-center text-neutral-400">{player.assists}</span>
                          </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </section>

      {/* Legend Footer - Simplified */}
      <section className="py-12 bg-[#00141e]/50 border-t border-white/5">
         <div className="container mx-auto max-w-7xl px-6 flex flex-wrap gap-8 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <div className="flex items-center gap-3">
               <div className="h-3 w-3 rounded-full bg-blue-600"></div>
               <span>Promotion Zone</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="h-3 w-3 rounded-full bg-neutral-700"></div>
               <span>Mid-Table</span>
            </div>
         </div>
      </section>
    </div>
  );
}
