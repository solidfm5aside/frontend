'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ChevronLeft, ChevronRight, MapPin, Clock, Zap } from 'lucide-react';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatMatchDay, formatTime, getDayKey } from '@/utils/format';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';

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
  isExtraTime?: boolean;
  shootoutScore?: { home: number; away: number };
}

export default function FixturesClient() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>('all');

  const STAGES = [
    { id: 'all', label: 'All Stages' },
    { id: 'league', label: 'League' },
    { id: 'playoff', label: 'Playoffs' },
    { id: 'round_of_16', label: 'R16' },
    { id: 'quarter_finals', label: 'QF' },
    { id: 'semi_finals', label: 'SF' },
    { id: 'final', label: 'Final' },
  ];

  const fetchMatches = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response: any = await apiClient.get('/matches');
      if (response.success) {
        setMatches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // Filter & Group matches
  const filteredMatches = useMemo(() => {
    const active = matches.filter(m => m.status !== 'completed');
    if (activeStage === 'all') return active;
    return active.filter(m => m.stage === activeStage);
  }, [matches, activeStage]);

  const matchesByDay = useMemo(() => {
    const map: Record<string, Match[]> = {};
    [...filteredMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(m => {
      const key = getDayKey(m.date);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [filteredMatches]);

  const sortedDays = useMemo(() => Object.keys(matchesByDay).sort(), [matchesByDay]);

  // SMART INITIAL DATE SELECTION
  useEffect(() => {
    if (sortedDays.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      const targetDate = sortedDays.find(d => d >= today) || sortedDays[sortedDays.length - 1];
      setSelectedDate(targetDate);
    }
  }, [sortedDays, selectedDate]);

  // HANDLE STAGE CHANGE - Ensure valid date is selected for the new stage
  useEffect(() => {
    if (sortedDays.length > 0 && selectedDate && !sortedDays.includes(selectedDate)) {
      // If currently selected date isn't in this stage, jump to same smart logic
      const today = new Date().toISOString().split('T')[0];
      const targetDate = sortedDays.find(d => d >= today) || sortedDays[0];
      setSelectedDate(targetDate);
    }
  }, [activeStage, sortedDays, selectedDate]);

  const currentIndex = selectedDate ? sortedDays.indexOf(selectedDate) : -1;
  const currentDayMatches = selectedDate ? matchesByDay[selectedDate] : [];
  const totalDays = sortedDays.length;

  useRevealOnScroll([matches, selectedDate, isLoading, activeStage]);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen">
      <section className="relative py-20 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6">Tournament Hub</h1>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-8xl lg:text-9xl mb-12 leading-tight">Match <span className="text-neutral-800">Days.</span></h2>
           
           {/* Stage Filter Tabs */}
           <div className="flex items-center justify-start md:justify-center gap-2 md:gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide">
              {STAGES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeStage === s.id 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/20' 
                    : 'bg-white/5 border-white/5 text-neutral-500 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
           </div>
        </div>
      </section>

      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {totalDays === 0 ? (
            <div className="py-32 text-center rounded-[40px] border border-white/5 bg-white/[0.01] reveal-on-scroll">
               <span className="text-4xl block mb-6 opacity-30">🔍</span>
               <p className="text-[10px] md:text-xs font-black text-neutral-600 uppercase tracking-[0.4em] italic leading-loose">No matches have been scheduled yet.<br/>Check back soon for the official kickoff.</p>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="reveal-on-scroll flex items-center justify-between gap-4 rounded-[30px] bg-white/[0.02] border border-white/5 p-4 md:p-8 backdrop-blur-xl">
                <button
                  disabled={currentIndex <= 0}
                  onClick={() => setSelectedDate(sortedDays[currentIndex - 1])}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="text-center min-w-0 px-4">
                  <h3 className="text-xl md:text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                    {selectedDate ? formatMatchDay(selectedDate + 'T00:00:00') : '—'}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-3">
                    {activeStage.replace(/_/g, ' ')} • Matchday {currentIndex + 1} of {totalDays} • {currentDayMatches?.length || 0} Fixtures
                  </p>
                </div>

                <button
                  disabled={currentIndex >= totalDays - 1}
                  onClick={() => setSelectedDate(sortedDays[currentIndex + 1])}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-neutral-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-8">
                {currentDayMatches?.map((match, idx) => (
                  <div 
                    key={match._id} 
                    className={`group relative rounded-[24px] md:rounded-[48px] border border-white/5 bg-white/[0.02] p-6 md:p-12 transition-all hover:bg-white/[0.04] reveal-on-scroll stagger-${(idx % 5) + 1}`}
                  >
                    <div className="flex justify-center mb-6 md:mb-10">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 ${
                        match.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                        match.stage !== 'league' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {match.stage !== 'league' && <Zap className="h-3 w-3" />}
                        {match.stage?.replace(/_/g, ' ')} • {match.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-6 md:gap-12">
                      <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-3 md:gap-6 text-right min-w-0">
                        <span className="text-[10px] sm:text-sm md:text-3xl font-black uppercase tracking-tighter italic break-words leading-tight hidden sm:block">{match.homeTeam?.name}</span>
                        <TeamAvatar name={match.homeTeam.name} logo={match.homeTeam.logo} size="lg" />
                        <span className="text-[9px] font-black uppercase tracking-widest italic text-white leading-tight block sm:hidden text-center">{match.homeTeam?.name}</span>
                      </div>

                         <div className="flex flex-col items-center gap-2 md:gap-3">
                            <div className="flex items-center gap-1 md:gap-3">
                               <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] ${match.status === 'live' ? 'bg-blue-600' : 'bg-neutral-900'} text-white flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${match.status === 'live' ? 'shadow-blue-600/30' : ''}`}>
                                  {match.status === 'live' ? match.homeScore : '-'}
                               </div>
                               <span className="text-[10px] md:text-xl font-black text-neutral-800 italic uppercase">vs</span>
                               <div className={`h-10 w-10 md:h-20 md:w-20 rounded-xl md:rounded-[32px] ${match.status === 'live' ? 'bg-blue-600' : 'bg-neutral-900'} text-white flex items-center justify-center text-lg md:text-4xl font-black italic shadow-xl ${match.status === 'live' ? 'shadow-blue-600/30' : ''}`}>
                                  {match.status === 'live' ? match.awayScore : '-'}
                               </div>
                            </div>
                           
                           {match.status === 'completed' && (match.isExtraTime || match.shootoutScore) && (
                             <div className="flex flex-col items-center gap-0.5">
                               {match.isExtraTime && (
                                 <span className="text-[7px] md:text-[9px] font-black uppercase text-amber-500 tracking-widest italic">(AET)</span>
                               )}
                               {match.shootoutScore && (
                                 <span className="text-[7px] md:text-[9px] font-black uppercase text-blue-400 tracking-widest italic">
                                   Pens: {match.shootoutScore.home}-{match.shootoutScore.away}
                                 </span>
                               )}
                             </div>
                           )}

                           <div className="flex items-center gap-1 text-[8px] md:text-xs font-bold text-neutral-500 tracking-widest uppercase">
                             <Clock className="h-2.5 w-2.5 md:h-4 md:w-4" />
                             {formatTime(match.date)}
                           </div>
                        </div>

                      <div className="flex-1 flex flex-col md:flex-row-reverse items-center justify-end gap-3 md:gap-6 text-left min-w-0">
                        <span className="text-[10px] sm:text-sm md:text-3xl font-black uppercase tracking-tighter italic break-words leading-tight hidden sm:block">{match.awayTeam?.name}</span>
                        <TeamAvatar name={match.awayTeam.name} logo={match.awayTeam.logo} size="lg" />
                        <span className="text-[9px] font-black uppercase tracking-widest italic text-white leading-tight block sm:hidden text-center">{match.awayTeam?.name}</span>
                      </div>
                    </div>

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
