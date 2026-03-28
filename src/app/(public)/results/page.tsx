'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ChevronLeft, ChevronRight, MapPin, Clock, Trophy } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  logo?: string;
}

interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
  minute: number;
  playerId: { _id: string; name: string };
  teamId: string;
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
  events: MatchEvent[];
  stage: string;
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

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dayPage, setDayPage] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response: any = await apiClient.get('/matches');
        if (response.success) {
          const completed = response.data
            .filter((m: Match) => m.status === 'completed')
            .sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMatches(completed);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

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
    matches.forEach(m => {
      const key = getDayKey(m.date);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [matches]);

  const sortedDays = useMemo(() => Object.keys(matchesByDay).sort((a, b) => b.localeCompare(a)), [matchesByDay]);
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
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Match Archives</h1>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-8xl lg:text-9xl mb-8 leading-tight">Full <span className="text-neutral-800">Time.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium italic tracking-widest uppercase">The Ledger of War • Season 2026</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {totalDays === 0 ? (
            <div className="py-32 text-center rounded-[40px] border border-white/5 bg-white/[0.01] reveal-on-scroll">
               <span className="text-4xl block mb-6 opacity-30">⚽</span>
               <p className="text-[10px] md:text-xs font-black text-neutral-600 uppercase tracking-[0.4em] italic leading-loose">No matches have been completed yet.<br/>The story is still being written.</p>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-12">
              {/* Day Pagination Control */}
              <div className="reveal-on-scroll flex items-center justify-between gap-4 rounded-[30px] bg-white/[0.02] border border-white/5 p-4 md:p-8 backdrop-blur-xl">
                <button
                  disabled={dayPage === 0}
                  onClick={() => setDayPage(p => p - 1)}
                  className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </button>

                <div className="text-center min-w-0 px-2 md:px-4">
                  <h3 className="text-sm md:text-3xl font-black italic text-white uppercase tracking-tighter truncate leading-none">
                    {currentDay ? formatMatchDay(currentDay + 'T00:00:00') : '—'}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2 md:mt-3">
                    Results • Page {dayPage + 1} of {totalDays} • {currentDayMatches.length} Matches
                  </p>
                </div>

                <button
                  disabled={dayPage === totalDays - 1}
                  onClick={() => setDayPage(p => p + 1)}
                  className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>

              {/* Result Cards */}
              <div className="grid grid-cols-1 gap-4 md:gap-8">
                {currentDayMatches.map((match, idx) => {
                  const homeGoals = match.events?.filter(e => e.type === 'goal' && e.teamId === match.homeTeam._id) ?? [];
                  const awayGoals = match.events?.filter(e => e.type === 'goal' && e.teamId === match.awayTeam._id) ?? [];
                  const homeWon = match.homeScore > match.awayScore;
                  const awayWon = match.awayScore > match.homeScore;

                  return (
                    <div
                      key={match._id}
                      className={`group relative rounded-[24px] md:rounded-[48px] border border-white/5 bg-white/[0.02] p-5 md:p-12 transition-all hover:bg-white/[0.04] reveal-on-scroll stagger-${(idx % 5) + 1}`}
                    >
                      {/* Stage + Status Badge */}
                      <div className="flex justify-center mb-5 md:mb-10">
                        <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {match.stage?.replace('_', ' ')} • Full Time
                        </span>
                      </div>

                      {/* Teams + Score */}
                      <div className="flex items-center justify-between gap-2 sm:gap-6 md:gap-12">
                        {/* Home Team */}
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-2 md:gap-6 text-right min-w-0">
                          <div className="flex flex-col items-center md:items-end gap-1 order-2 md:order-1 min-w-0">
                            <span className="text-[9px] sm:text-xs md:text-3xl font-black uppercase tracking-tighter italic leading-tight text-center md:text-right line-clamp-2">
                              {match.homeTeam?.name}
                            </span>
                            {/* Home Scorers */}
                            {homeGoals.length > 0 && (
                              <div className="flex flex-wrap justify-center md:justify-end gap-1 mt-0.5">
                                {homeGoals.map((e, ei) => (
                                  <span key={ei} className="text-[7px] md:text-[9px] font-bold text-neutral-500 uppercase tracking-tight">
                                    {e.playerId?.name} {e.minute}'
                                    {ei < homeGoals.length - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="h-11 w-11 sm:h-14 sm:w-14 md:h-28 md:w-28 rounded-2xl md:rounded-[40px] bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl shadow-black/50 order-1 md:order-2">
                            {match.homeTeam?.logo ? (
                              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-lg md:text-4xl font-black text-neutral-700 italic">{match.homeTeam?.name?.charAt(0)}</span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center gap-2 md:gap-4 shrink-0 px-1 sm:px-4">
                          <div className="flex items-center gap-1 md:gap-3">
                            <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${homeWon ? 'bg-yellow-400 text-black shadow-yellow-400/30' : 'bg-neutral-800 text-neutral-400'}`}>
                              {match.homeScore}
                            </div>
                            <div className="h-1.5 w-1.5 md:h-2.5 md:w-2.5 rounded-full bg-blue-500/40"></div>
                            <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${awayWon ? 'bg-yellow-400 text-black shadow-yellow-400/30' : 'bg-neutral-800 text-neutral-400'}`}>
                              {match.awayScore}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[7px] md:text-xs font-bold text-neutral-600 tracking-widest uppercase">
                            <Clock className="h-2 w-2 md:h-3.5 md:w-3.5" />
                            {formatTime(match.date)}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex flex-col md:flex-row-reverse items-center justify-end gap-2 md:gap-6 text-left min-w-0">
                          <div className="h-11 w-11 sm:h-14 sm:w-14 md:h-28 md:w-28 rounded-2xl md:rounded-[40px] bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl shadow-black/50">
                            {match.awayTeam?.logo ? (
                              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-lg md:text-4xl font-black text-neutral-700 italic">{match.awayTeam?.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col items-center md:items-start gap-1 min-w-0">
                            <span className="text-[9px] sm:text-xs md:text-3xl font-black uppercase tracking-tighter italic leading-tight text-center md:text-left line-clamp-2">
                              {match.awayTeam?.name}
                            </span>
                            {/* Away Scorers */}
                            {awayGoals.length > 0 && (
                              <div className="flex flex-wrap justify-center md:justify-start gap-1 mt-0.5">
                                {awayGoals.map((e, ei) => (
                                  <span key={ei} className="text-[7px] md:text-[9px] font-bold text-neutral-500 uppercase tracking-tight">
                                    {e.playerId?.name} {e.minute}'
                                    {ei < awayGoals.length - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Venue Info */}
                      <div className="mt-5 md:mt-16 pt-4 md:pt-10 border-t border-white/5 flex flex-row justify-center gap-4 md:gap-12 items-center">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <MapPin className="h-2.5 w-2.5 md:h-4 md:w-4 text-blue-500" />
                          <span className="text-[7px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-500">{match.venue || 'Solid FM Arena'}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-white/10"></div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Trophy className="h-2.5 w-2.5 md:h-4 md:w-4 text-yellow-400" />
                          <span className="text-[7px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-600">{match.stage?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-40 bg-neutral-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl opacity-30"></div>
        <div className="container mx-auto max-w-5xl text-center reveal-on-scroll px-6 relative z-10">
          <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter mb-8 leading-tight">See the <span className="text-yellow-400">Standings</span></h2>
          <p className="max-w-md mx-auto text-neutral-500 text-xs md:text-sm font-medium mb-12 uppercase tracking-widest leading-relaxed italic">
            See how these results have shaped the league table and who&apos;s racing for the crown.
          </p>
          <Link href="/standings" className="inline-flex h-16 md:h-24 items-center justify-center rounded-2xl md:rounded-[40px] bg-blue-600 px-10 md:px-16 text-sm md:text-2xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/40">
            Live Rankings
          </Link>
        </div>
      </section>
    </div>
  );
}
