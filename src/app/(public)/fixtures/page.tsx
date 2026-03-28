'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  logo?: string;
}

interface Match {
  _id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  stage: string;
  date: string;
  venue?: string;
}

function formatMatchDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getDayKey(dateStr: string) {
  return new Date(dateStr).toISOString().split('T')[0];
}

export default function FixturesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dayPage, setDayPage] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response: any = await apiClient.get('/matches');
        if (response.success) {
          setMatches(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

  // Re-trigger reveal-on-scroll observer whenever content changes
  useEffect(() => {
    if (isLoading) return;

    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));
    
    return () => observer.disconnect();
  }, [matches, dayPage, isLoading]);

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      {/* Hero Header */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Tournament Hub</h1>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-8xl lg:text-9xl mb-8 leading-tight">Match <span className="text-neutral-800">Days.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium italic tracking-widest uppercase">The Hunt for Glory • Season 2026</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {totalDays === 0 ? (
            <div className="py-32 text-center rounded-[40px] border border-white/5 bg-white/[0.01] reveal-on-scroll">
               <span className="text-4xl block mb-6 opacity-30">🔍</span>
               <p className="text-[10px] md:text-xs font-black text-neutral-600 uppercase tracking-[0.4em] italic leading-loose">No matches have been scheduled yet.<br/>Check back soon for the official kickoff.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Day Pagination Control */}
              <div className="reveal-on-scroll flex items-center justify-between gap-4 rounded-[30px] bg-white/[0.02] border border-white/5 p-4 md:p-8 backdrop-blur-xl">
                <button
                  disabled={dayPage === 0}
                  onClick={() => setDayPage(p => p - 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="text-center min-w-0 px-4">
                  <h3 className="text-lg md:text-3xl font-black italic text-white uppercase tracking-tighter truncate leading-none">
                    {currentDay ? formatMatchDay(currentDay + 'T00:00:00') : '—'}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-3">
                    Matchday {dayPage + 1} of {totalDays} • {currentDayMatches.length} Fixtures
                  </p>
                </div>

                <button
                  disabled={dayPage === totalDays - 1}
                  onClick={() => setDayPage(p => p + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Match Cards */}
              <div className="grid grid-cols-1 gap-4 md:gap-8">
                {currentDayMatches.map((match, idx) => (
                  <div 
                    key={match._id} 
                    className={`group relative rounded-[24px] md:rounded-[48px] border border-white/5 bg-white/[0.02] p-6 md:p-12 transition-all hover:bg-white/[0.04] reveal-on-scroll stagger-${(idx % 5) + 1}`}
                  >
                    {/* Status Ribbon/Badge */}
                    <div className="flex justify-center mb-6 md:mb-10">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${
                        match.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                        match.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {match.stage?.replace(/_/g, ' ')} • {match.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-6 md:gap-12">
                      {/* Home Team */}
                      <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-3 md:gap-6 text-right min-w-0">
                        <span className="text-[10px] sm:text-sm md:text-3xl font-black uppercase tracking-tighter italic break-words leading-tight hidden xs:block">{match.homeTeam?.name}</span>
                        <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-28 md:w-28 rounded-2xl md:rounded-[40px] bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl shadow-black/50">
                          {match.homeTeam?.logo ? (
                            <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl md:text-4xl font-black text-neutral-700 italic">{match.homeTeam?.name?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest italic text-white leading-tight block xs:hidden text-center">{match.homeTeam?.name}</span>
                      </div>

                      {/* VS / Score */}
                      <div className="flex flex-col items-center gap-2 md:gap-4 shrink-0 px-2 sm:px-4">
                        <div className="flex items-center gap-1 md:gap-3">
                           <div className="h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] bg-blue-600 text-white flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl shadow-blue-600/30">
                              {match.homeScore}
                           </div>
                           <span className="text-[10px] md:text-xl font-black text-neutral-800 italic uppercase">vs</span>
                           <div className="h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] bg-neutral-800 text-white flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl">
                              {match.awayScore}
                           </div>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] md:text-xs font-bold text-neutral-500 tracking-widest uppercase">
                          <Clock className="h-2.5 w-2.5 md:h-4 md:w-4" />
                          {formatTime(match.date)}
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex flex-col md:flex-row-reverse items-center justify-end gap-3 md:gap-6 text-left min-w-0">
                        <span className="text-[10px] sm:text-sm md:text-3xl font-black uppercase tracking-tighter italic break-words leading-tight hidden xs:block">{match.awayTeam?.name}</span>
                        <div className="h-12 w-12 sm:h-16 sm:w-16 md:h-28 md:w-28 rounded-2xl md:rounded-[40px] bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl shadow-black/50">
                          {match.awayTeam?.logo ? (
                            <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl md:text-4xl font-black text-neutral-700 italic">{match.awayTeam?.name?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest italic text-white leading-tight block xs:hidden text-center">{match.awayTeam?.name}</span>
                      </div>
                    </div>

                    {/* Venue Info */}
                    <div className="mt-8 md:mt-16 pt-6 md:pt-10 border-t border-white/5 flex flex-row justify-center gap-4 md:gap-12 items-center">
                       <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                          <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-400">{match.venue || 'TBD Stadium'}</span>
                       </div>
                       <div className="h-1 w-1 rounded-full bg-white/10 hidden sm:block"></div>
                       <div className="hidden sm:flex items-center gap-2">
                          <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-600">Match Ref:</span>
                          <span className="text-[8px] md:text-xs font-bold text-neutral-400">Official Official</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-40 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
         <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl opacity-30"></div>
         <div className="container mx-auto max-w-5xl text-center reveal-on-scroll px-6 relative z-10">
            <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter mb-8 leading-tight">Ready to <span className="text-blue-500">Compete?</span></h2>
            <p className="max-w-md mx-auto text-neutral-500 text-xs md:text-sm font-medium mb-12 uppercase tracking-widest leading-relaxed italic">
              Join the ranks of Enugu's finest. Register your squad for the next open tournament and fight for the crown.
            </p>
            <Link href="/register-team" className="inline-flex h-16 md:h-24 items-center justify-center rounded-2xl md:rounded-[40px] bg-blue-600 px-10 md:px-16 text-sm md:text-2xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/40">
               Official Registration
            </Link>
         </div>
      </section>
    </div>
  );
}
