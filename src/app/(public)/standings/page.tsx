'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';

export default function StandingsPage() {
  const [activeTab, setActiveTab] = useState<'league' | 'players'>('league');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [standings, setStandings] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [liveMatchTeamIds, setLiveMatchTeamIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response: any = await apiClient.get('/tournaments');
        if (response.success && response.data.length > 0) {
          setTournaments(response.data);
          setSelectedTournament(response.data[0]._id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.tournament-selector')) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!selectedTournament) return;
    
    const fetchData = async (isAutoRefresh = false) => {
      // Skip background refreshes if tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && isAutoRefresh) {
        return;
      }

      if (!isAutoRefresh) setIsLoading(true);
      
      try {
        // Fetch Standings
        const standingsRes: any = await apiClient.get(`/standings/${selectedTournament}`);
        if (standingsRes.success) {
          setStandings(standingsRes.data);
        }

        // Fetch Top Scorers
        const scorersRes: any = await apiClient.get(`/standings/${selectedTournament}/top-scorers`);
        if (scorersRes.success) {
          setPlayerStats(scorersRes.data);
        }

        // Fetch Live Matches to identify "Live" teams
        const matchesRes: any = await apiClient.get('/matches');
        if (matchesRes.success) {
          const liveTeams = matchesRes.data
            .filter((m: any) => m.status === 'live' && m.tournamentId === selectedTournament)
            .reduce((acc: string[], m: any) => {
              const ids = [];
              if (m.homeTeam?._id) ids.push(m.homeTeam._id);
              if (m.awayTeam?._id) ids.push(m.awayTeam._id);
              return [...acc, ...ids];
            }, []);
          setLiveMatchTeamIds(liveTeams);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (!isAutoRefresh) setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds if there are live matches, otherwise every 2 minutes
    const intervalTime = liveMatchTeamIds.length > 0 ? 30000 : 120000;
    const interval = setInterval(() => fetchData(true), intervalTime);
    
    return () => clearInterval(interval);
  }, [selectedTournament, liveMatchTeamIds.length > 0]);

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      {/* Hero Header */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 animate-reveal flex flex-col items-center">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6 text-center">Tournament Standings</h1>
           <h2 className="text-5xl md:text-9xl font-black italic tracking-tighter uppercase mb-12 leading-tight text-center">Table <span className="text-neutral-800">& Stats.</span></h2>
           
           {tournaments.length > 0 && (
             <div className="relative z-50 group tournament-selector">
               <button
                 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                 className="flex items-center gap-6 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-blue-500/30 hover:bg-white/[0.08] transition-all group shadow-2xl"
               >
                 <div className="text-left">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Select Edition</p>
                   <h3 className="text-sm md:text-xl font-black uppercase tracking-widest text-[#FFD700]">
                     {tournaments.find(t => t._id === selectedTournament)?.name || 'Select Tournament'} • Season {tournaments.find(t => t._id === selectedTournament)?.season || ''}
                   </h3>
                 </div>
                 <div className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-500' : 'text-neutral-500'}`}>
                   <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                 </div>
               </button>

               {isDropdownOpen && (
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 md:w-96 bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-reveal z-50">
                    <div className="max-h-60 overflow-y-auto scrollbar-hide">
                      {tournaments.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => {
                            setSelectedTournament(t._id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-8 py-5 text-left transition-all border-b border-white/5 last:border-none flex items-center justify-between group/item ${
                            selectedTournament === t._id 
                              ? 'bg-blue-600/10' 
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div>
                            <p className="text-xs md:text-base font-black uppercase tracking-widest text-white group-hover/item:text-[#FFD700] transition-colors">
                              {t.name}
                            </p>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                              Season {t.season}
                            </p>
                          </div>
                          {selectedTournament === t._id && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                          )}
                        </button>
                      ))}
                    </div>
                 </div>
               )}
             </div>
           )}
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="sticky top-[80px] z-40 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 flex justify-center gap-10 py-5">
           {[
             { id: 'league', label: 'League Table' },
             { id: 'players', label: 'Player Stats' }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] transition-all relative py-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-neutral-500 hover:text-white'}`}
             >
               {tab.label}
               {activeTab === tab.id && <span className="absolute -bottom-1 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.6)]"></span>}
             </button>
           ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full"></div>

        <div className="container mx-auto max-w-7xl reveal-on-scroll">
          
          {activeTab === 'league' && (
            <>
              <div className="rounded-[15px] md:rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-xl animate-reveal shadow-2xl overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed md:table-auto">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr>
                      <th className="py-3 md:py-10 px-1 md:px-10 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 w-[8%] md:w-auto text-center">Pos</th>
                      <th className="py-3 md:py-10 px-1 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 w-[42%] md:w-auto">Team</th>
                      <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto">P</th>
                      <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto">W</th>
                      <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto">D</th>
                      <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto">L</th>
                      <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[9%] md:w-auto">GD</th>
                      <th className="py-3 md:py-10 px-1 md:px-10 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-blue-500 text-center w-[13%] md:w-auto">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 uppercase">
                    {isLoading ? (
                       <tr>
                          <td colSpan={8} className="py-20 text-center">
                             <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
                          </td>
                       </tr>
                    ) : standings.length > 0 ? standings.map((team, idx) => {
                      const pos = idx + 1;
                      const zone = pos <= 8 ? 'qualify' : pos <= 24 ? 'playoff' : 'eliminated';
                      const zoneBar = zone === 'qualify' ? 'bg-blue-500' : zone === 'playoff' ? 'bg-yellow-400' : 'bg-red-500';
                      return (
                        <tr key={team._id} className="group transition-colors hover:bg-white/[0.03] relative">
                          <td className="py-3 md:py-10 px-1 md:px-10 font-black italic text-[10px] md:text-2xl text-neutral-700 group-hover:text-white transition-colors text-center relative">
                            <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${zoneBar} opacity-90`}></span>
                            {pos.toString().padStart(2, '0')}
                          </td>
                          <td className="py-3 md:py-10 px-1">
                            <div className="flex items-center gap-1.5 md:gap-6 min-w-0">
                              <div className="h-5 w-5 md:h-12 md:w-12 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-[7px] md:text-base text-neutral-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                                 {team.teamId?.name?.charAt(0) || '?'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] md:text-xl font-bold text-white tracking-tight group-hover:text-blue-500 transition-colors uppercase truncate">
                                   {team.teamId?.name || 'Deleted Team'}
                                </span>
                                {team.teamId && liveMatchTeamIds.includes(team.teamId._id) && (
                                   <span className="flex items-center gap-1 text-[6px] md:text-[8px] font-black text-red-500 animate-pulse mt-1">
                                      <span className="h-1 w-1 rounded-full bg-red-500"></span> LIVE NOW
                                   </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-400 group-hover:text-white">{team.played}</td>
                          <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-500 group-hover:text-white">{team.won}</td>
                          <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-500 group-hover:text-white">{team.drawn}</td>
                          <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-500 group-hover:text-white">{team.lost}</td>
                          <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-400 group-hover:text-white">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                          <td className="py-3 md:py-10 px-1 md:px-10 text-center text-[11px] md:text-3xl font-black italic text-white group-hover:text-blue-500 transition-colors">{team.points}</td>
                        </tr>
                      );
                    }) : (
                       <tr>
                          <td colSpan={8} className="py-20 text-center">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">No standings available for this season.</p>
                          </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Qualification Legend - Flashscore style */}
              {standings.length > 0 && (
                <div className="mt-4 mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 px-3 md:px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-[3px] rounded-full bg-blue-500 inline-block"></span>
                    <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-neutral-500">Qualify Directly — Round of 16</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-[3px] rounded-full bg-yellow-400 inline-block"></span>
                    <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-neutral-500">Playoff Zone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-[3px] rounded-full bg-red-500 inline-block"></span>
                    <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-neutral-500">Eliminated</span>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'players' && (
            <div className="rounded-[15px] md:rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-xl animate-reveal shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed md:table-auto">
                <thead className="border-b border-white/10 bg-white/[0.02]">
                  <tr>
                    <th className="py-3 md:py-10 px-1 md:px-10 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 w-[8%] md:w-auto text-center">RK</th>
                    <th className="py-3 md:py-10 px-1 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 w-[40%] md:w-auto">Player</th>
                    <th className="py-3 md:py-10 px-1 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 w-[30%] md:w-auto">Team</th>
                    <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto text-blue-500">G</th>
                    <th className="py-3 md:py-10 px-0.5 md:px-6 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[7%] md:w-auto">A</th>
                    <th className="py-3 md:py-10 px-1 md:px-10 text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.4em] text-neutral-500 text-center w-[8%] md:w-auto">T</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 uppercase">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
                      </td>
                    </tr>
                  ) : playerStats.length > 0 ? playerStats.map((stat, idx) => (
                    <tr key={stat._id} className="group transition-colors hover:bg-white/[0.03]">
                      <td className="py-3 md:py-10 px-1 md:px-10 font-black italic text-[10px] md:text-2xl text-neutral-700 group-hover:text-white transition-colors text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="py-3 md:py-10 px-1">
                        <div className="flex items-center gap-1.5 md:gap-6 min-w-0">
                          <div className="h-5 w-5 md:h-12 md:w-12 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-[7px] md:text-base text-neutral-600 group-hover:bg-yellow-500 group-hover:text-black transition-all shrink-0">
                             {stat.playerId.firstName.charAt(0)}{stat.playerId.lastName.charAt(0)}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-[10px] md:text-xl font-bold text-white tracking-tight group-hover:text-yellow-500 transition-colors uppercase truncate">
                               {stat.playerId.firstName} {stat.playerId.lastName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:py-10 px-1">
                         <span className="text-[8px] md:text-base font-bold text-neutral-400 truncate block">
                            {stat.teamId.name}
                         </span>
                      </td>
                      <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-black text-[11px] md:text-2xl text-white group-hover:text-blue-500">{stat.goals}</td>
                      <td className="py-3 md:py-10 px-0.5 md:px-6 text-center font-bold text-[9px] md:text-base text-neutral-500 group-hover:text-white">{stat.assists}</td>
                      <td className="py-3 md:py-10 px-1 md:px-10 text-center text-[10px] md:text-xl font-black italic text-neutral-500 group-hover:text-white">{stat.goals + stat.assists}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-32 px-6 text-center">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white/[0.02] border border-white/5 mb-8 text-3xl">📊</div>
                        <h3 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Data Pending</h3>
                        <p className="max-w-md mx-auto text-sm md:text-base text-neutral-500 font-medium leading-relaxed">Player statistics aggregation is currently processing. Individual top scorer and assist metrics will be synced shortly.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-20 pt-10 border-t border-white/5 text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-600 leading-relaxed italic border-b border-white/5 pb-10 mb-10">
                P=Played, W=Won, D=Draw, L=Loss, GD=Goal Difference, G=Goals, A=Assists, T=Total
             </p>
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-800">
                Official Statistics • CoJude Solid FM
             </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 md:py-40 bg-neutral-950 border-t border-white/5">
         <div className="container mx-auto max-w-7xl text-center reveal-on-scroll px-6">
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-10 leading-tight">Make your name legendary.</h2>
            <Link href="/register-team" className="inline-flex h-16 md:h-20 items-center justify-center rounded-3xl bg-blue-600 px-10 md:px-12 text-lg md:text-xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/20">
               Register Team Now
            </Link>
         </div>
      </section>
    </div>
  );
}
