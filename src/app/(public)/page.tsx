'use client';

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import Link from "next/link";
import apiClient from '@/lib/api-client';

const firstEditionImages = [
  "first01.jpeg", "first02.jpeg", "first03.jpeg", "first04.jpeg", "first05.jpeg",
  "first06.jpeg", "first07.jpeg", "first08.jpeg", "first09.jpeg"
];

const secondEditionImages = [
  "second01.jpeg",
  "second02.jpeg",
  "second03.jpeg",
  "second04.jpeg",
  "second05.jpeg",
  "second06.jpeg",
  "second07.jpeg",
  "second08.jpeg",
  "second09.jpeg",
  "second10.jpeg",
  "second11.jpeg",
  "second12.jpeg"
];

// Combine with metadata
const allLegacyImages = [
  ...firstEditionImages.map(img => ({ name: img, edition: 'Edition 1.0', path: `/assets/editions/first/${img}` })),
  ...secondEditionImages.map(img => ({ name: img, edition: 'Edition 2.0', path: `/assets/editions/second/${img}` }))
];

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [randomLegacy, setRandomLegacy] = useState<typeof allLegacyImages>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [randomTeams, setRandomTeams] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<{q: string, a: string}[]>([
    { q: "How much is the registration fee?", a: "₦50,000 per team. This covers 10 outfield players and 2 officials." },
    { q: "What is the Champions League format?", a: "No groups. Every team plays 6 matches in a single league phase. The top 16 then move directly to knockouts." },
    { q: "When are the matches played?", a: "Every Saturday and Sunday throughout the tournament period in Enugu." }
  ]);
  const [sponsors, setSponsors] = useState<{title: string, name: string, logo: string}[]>([
    { title: "Title Sponsor", name: "CoJude International", logo: "/assets/logos/cojude.png" }
  ]);
  const [isRegistrationLive, setIsRegistrationLive] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    // Shuffle allLegacyImages and pick first 6 for fallback
    const shuffled = [...allLegacyImages].sort(() => 0.5 - Math.random());
    setRandomLegacy(shuffled.slice(0, 6));

    // Fetch dynamic archive
    const fetchArchive = async () => {
       try {
         const response: any = await apiClient.get('/tournaments/archive');
         if (response.success) {
            setArchive(response.data);
         }
       } catch (error) {
         console.error('Failed to fetch archive:', error);
       }
    };
    
    // Fetch dynamic teams
    const fetchTeams = async () => {
       try {
         const response: any = await apiClient.get('/teams');
         if (response.success && response.data) {
            // Shuffle teams on every mount
            const shuffledTeams = [...response.data].sort(() => 0.5 - Math.random());
            setRandomTeams(shuffledTeams.slice(0, 6)); // Display exactly 6 teams
         }
       } catch (error) {
         console.error('Failed to fetch teams:', error);
       }
    };

    // Fetch dynamic global settings (FAQs and Sponsors)
    const fetchSettings = async () => {
      try {
        const response: any = await apiClient.get('/settings');
        if (response.success && response.data) {
           if (response.data.landing_faqs && response.data.landing_faqs.length > 0) {
             setFaqs(response.data.landing_faqs);
           }
           if (response.data.landing_sponsors && response.data.landing_sponsors.length > 0) {
             setSponsors(response.data.landing_sponsors);
           }
           if (response.data.registration_live !== undefined) {
             setIsRegistrationLive(response.data.registration_live === 'true' || response.data.registration_live === true);
           }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchArchive();
    fetchTeams();
    fetchSettings();
  }, []);

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

    // Observe all elements, including newly fetched dynamic ones
    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [randomTeams, archive]);

  const [currentHero, setCurrentHero] = useState(0);
  const heroImages = [
    "/assets/editions/second/second01.jpeg",
    "/assets/editions/first/first05.jpeg",
    "/assets/editions/first/first07.jpeg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col font-outfit relative overflow-hidden selection:bg-blue-600/30">
      {/* Subtle Texture Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 pt-24 pb-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black z-20"></div>
          
          {/* Dynamic Carousel Background */}
          {heroImages.map((src, idx) => (
            <div 
              key={idx}
              className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
                currentHero === idx ? 'opacity-70 scale-100' : 'opacity-0 scale-110'
              }`}
            >
              <Image 
                src={src}
                alt={`Hero Slide ${idx + 1}`}
                fill
                priority={idx === 0}
                className="object-cover object-center mix-blend-overlay"
              />
            </div>
          ))}
          
          {/* Global Hero Grain/Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] w-full max-w-7xl">
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-reveal py-20">
            {isRegistrationLive && (
              <div className="mb-14 inline-flex items-center gap-4 rounded-full border border-blue-500/50 bg-blue-500/10 px-8 py-3.5 backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.25)] group transition-all hover:scale-105 hover:bg-blue-500/20 active:scale-95">
                <div className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 ring-4 ring-blue-500/30"></span>
                </div>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-blue-400 group-hover:text-blue-200 transition-colors drop-shadow-lg">
                  REGISTRATION FOR <span className="text-white">{currentYear} SEASON</span> IS NOW <span className="text-[#FFD700] animate-pulse drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">LIVE</span>
                </span>
              </div>
            )}
            
            <h1 className={`font-outfit text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl leading-[0.95] perspective-1000 uppercase text-center ${!isRegistrationLive && 'mt-14'} mb-8`}>
              Solid <span className="relative inline-block">
                FM
                <span className="absolute -top-4 md:-top-7 left-0 md:left-1 w-full text-center text-[#FFD700] text-[8px] md:text-xs font-black uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] animate-reveal delay-300 pointer-events-none whitespace-nowrap">CoJude</span>
              </span> <br />
              <span className="text-[#FFD700] drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]">5-Aside</span> <br />
              <span className="text-white text-4xl sm:text-6xl lg:text-7xl">Football</span>
            </h1>
            
            <p className="mx-auto mb-16 max-w-2xl text-lg font-medium text-neutral-400 sm:text-xl md:text-2xl leading-relaxed">
              Where passion meets opportunity—giving young footballers the stage to express themselves, compete fiercely, and turn their dreams into reality. Sponsored by <span className="text-white font-bold tracking-wide">CoJude International</span> in Partnership with <span className="text-[#FFD700] font-bold tracking-wide">ENSFA</span>.
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


        </div>
      </section>

      {/* THE FORMAT Section */}
      <section id="format" className="bg-neutral-950 py-40 px-6 border-y border-white/5 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="mb-24 reveal-on-scroll">
            <h2 className="text-sm font-black uppercase tracking-[0.5em] text-blue-500 mb-8 italic">THE FORMAT</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl lg:text-9xl mb-10 leading-[0.85] uppercase">
              One Table. No Groups. <br /><span className="text-neutral-800">Maximum Intensity.</span>
            </h3>
            <p className="max-w-3xl text-lg md:text-2xl text-neutral-500 font-medium leading-relaxed border-l-4 border-blue-600 pl-8">
              A unified league system where every match matters, every point counts, and only the most consistent team earns the crown.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { id: "01", t: "No Groups", s: "One League. No Hiding Places.", d: "All teams compete in a single table format — no easy draws, no second chances. Every game directly impacts your position and your path to glory." },
              { id: "02", t: "Every Match Matters", s: "No Dead Games. No Free Points.", d: "From the first whistle to the final fixture, every result shapes the standings. One slip can cost you everything — consistency is the real champion." },
              { id: "03", t: "Points Decide Everything", s: "Earn It. Don’t Inherit It.", d: "League standings are determined strictly by performance — wins, goals, and discipline. No shortcuts. Just football." },
              { id: "04", t: "Elite Competition Only", s: "Pressure Builds Champions.", d: "This format is designed to test skill, mentality, and endurance — separating casual teams from true contenders." },
              { id: "05", t: "Road to Glory", s: "One Goal. One Champion.", d: "At the end of it all, only one team will stand above the rest — not by chance, but by consistency, discipline, and performance across every match." },
            ].map((item, idx) => (
              <div key={item.id} className={`p-10 md:p-12 border border-white/5 bg-white/[0.01] rounded-[40px] transition-all hover:bg-white/[0.03] hover:border-blue-500/40 group reveal-on-scroll stagger-${idx+1}`}>
                <div className="text-blue-500 text-6xl mb-10 font-black italic transition-transform group-hover:scale-110 group-hover:rotate-3">{item.id}</div>
                <h4 className="text-white text-2xl font-black uppercase tracking-tighter mb-2 italic tracking-tight">{item.t}</h4>
                <h5 className="text-[#FFD700] text-sm font-black uppercase tracking-[0.2em] mb-8">{item.s}</h5>
                <p className="text-neutral-500 text-base leading-relaxed font-medium">{item.d}</p>
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

      {/* About Section (Vision) */}
      <section id="vision" className="bg-black py-40 px-6 font-outfit relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-24 reveal-on-scroll">
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-blue-500 mb-10">About Us</h2>
            <h3 className="mb-10 text-5xl font-black tracking-tight text-white md:text-7xl italic uppercase leading-[0.9]">CoJude SolidFM 5-Aside <br /><span className="text-[#FFD700] not-italic">Football</span> Enugu.</h3>
            
            <div className="mx-auto max-w-4xl text-lg md:text-xl leading-relaxed text-neutral-400 font-medium border-t border-white/10 pt-10 space-y-6">
              <p>
                SolidFM 5-Aside Football is a fast-paced, community-driven football competition organized by Solid100.9 FM, which is situated at 10b savage crescent GRA Enugu, bringing together football lovers from all walks of life. Whether you're a weekend warrior, a skilled dribbler, or just in it for the vibes, this five-a-side tournament is all about passion, teamwork, and good sportsmanship.
              </p>
              <p>
                Played on smaller pitches with fewer players, the format encourages quick play, sharp passing, and loads of goals, making it exciting for both players and fans. Teams battle it out not just for bragging rights, but also for amazing prizes and the pride of being crowned SolidFM champions.
              </p>
              <p>
                More than just football, it's a fun, high-energy event where music and entertainment meet sports with live commentary and talk shows, good vibes, and a strong sense of community at the heart of it all.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 reveal-on-scroll">
            {/* Goals Column */}
            <div className="lg:col-span-4 bg-white/[0.02] border border-white/10 rounded-[40px] p-8 md:p-10 h-max">
              <h4 className="text-blue-500 text-sm font-bold uppercase tracking-[0.3em] mb-8">Our Goals</h4>
              <ul className="space-y-6">
                {[
                  "To sustain sports competition among youths in Enugu state.",
                  "To promote sports/entertainment.",
                  "To expand Solid five aside football in the South East/ Nigeria at large.",
                  "Use as a medium to connect leaders on developing sports men/women.",
                  "Use the tournament as a link to brands, institutions and organizations to showcase their ideas, products and services."
                ].map((goal, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="text-[#FFD700] font-bold mt-1">✓</span>
                    <span className="text-neutral-300 font-medium leading-relaxed text-sm">{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits Column */}
            <div className="lg:col-span-8">
               <h4 className="text-white text-3xl font-black italic uppercase mb-10">Tourney <span className="text-blue-500">Benefits</span></h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {[
                   { t: "Skill Development", d: "The smaller team size and compact playing area mean players have more frequent interactions with the ball. This accelerates the development of technical skills, quick decision-making, and agility." },
                   { t: "Mental Well-being", d: "Participating in sports like five-a-side football can alleviate stress, boost mood, and enhance mental resilience. The social interactions contribute to improved mental health." },
                   { t: "Social Integration", d: "Football fosters camaraderie and teamwork. Youth learn to collaborate, communicate effectively, and build relationships, skills that are transferable to other areas of life." },
                   { t: "Economic Opportunities", d: "Organizing such tournaments stimulates local economies by creating jobs related to event planning, coaching, refereeing, and venue management, prioritizing brand partnership." },
                   { t: "Talent Identification", d: "Tournaments serve as platforms to scout and nurture emerging football talents, potentially leading to professional careers for exceptional players." },
                   { t: "Community Engagement", d: "Such events unite communities, fostering a sense of pride and collective identity. They promote social cohesion and provide constructive activities." },
                   { t: "Brand Visibility", d: "SolidFM Five-Aside provides a high-impact platform for brands to showcase their products and services to a captive, high-energy audience, creating deep community connections." },
                 ].map((benefit, idx) => (
                   <div key={idx} className={`bg-neutral-900/50 border border-white/5 p-6 rounded-3xl hover:border-blue-500/30 transition-colors group ${idx === 6 ? 'sm:col-span-2' : ''}`}>
                     <h5 className="text-[#FFD700] font-bold text-lg mb-3 italic tracking-tight group-hover:text-white transition-colors">{benefit.t}</h5>
                     <p className="text-neutral-400 text-sm leading-relaxed">{benefit.d}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE LEGACY Section */}
      <section id="legacy" className="bg-neutral-950 py-40 px-6 border-y border-white/5 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="mb-24 text-center reveal-on-scroll">
            <h2 className="text-sm font-black uppercase tracking-[0.5em] text-blue-500 mb-8 italic text-center">THE LEGACY</h2>
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl lg:text-9xl mb-10 leading-[0.85] uppercase text-center">
              Relive the <br /><span className="text-neutral-800">Intensity.</span>
            </h3>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-neutral-400 font-medium leading-relaxed text-center">
              Step back into the fire of our previous edition—where stars were born, legends were made, and the heart of Enugu football beat the loudest.
            </p>
          </div>

          {archive.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-on-scroll mt-10">
               {archive.map((tourney) => (
                 <div key={tourney._id} className="group relative overflow-hidden rounded-[30px] border border-white/5 bg-white/[0.02] p-8 aspect-[4/3] flex flex-col justify-between hover:bg-white/[0.04] hover:border-blue-500/30 transition-all shadow-2xl">
                    <div className="flex justify-between items-start relative z-10">
                       <div>
                          <h4 className="text-2xl font-black italic text-white uppercase tracking-tighter group-hover:text-blue-500 transition-colors">{tourney.name}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">Season {tourney.season}</span>
                       </div>
                       <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">🏆</div>
                    </div>
                    
                    <div className="relative z-10 mt-8 border-t border-white/5 pt-6">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 italic">Defending Champions</p>
                       {tourney.champion ? (
                         <div className="flex items-center gap-4">
                           <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white text-base">
                             {tourney.champion.name.charAt(0)}
                           </div>
                           <div>
                             <span className="text-xl font-bold text-white tracking-tight block leading-none mb-1">{tourney.champion.name}</span>
                             <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500">{tourney.champion.city}</span>
                           </div>
                         </div>
                       ) : (
                         <div className="flex items-center gap-3">
                           <div className="h-10 w-10 flex-shrink-0 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-neutral-600 font-bold">?</div>
                           <span className="text-xs font-black uppercase tracking-widest text-neutral-600 italic">No Historical Data</span>
                         </div>
                       )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none"></div>
                 </div>
               ))}
             </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 reveal-on-scroll">
              {/* 1. Main Focal (2x2 area on desktop) */}
              <div className="col-span-2 lg:row-span-2 relative group overflow-hidden rounded-[30px] md:rounded-[40px] border border-white/10 bg-neutral-900 aspect-video lg:aspect-auto">
                {randomLegacy[0] && (
                  <Image 
                    src={randomLegacy[0].path}
                    alt="Legacy Focal" 
                    fill 
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110 lg:group-hover:rotate-1"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10">
                  <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">{randomLegacy[0]?.edition}</span>
                </div>
              </div>

              {/* 2. Top Right Thumb */}
              <div className="relative group overflow-hidden rounded-[20px] md:rounded-[30px] border border-white/10 bg-neutral-900 aspect-square col-span-1">
                {randomLegacy[1] && (
                  <Image 
                    src={randomLegacy[1].path}
                    alt="Legacy Capture" 
                    fill 
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 lg:group-hover:bg-blue-600/10 transition-all"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-[8px] bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">{randomLegacy[1]?.edition}</span>
                </div>
              </div>

              {/* 3. Top Far Right Thumb */}
              <div className="relative group overflow-hidden rounded-[20px] md:rounded-[30px] border border-white/10 bg-neutral-900 aspect-square col-span-1">
                {randomLegacy[2] && (
                  <Image 
                    src={randomLegacy[2].path}
                    alt="Legacy Experience" 
                    fill 
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 lg:group-hover:bg-blue-600/10 transition-all"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-[8px] bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">{randomLegacy[2]?.edition}</span>
                </div>
              </div>

              {/* 4. Middle Right Thumb */}
              <div className="relative group overflow-hidden rounded-[20px] md:rounded-[30px] border border-white/10 bg-neutral-900 aspect-square col-span-1">
                {randomLegacy[4] && (
                  <Image 
                    src={randomLegacy[4].path}
                    alt="Legacy Highlight" 
                    fill 
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 lg:group-hover:bg-blue-600/10 transition-all"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-[8px] bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">{randomLegacy[4]?.edition}</span>
                </div>
              </div>

              {/* 5. Middle Far Right Thumb */}
              <div className="relative group overflow-hidden rounded-[20px] md:rounded-[30px] border border-white/10 bg-neutral-900 aspect-square col-span-1">
                {randomLegacy[5] && (
                  <Image 
                    src={randomLegacy[5].path}
                    alt="Legacy Moment" 
                    fill 
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 lg:group-hover:bg-blue-600/10 transition-all"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-[8px] bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">{randomLegacy[5]?.edition}</span>
                </div>
              </div>

              {/* 6. Bottom Complementary Wide Shot (col-span-2) */}
              <div className="col-span-2 relative group overflow-hidden rounded-[30px] md:rounded-[40px] border border-white/10 bg-neutral-900 aspect-video lg:aspect-auto">
                {randomLegacy[3] && (
                  <Image 
                    src={randomLegacy[3].path}
                    alt="Legacy Team" 
                    fill 
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-all duration-700 lg:group-hover:scale-110 lg:group-hover:rotate-1"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 lg:group-hover:bg-black/20 transition-all"></div>
                <div className="absolute bottom-6 left-8">
                  <span className="text-white/80 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] px-3 py-1 bg-blue-600/40 backdrop-blur-md rounded-lg border border-white/10">{randomLegacy[3]?.edition} Summary</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-20 text-center reveal-on-scroll">
            <Link href="/gallery" className="inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-neutral-500 hover:text-white transition-all group">
              <span className="h-px w-12 bg-white/10 group-hover:w-20 group-hover:bg-blue-500 transition-all"></span>
              View Full Archive
              <span className="h-px w-12 bg-white/10 group-hover:w-20 group-hover:bg-blue-500 transition-all"></span>
            </Link>
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
            <h3 className="text-6xl font-black text-white italic tracking-tighter sm:text-8xl leading-none uppercase">The Enugu <br /><span className="text-[#FFD700]">Guard.</span></h3>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-20 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {randomTeams.length > 0 ? randomTeams.map((team, i) => {
              // Pre-defined fallback background colors for visual variety
              const fallbackColors = ['bg-neutral-600', 'bg-blue-600', 'bg-red-600', 'bg-emerald-600', 'bg-yellow-600', 'bg-purple-600'];
              const fallbackColor = fallbackColors[i % fallbackColors.length];
              const textColor = fallbackColor.replace('bg-', 'text-');
              
              return (
              <div key={team._id || i} className={`group flex flex-col items-center transition-transform hover:-translate-y-4 hover:animate-float reveal-on-scroll stagger-${(i%6)+1}`}>
                <div className={`relative mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] border border-white/5 bg-neutral-900 shadow-2xl transition-all group-hover:border-blue-500 group-hover:bg-blue-600/10 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] overflow-hidden`}>
                  {team.logo && !team.logo.includes('ui-avatars.com') ? (
                    <Image 
                      src={team.logo} 
                      alt={team.name}
                      fill
                      sizes="128px"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <>
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-[40px] ${fallbackColor}`}></div>
                      <span className={`text-5xl font-black ${textColor} opacity-40 italic transition-all duration-500 group-hover:opacity-100 group-hover:scale-125`}>
                        {team.name.charAt(0)}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="text-center text-sm md:text-base font-black text-white uppercase tracking-tighter group-hover:text-blue-500 transition-colors leading-tight line-clamp-1 px-2 w-full">{team.name}</h4>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-black mt-2 md:mt-3 italic truncate w-full flex justify-center">{team.city || 'Unknown City'}</p>
              </div>
            )}) : (
               // Simple skeleton loader or fallback
               Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="flex flex-col items-center opacity-30 animate-pulse">
                    <div className="mb-8 h-32 w-32 rounded-[40px] bg-neutral-900 border border-white/5"></div>
                    <div className="h-4 w-24 bg-neutral-800 rounded mb-2"></div>
                    <div className="h-2 w-16 bg-neutral-900 rounded"></div>
                 </div>
               ))
            )}
            
            <Link href="/register-team" className={`group flex flex-col items-center transition-transform hover:-translate-y-4 reveal-on-scroll stagger-${(randomTeams.length%6)+1}`}>
              <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] border-2 border-dashed border-blue-500/40 bg-blue-500/5 transition-all group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-xl scale-0 group-hover:scale-150 transition-transform duration-700"></div>
                <span className="text-5xl font-black text-blue-500 group-hover:text-white group-hover:scale-125 transition-all relative z-10">+</span>
              </div>
              <h4 className="text-center text-base font-black text-blue-500 uppercase tracking-tighter group-hover:text-white transition-colors leading-none">Join Them</h4>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-black mt-3 italic underline decoration-blue-500/30 underline-offset-4 group-hover:text-blue-400 group-hover:decoration-blue-400 transition-colors">Register Now</p>
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
              {faqs.map((faq, i) => (
                <div key={i} className={`p-8 md:p-10 border border-white/5 bg-black/40 rounded-[30px] md:rounded-[40px] transition-all hover:bg-black/60 hover:border-blue-500/20 reveal-on-scroll stagger-${(i%2)+1}`}>
                  <h4 className="text-lg md:text-xl font-black text-white mb-4 italic uppercase tracking-tight">Q: {faq.q}</h4>
                  <p className="text-base md:text-lg text-neutral-400 font-medium leading-relaxed">{faq.a}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* FINAL CTA Section */}
      <section className="bg-neutral-950 py-40 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center reveal-on-scroll">
           <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase mb-10 leading-[0.85]">
             Think You Have <br /><span className="text-[#FFD700]">What It Takes?</span>
           </h2>
           <p className="text-lg md:text-2xl text-neutral-400 font-medium mb-16 max-w-2xl mx-auto leading-relaxed">
             Register your team. Step onto the pitch. <span className="text-white">Prove your dominance.</span>
           </p>
           <Link href="/register-team" className="h-20 md:h-28 w-full md:w-auto inline-flex items-center justify-center rounded-[35px] md:rounded-[45px] bg-blue-600 px-12 md:px-24 text-xl md:text-3xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/30">
             Register Squad Now
           </Link>
        </div>
      </section>

      {/* Strategic Partners */}
      <section className="border-t border-white/5 bg-black py-40 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center reveal-on-scroll">
            <h2 className="mb-20 text-4xl font-extrabold tracking-tight text-white uppercase italic tracking-[0.3em] opacity-30">Powering the Game</h2>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-80 hover:opacity-100 transition-all duration-700">
               {sponsors.map((sponsor, idx) => {
                 let badgeColor = "text-[#FFD700]";
                 if (idx % 3 === 1) badgeColor = "text-blue-500";
                 if (idx % 3 === 2) badgeColor = "text-emerald-500";

                 return (
                   <div key={idx} className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                     <div className="flex flex-col items-center">
                       <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${badgeColor} mb-4 text-center`}>{sponsor.title}</span>
                       <div className="h-24 min-w-[6rem] px-8 py-2 overflow-hidden rounded-[24px] bg-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-transparent hover:border-white/50">
                         <img src={sponsor.logo} alt={sponsor.name} className="object-contain h-full w-full max-w-[200px]" />
                       </div>
                     </div>
                     {/* Separator Line (except for the last item) */}
                     {idx !== sponsors.length - 1 && (
                       <div className="hidden md:block h-24 w-px bg-white/20"></div>
                     )}
                   </div>
                 );
               })}
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
