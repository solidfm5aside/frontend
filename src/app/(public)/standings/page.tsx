'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StandingsPage() {
  const [activeTab, setActiveTab] = useState<'league' | 'players'>('league');

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

  const teams = [
    { pos: 1, name: 'Coal City SC', p: 6, w: 4, d: 2, l: 0, gd: '+8', pts: 14 },
    { pos: 2, name: 'Nsukka Rangers', p: 6, w: 4, d: 1, l: 1, gd: '+5', pts: 13 },
    { pos: 3, name: 'Uwani Warriors', p: 6, w: 3, d: 2, l: 1, gd: '+3', pts: 11 },
    { pos: 4, name: 'Agbani Stars', p: 6, w: 3, d: 0, l: 3, gd: '0', pts: 9 },
    { pos: 5, name: 'Trans Ekulu FC', p: 6, w: 2, d: 1, l: 3, gd: '-2', pts: 7 },
    { pos: 6, name: 'New Haven', p: 6, w: 1, d: 2, l: 3, gd: '-4', pts: 5 },
  ];

  const playerStats = [
    { pos: 1, name: 'Tunde K.', team: 'Coal City SC', g: 12, a: 4 },
    { pos: 2, name: 'Emeka R.', team: 'Nsukka Rangers', g: 6, a: 9 },
    { pos: 3, name: 'Chidi O.', team: 'Nsukka Rangers', g: 9, a: 2 },
    { pos: 4, name: 'Ikechukwu P.', team: 'Uwani Warriors', g: 8, a: 3 },
    { pos: 5, name: 'Obinna V.', team: 'Coal City SC', g: 3, a: 6 },
    { pos: 6, name: 'Junior E.', team: 'Agbani Stars', g: 6, a: 1 },
    { pos: 7, name: 'Victor D.', team: 'Uwani Warriors', g: 2, a: 5 },
  ].sort((a, b) => (b.g + b.a) - (a.g + a.a));

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      {/* Hero Header */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Tournament Standings</h1>
           <h2 className="text-5xl md:text-9xl font-black italic tracking-tighter uppercase mb-8 leading-tight">Table <span className="text-neutral-800">& Stats.</span></h2>
           <p className="max-w-xl mx-auto text-base md:text-lg text-neutral-400 font-medium italic leading-relaxed px-4">Official league table and top performer rankings. <br className="hidden md:block" /> Every stat, every goal, one view.</p>
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
            <div className="overflow-x-auto rounded-[30px] md:rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-xl animate-reveal shadow-2xl no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-10 px-6 md:px-10 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Pos</th>
                    <th className="py-10 px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Team</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">P</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">W</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">D</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">L</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">GD</th>
                    <th className="py-10 px-10 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 uppercase">
                  {teams.map((team) => (
                    <tr key={team.name} className="group transition-colors hover:bg-white/[0.03]">
                      <td className="py-8 md:py-10 px-6 md:px-10 font-black italic text-xl md:text-2xl text-neutral-700 group-hover:text-white transition-colors">{team.pos.toString().padStart(2, '0')}</td>
                      <td className="py-8 md:py-10 px-6">
                        <div className="flex items-center gap-4 md:gap-6 whitespace-nowrap">
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-neutral-600 group-hover:bg-blue-600 group-hover:text-white transition-all">{team.name.charAt(0)}</div>
                          <span className="text-sm md:text-xl font-bold text-white tracking-tight group-hover:text-blue-500 transition-colors uppercase">{team.name}</span>
                        </div>
                      </td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-bold text-neutral-400 group-hover:text-white">{team.p}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-bold text-neutral-500 group-hover:text-white">{team.w}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-bold text-neutral-500 group-hover:text-white">{team.d}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-bold text-neutral-500 group-hover:text-white">{team.l}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-bold text-neutral-400 group-hover:text-white">{team.gd}</td>
                      <td className="py-8 md:py-10 px-10 text-center text-xl md:text-3xl font-black italic text-white group-hover:text-blue-500 transition-colors">{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="overflow-x-auto rounded-[30px] md:rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-xl animate-reveal shadow-2xl">
              <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-10 px-6 md:px-10 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">RK</th>
                    <th className="py-10 px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Player</th>
                    <th className="py-10 px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Team</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">G</th>
                    <th className="py-10 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 text-center">A</th>
                    <th className="py-10 px-10 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 text-center">T</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {playerStats.map((player, idx) => (
                    <tr key={idx} className="group transition-colors hover:bg-white/[0.03]">
                      <td className="py-8 md:py-10 px-6 md:px-10 font-black italic text-xl md:text-2xl text-neutral-700 group-hover:text-white transition-colors">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="py-8 md:py-10 px-6">
                        <div className="flex items-center gap-4 md:gap-6 whitespace-nowrap">
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-white/5 bg-white/5 flex items-center justify-center font-black italic text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">{player.name.charAt(0)}</div>
                          <span className="text-sm md:text-xl font-bold text-white tracking-tight group-hover:text-blue-500 transition-colors uppercase">{player.name}</span>
                        </div>
                      </td>
                      <td className="py-8 md:py-10 px-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 whitespace-nowrap">{player.team}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-black text-lg md:text-2xl text-neutral-400 group-hover:text-white">{player.g}</td>
                      <td className="py-8 md:py-10 px-4 md:px-6 text-center font-black text-lg md:text-2xl text-neutral-400 group-hover:text-white">{player.a}</td>
                      <td className="py-8 md:py-10 px-10 text-center text-3xl md:text-4xl font-black italic text-blue-500 transition-colors">
                        {player.g + player.a}
                      </td>
                    </tr>
                  ))}
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
