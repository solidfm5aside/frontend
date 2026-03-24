'use client';

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col font-outfit relative overflow-hidden selection:bg-blue-600/30">
      {/* Subtle Texture Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 pt-24 pb-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black"></div>
          {/* Enugu (Coal City) centric high-energy image */}
          <div className="absolute inset-0 bg-[url('/hero-enugu.png')] bg-cover bg-center opacity-70 mix-blend-overlay scale-110 animate-[pulse_10s_ease-in-out_infinite]"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] w-full max-w-7xl">
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-reveal py-20">
            <div className="mb-12 inline-block rounded-full border border-blue-500/20 bg-blue-500/5 px-6 py-2 backdrop-blur-sm">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                Registration for 2026 Season is Now Live
              </span>
            </div>
            
            <h1 className="mb-8 font-outfit text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl leading-[0.95] perspective-1000 uppercase">
              Solid FM <br />
              <span className="text-[#FFD700] drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]">5-Aside</span> <br />
              <span className="text-white text-4xl sm:text-6xl lg:text-7xl">Football</span>
            </h1>
            
            <p className="mx-auto mb-16 max-w-2xl text-lg font-medium text-neutral-400 sm:text-xl md:text-2xl leading-relaxed">
              Enugu's Premier Grassroots 5-A-Side Tournament. Sponsored by <span className="text-white font-bold tracking-wide">CoJude International</span> in Partnership with <span className="text-[#FFD700] font-bold tracking-wide">ENSFA</span>.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row mb-12">
              <Link href="/register-team" className="h-16 md:h-20 w-full md:w-auto inline-flex items-center justify-center rounded-3xl bg-[#FFD700] px-10 md:px-16 text-sm md:text-xl font-black uppercase italic tracking-widest text-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-yellow-600/20">
                Register Squad
              </Link>
              <a href="/fixtures" className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 px-10 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 sm:w-auto flex items-center justify-center">
                View Schedule
              </a>
            </div>
          </div>

          {/* Participation Banner - Now Relative in Flow */}
          <div className="w-full reveal-on-scroll mt-auto">
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/5 bg-white/[0.02] p-4 md:p-6 backdrop-blur-xl">
              <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
                <div className="text-[10px] md:text-xs font-medium text-neutral-400 italic">
                  <span className="text-white font-bold uppercase tracking-widest block md:inline mb-1 md:mb-0">Player Incentive:</span> Every registered participant receives ₦2,000 credit after the league phase.
                </div>
                <div className="flex gap-6 md:gap-10 text-center shrink-0">
                  <div className="flex flex-col">
                     <span className="text-2xl md:text-3xl font-black text-white italic">28</span>
                     <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-600 font-black">Teams</span>
                  </div>
                  <div className="flex flex-col border-x border-white/10 px-6 md:px-10">
                     <span className="text-2xl md:text-3xl font-black text-white italic">104</span>
                     <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-600 font-black">Matches</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-2xl md:text-3xl font-black text-[#FFD700] italic">₦500K</span>
                     <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-600 font-black">Prize</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament DNA / Format Section */}
      <section className="bg-neutral-950 py-32 px-6 border-y border-white/5 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="mb-24 reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-6">The DNA</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none">Revolutionary <br /><span className="text-neutral-700">Format.</span></h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: "01", t: "No Groups", d: "A unified league table where every result matters. True Champions League style intensity." },
              { id: "02", t: "6 Matches Min", d: "Minimum of six high-stakes matches for every registered team. No one gets sent home early." },
              { id: "03", t: "Top 16 Qualify", d: "Only the elite move onto the knockout stages. The path to the final starts in the league." },
              { id: "04", t: "Weekend Vibe", d: "All matches played Saturdays and Sundays to ensure peak attendance and community aura." },
            ].map((item, idx) => (
              <div key={item.id} className={`p-8 md:p-10 border border-white/5 bg-white/[0.01] rounded-[30px] md:rounded-[40px] transition-all hover:bg-white/[0.03] hover:border-blue-500/40 group reveal-on-scroll stagger-${idx+1}`}>
                <div className="text-blue-500 text-4xl md:text-5xl mb-6 md:mb-8 font-black italic group-hover:scale-110 group-hover:rotate-6 transition-transform">{item.id}</div>
                <h4 className="text-xl md:text-2xl font-bold text-white mb-4">{item.t}</h4>
                <p className="text-neutral-500 text-sm md:text-base font-medium leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Human Stories / Testimony Section */}
      <section className="bg-neutral-900 py-32 px-6 relative overflow-hidden">
        {/* Background Image of Fans */}
        <div className="absolute inset-0 z-0 opacity-10 grayscale mix-blend-overlay">
           <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-transparent to-neutral-900"></div>
           <div className="absolute inset-0 bg-[url('/fans-enugu.png')] bg-cover bg-center"></div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="mb-24 text-center reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-blue-500 mb-4">The Community</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none">Voices from <br /> <span className="text-neutral-400">the Pitch.</span></h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { n: "Tunde K.", r: "Goal King", t: "This isn't just a tournament; it's where we get seen. Solid FM makes every goal feel like the World Cup final." },
              { n: "Coach Mike", r: "Spartans FC", t: "The structure is elite. 6 guaranteed matches means my boys actually grow and learn, win or lose." },
              { n: "Amaka J.", r: "Fan & Supporter", t: "The energy at the stands with the radio commentary is something Enugu hasn't seen at this level." },
            ].map((story, i) => (
              <div key={i} className={`p-12 rounded-[50px] bg-black/40 border border-white/5 backdrop-blur-md relative overflow-hidden group transition-all hover:bg-black/60 hover:-translate-y-3 reveal-on-scroll stagger-${i+1}`}>
                <div className="absolute top-0 right-0 p-8 text-blue-500 opacity-20 text-7xl font-black italic">"</div>
                <p className="text-xl text-neutral-300 font-medium leading-relaxed mb-10 relative z-10 italic">"{story.t}"</p>
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">{story.n.charAt(0)}</div>
                  <div>
                    <h4 className="text-white font-extrabold text-lg tracking-tight">{story.n}</h4>
                    <p className="text-blue-500 font-black uppercase tracking-[0.2em] text-[10px]">{story.r}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="bg-black py-40 px-6 font-outfit relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-10">Our Mission</h2>
            <h3 className="mb-10 text-6xl font-black tracking-tight text-white md:text-8xl italic uppercase leading-[0.9]">The Soul of <br /><span className="text-blue-500 not-italic">Coal City</span> Football.</h3>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-neutral-400 font-medium border-t border-white/10 pt-10">
              Designed for the heart of Enugu, this tournament bridges the gap between grassroots passion and professional visibility. From the local pitch to the world stage, we are building a legacy of excellence.
            </p>
          </div>
        </div>
      </section>

      {/* Radio Pulse Section */}
      <section className="relative bg-blue-600 py-32 px-6 overflow-hidden animate-glow">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="container mx-auto max-w-7xl relative z-10 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 text-center lg:text-left reveal-on-scroll">
            <div className="inline-block px-5 py-2 rounded-full bg-white/15 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8 border border-white/20 italic backdrop-blur-md">
              Powered by CoJude • Broadcast by Solid FM
            </div>
            <h2 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl lg:text-9xl mb-10 leading-[0.85]">
              The Pitch <br className="hidden sm:block" /> meets the <span className="text-[#FFD700] underline decoration-white/40 underline-offset-8">Brand.</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/95 font-medium leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0">
              CoJude International and Solid FM bring you a broadcast phenomenon. From daily jingles to live matchday interviews, your performance reaches thousands in Enugu.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
               <div className="text-white font-black uppercase tracking-[0.2em] text-[10px] border border-white/30 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all cursor-default">10k+ Listeners</div>
               <div className="text-white font-black uppercase tracking-[0.2em] text-[10px] border border-white/30 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all cursor-default">Live Interviews</div>
            </div>
          </div>
          <div className="w-full max-w-md lg:w-1/3 aspect-square rounded-[60px] bg-white shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center p-12 text-black transition-all duration-700 hover:scale-105 hover:rotate-2 reveal-on-scroll">
             <div className="h-1.5 bg-blue-600 w-24 mb-10 rounded-full animate-pulse"></div>
             <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600 mb-3">Live Feed</p>
             <h4 className="text-3xl md:text-4xl font-black italic text-center leading-tight mb-4 tracking-tighter">Your Team. <br /> Our Station.</h4>
             <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] text-center mb-10">Broadcasting Sideline 24/7</p>
             <div className="flex gap-1.5 items-end h-12">
                {[1,4,2,6,3,8,5,2,4,1].map((h, i) => (
                  <div key={i} className="w-2 bg-blue-600 rounded-full animate-pulse" style={{ height: `${h*12.5}%`, animationDelay: `${i*100}ms` }}></div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Prize Pool - Clean Cards */}
      <section className="bg-black py-40 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-24 text-center reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-6">The Rewards</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none uppercase">Champion <br /><span className="text-neutral-800">Bounty.</span></h3>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              { e: "🏆", t: "First Place", p: "₦500,000", s: "Main Championship Title" },
              { e: "🥈", t: "Second Place", p: "₦300,000", s: "Runners Up Award" },
              { e: "👟", t: "Top Scorer", p: "₦50,000", s: "Golden Boot Excellence" },
            ].map((prize, idx) => (
              <div key={idx} className={`rounded-[50px] border border-white/5 bg-white/[0.01] p-12 transition-all hover:bg-white/[0.03] hover:-translate-y-4 hover:border-blue-500/20 group reveal-on-scroll stagger-${idx+1}`}>
                <div className="mb-10 text-6xl group-hover:scale-110 transition-transform duration-500">{prize.e}</div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-blue-500 mb-2">{prize.t}</div>
                <div className="text-5xl lg:text-6xl font-black text-white italic group-hover:text-blue-400 transition-colors tracking-tighter">{prize.p}</div>
                <p className="mt-6 text-[11px] font-black text-neutral-600 uppercase tracking-[0.4em]">{prize.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matchday Experience Section */}
      <section className="bg-neutral-950 py-40 px-6 border-t border-white/5">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-32 reveal-on-scroll">
             <h2 className="text-6xl font-black text-white italic tracking-tighter mb-6 uppercase sm:text-8xl">The Energy.</h2>
             <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-xs">Beyond the fifty minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            {[
              { e: "📣", t: "Pro Commentary", d: "Live play-by-play analysis that brings professional flair to every grassroots tackle." },
              { e: "🤝", t: "Networking", d: "Engage with sports personalities and brand representatives on the sidelines." },
              { e: "🍽️", t: "Lounge & Eats", d: "Premium beverage and catering experiences for players and spectators alike." },
              { e: "📸", t: "Media Coverage", d: "High-definition match highlights and graphics for your team's digital presence." },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col gap-8 reveal-on-scroll stagger-${i+1} group`}>
                <div className="h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-4xl group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:scale-110 transition-all duration-500 cursor-default">{item.e}</div>
                <div>
                  <h4 className="text-2xl font-black text-white mb-4 group-hover:text-blue-500 transition-colors uppercase italic tracking-tight">{item.t}</h4>
                  <p className="text-neutral-500 text-lg leading-relaxed font-medium">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competing Teams Section */}
      <section className="bg-black py-40 px-6 border-y border-white/5">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-24 text-center reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-6">Elite Competitors</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none uppercase">The Coal City <br /><span className="text-[#FFD700]">Guard.</span></h3>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-20 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[
              { name: "Coal City SC", city: "Enugu", color: "bg-neutral-600" },
              { name: "Nsukka Rangers", city: "Nsukka", color: "bg-blue-600" },
              { name: "Uwani Warriors", city: "Enugu", color: "bg-red-600" },
              { name: "Agbani Stars", city: "Agbani", color: "bg-emerald-600" },
              { name: "Trans Ekulu FC", city: "Enugu", color: "bg-yellow-600" },
              { name: "New Haven", city: "Enugu", color: "bg-orange-600" },
            ].map((team, i) => (
              <div key={i} className={`group flex flex-col items-center transition-transform hover:-translate-y-4 hover:animate-float reveal-on-scroll stagger-${(i%4)+1}`}>
                <div className={`relative mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] border border-white/5 bg-neutral-900 shadow-2xl transition-all group-hover:border-blue-500 group-hover:bg-blue-600/5 group-hover:scale-105`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-[40px] ${team.color}`}></div>
                  <span className={`text-5xl font-black ${team.color.replace('bg-', 'text-')} opacity-40 italic transition-all group-hover:opacity-100 group-hover:scale-125`}>
                    {team.name.charAt(0)}
                  </span>
                </div>
                <h4 className="text-center text-base font-black text-white uppercase tracking-tighter group-hover:text-blue-500 transition-colors leading-none">{team.name}</h4>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-black mt-3 italic">{team.city}</p>
              </div>
            ))}
            
            <Link href="/register-team" className="group flex flex-col items-center transition-transform hover:-translate-y-4 reveal-on-scroll">
              <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] border-2 border-dashed border-blue-500/40 bg-blue-500/5 transition-all group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:scale-105 shadow-2xl">
                <span className="text-5xl font-black text-blue-500 group-hover:text-white group-hover:scale-125 transition-all">+</span>
              </div>
              <h4 className="text-center text-base font-black text-blue-500 uppercase tracking-tighter group-hover:text-white transition-colors leading-none">Join Them</h4>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-black mt-3 italic underline decoration-blue-500/30 underline-offset-4">Register Now</p>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-neutral-900 py-40 px-6">
        <div className="container mx-auto max-w-4xl">
           <div className="text-center mb-32 reveal-on-scroll">
              <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-6">Play Intel</h2>
              <h2 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none uppercase">Quick <span className="text-blue-500 not-italic">Brief.</span></h2>
           </div>
           <div className="space-y-8">
              {[
                { q: "How much is the registration fee?", a: "₦50,000 per team. This covers 10 outfield players and 2 officials." },
                { q: "What is the Champions League format?", a: "No groups. Every team plays 6 matches in a single league phase. The top 16 then move directly to knockouts." },
                { q: "When are the matches played?", a: "Every Saturday and Sunday throughout the tournament period in the Coal City." },
                { q: "What is the Player Participation Incentive?", a: "Every registered player and official receives ₦2,000 credit after the league phase completes." }
              ].map((faq, i) => (
                <div key={i} className={`p-8 md:p-10 border border-white/5 bg-black/40 rounded-[30px] md:rounded-[40px] transition-all hover:bg-black/60 hover:border-blue-500/20 reveal-on-scroll stagger-${(i%2)+1}`}>
                  <h4 className="text-lg md:text-xl font-black text-white mb-4 italic uppercase tracking-tight">Q: {faq.q}</h4>
                  <p className="text-base md:text-lg text-neutral-400 font-medium leading-relaxed">{faq.a}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Strategic Partners */}
      <section className="border-t border-white/5 bg-black py-40 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center reveal-on-scroll">
            <h2 className="mb-20 text-4xl font-extrabold tracking-tight text-white uppercase italic tracking-[0.3em] opacity-30">Powering the Game</h2>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-80 hover:opacity-100 transition-all duration-700">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700] mb-4">Title Sponsor</span>
                <div className="h-24 w-48 overflow-hidden rounded-2xl bg-white p-2 shadow-2xl flex items-center justify-center transition-transform hover:scale-110">
                  <img src="/assets/logos/cojude.png" alt="CoJude International" className="object-contain h-full w-full" />
                </div>
              </div>
              <div className="hidden md:block h-24 w-px bg-white/20"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Media Partner</span>
                <div className="h-24 w-24 overflow-hidden rounded-full bg-neutral-200 border-4 border-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110">
                  <img src="/assets/logos/solidfm.png" alt="Solid FM" className="object-cover h-full w-full" />
                </div>
              </div>
              <div className="hidden md:block h-24 w-px bg-white/20"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-4">Official Association</span>
                <div className="h-24 w-24 overflow-hidden rounded-full bg-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110">
                  <img src="/assets/logos/ensfa.png" alt="ENSFA" className="object-contain h-full w-full p-1" />
                </div>
              </div>
            </div>
            <p className="mx-auto mt-24 max-w-xl text-xs leading-relaxed text-neutral-600 font-black uppercase tracking-[0.4em] italic">
              Exclusive sponsorship opportunities for visionary brands.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
