'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function FixturesPage() {
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fixtures = [
    { id: 1, date: 'Sat, April 4', time: '10:00 AM', teamA: 'Enugu FC', teamB: 'Nsukka Rangers', venue: 'Uwani Stadium', status: 'Upcoming' },
    { id: 2, date: 'Sat, April 4', time: '12:00 PM', teamA: 'Uwani Warriors', teamB: 'Agbani Stars', venue: 'Uwani Stadium', status: 'Upcoming' },
    { id: 3, date: 'Sun, April 5', time: '10:00 AM', teamA: 'Trans Ekulu FC', teamB: 'New Haven', venue: 'Sports Center', status: 'Upcoming' },
    { id: 4, date: 'Sun, April 5', time: '02:00 PM', teamA: 'Abakpa United', teamB: 'Ind. Layout', venue: 'Sports Center', status: 'Upcoming' },
  ];

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      {/* Hero Header */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Tournament Hub</h1>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-8xl lg:text-9xl mb-8 leading-tight">Match <span className="text-neutral-800">Days.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium">Every clash in Enugu. Tracking the hunt for glory.</p>
        </div>
      </section>

      {/* Fixtures List */}
      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col gap-10 md:gap-12">
            {[...new Set(fixtures.map(f => f.date))].map((date, dayIdx) => (
              <div key={date} className="reveal-on-scroll">
                <div className="flex items-center gap-4 mb-6 md:mb-10 px-2 md:px-0">
                   <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tight text-white whitespace-nowrap">{date}</h3>
                   <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:gap-8">
                  {fixtures.filter(f => f.date === date).map((match, idx) => (
                    <div key={match.id} className={`group relative rounded-[24px] md:rounded-[40px] border border-white/5 bg-white/[0.02] p-6 md:p-12 transition-all hover:bg-white/[0.04] reveal-on-scroll stagger-${idx+1}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
                        
                        {/* Team A */}
                        <div className="flex flex-row md:flex-row flex-1 items-center justify-between md:justify-end gap-3 md:gap-6 w-full md:w-auto">
                           <span className="text-sm md:text-2xl font-black uppercase tracking-tight group-hover:text-blue-500 transition-colors order-2 md:order-1">{match.teamA}</span>
                           <div className="h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs md:text-2xl font-black italic text-neutral-600 group-hover:text-white transition-all transform group-hover:scale-105 order-1 md:order-2 shrink-0">{match.teamA.charAt(0)}</div>
                        </div>

                        {/* VS / Time */}
                        <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 shrink-0 py-2 md:py-0 w-full md:w-auto border-y md:border-none border-white/5 justify-center">
                           <div className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 bg-blue-500/10 px-3 md:px-4 py-1 rounded-full whitespace-nowrap">Broadcast</div>
                           <div className="text-xl md:text-5xl font-black italic text-white/20 group-hover:text-blue-500/40 transition-colors">VS</div>
                           <div className="text-sm md:text-lg font-bold text-white tracking-widest whitespace-nowrap">{match.time}</div>
                        </div>

                        {/* Team B */}
                        <div className="flex flex-row md:flex-row flex-1 items-center justify-between md:justify-start gap-3 md:gap-6 w-full md:w-auto">
                           <div className="h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs md:text-2xl font-black italic text-neutral-600 group-hover:text-white transition-all transform group-hover:scale-105 shrink-0 text-center">{match.teamB.charAt(0)}</div>
                           <span className="text-sm md:text-2xl font-black uppercase tracking-tight group-hover:text-blue-500 transition-colors">{match.teamB}</span>
                        </div>

                      </div>

                      {/* Footer Info */}
                      <div className="mt-6 md:mt-10 pt-4 md:pt-8 border-t border-white/5 flex flex-row justify-center gap-6 md:gap-16 items-center">
                         <div className="flex items-center gap-2">
                            <span className="text-neutral-600 text-[7px] md:text-[10px] font-black uppercase tracking-widest hidden xs:inline">Venue:</span>
                            <span className="text-neutral-400 text-[8px] md:text-xs font-bold whitespace-nowrap">{match.venue}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-neutral-600 text-[7px] md:text-[10px] font-black uppercase tracking-widest hidden xs:inline">Status:</span>
                            <span className="text-blue-500 text-[8px] md:text-xs font-black uppercase tracking-widest italic">{match.status}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-40 bg-neutral-950 border-t border-white/5">
         <div className="container mx-auto max-w-5xl text-center reveal-on-scroll px-6">
            <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter mb-8 leading-tight">Join the Ranks.</h2>
            <Link href="/register-team" className="inline-flex h-14 md:h-20 items-center justify-center rounded-2xl md:rounded-3xl bg-blue-600 px-8 md:px-12 text-sm md:text-xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/20">
               Register Team
            </Link>
         </div>
      </section>
    </div>
  );
}
