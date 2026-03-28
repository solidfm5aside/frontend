'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';
import { CalendarDays, AlertCircle, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

interface Stats {
  totalTeams: number;
  pendingTeams: number;
  totalMatches: number;
  totalPlayers: number;
  pendingAdmins?: number;
}

interface UpcomingTournament {
  _id: string;
  name: string;
  season: string;
  fixturesGenerated: boolean;
  status: string;
  startDate: string;
  currentStage: string;
}


interface Readiness {
  isReady: boolean;
  totalTeams: number;
  allTeamsReady: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingTournament, setUpcomingTournament] = useState<UpcomingTournament | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numRounds, setNumRounds] = useState(6);
  const [matchesPerDay, setMatchesPerDay] = useState(7);
  const [venueCount, setVenueCount] = useState(0);
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'super_admin';

  const calculateEndDate = () => {
    if (!upcomingTournament) return null;
    
    const totalMatches = numRounds * 14;
    const totalDaysNeeded = Math.ceil(totalMatches / matchesPerDay);
    
    // Logic mirror of backend for end date estimate
    let currentDate = new Date(upcomingTournament.startDate);
    const day = currentDate.getUTCDay();
    const diff = (6 - day + 7) % 7;
    currentDate.setUTCDate(currentDate.getUTCDate() + diff);
    
    let daysCount = 1;
    let isSat = true;
    
    while (daysCount < totalDaysNeeded) {
      if (isSat) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        isSat = false;
      } else {
        currentDate.setUTCDate(currentDate.getUTCDate() + 6);
        isSat = true;
      }
      daysCount++;
    }
    
    return currentDate;
  };

  const estimatedEndDate = calculateEndDate();
  const startTime = upcomingTournament ? (() => {
    const d = new Date(upcomingTournament.startDate);
    const diff = (6 - d.getUTCDay() + 7) % 7;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  })() : null;


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response: any = await apiClient.get('/dashboard/stats');
        if (response.success) setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchVenues = async () => {
      try {
        const res: any = await apiClient.get('/venues');
        if (res.success) setVenueCount(res.data.length);
      } catch (e) {}
    };

    const fetchUpcomingTournament = async () => {
      try {
        const res: any = await apiClient.get('/tournaments');
        if (res.success) {
          // Show fixture button for both 'upcoming' and 'ongoing' tournaments
          // (admin may have started season before generating fixtures)
          const pending = res.data.find((t: any) => t.status === 'upcoming' || t.status === 'ongoing');
          if (pending) {
            setUpcomingTournament(pending);
            if (pending.status === 'upcoming') {
              // Only run readiness check for truly upcoming ones
              try {
                const rRes: any = await apiClient.get(`/tournaments/${pending._id}/readiness`);
                if (rRes.success) setReadiness(rRes.data);
              } catch (e) {}
            } else {
              // Ongoing — assume ready (admin already launched it)
              setReadiness({ isReady: true, totalTeams: 28, allTeamsReady: true });
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch upcoming tournament:', e);
      }
    };

    fetchStats();
    fetchVenues();
    fetchUpcomingTournament();
  }, []);

  const handleGenerateFixtures = () => {
    if (!upcomingTournament) return;
    setIsModalOpen(true);
  };

  const confirmGenerate = async () => {
    if (!upcomingTournament) return;
    
    setIsGenerating(true);
    setIsModalOpen(false);
    try {
      const response: any = await apiClient.post(`/tournaments/${upcomingTournament._id}/generate-fixtures`, {
        numRounds,
        matchesPerDay
      });
      if (response.success) {
        toast.success(`Fixtures successfully generated (${numRounds} rounds, ${matchesPerDay} matches/day)!`);
        setUpcomingTournament(prev => prev ? { ...prev, fixturesGenerated: true, currentStage: 'league' } : null);
        // Refresh stats to show new matches
        const statsRes: any = await apiClient.get('/dashboard/stats');
        if (statsRes.success) setStats(statsRes.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate fixtures');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateKnockout = async (stage: string) => {
    if (!upcomingTournament) return;
    
    setIsGenerating(true);
    try {
      const response: any = await apiClient.post(`/tournaments/${upcomingTournament._id}/generate-knockout`, {
        stage
      });
      if (response.success) {
        toast.success(`Knockout fixtures generated for ${stage.replace('_', ' ')}!`);
        setUpcomingTournament(prev => prev ? { ...prev, currentStage: stage } : null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate knockout fixtures');
    } finally {
      setIsGenerating(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Teams', value: stats?.totalTeams || 0, icon: '🛡️', color: 'text-blue-500' },
    { name: 'Pending Registrations', value: stats?.pendingTeams || 0, icon: '📝', color: 'text-yellow-500' },
    { name: 'Scheduled matches', value: stats?.totalMatches || 0, icon: '⚽', color: 'text-emerald-500' },
    { name: 'Total Players', value: stats?.totalPlayers || 0, icon: '🏃', color: 'text-purple-500' },
  ];

  if (stats?.pendingAdmins !== undefined) {
    statCards.push({ name: 'Pending Admins', value: stats.pendingAdmins, icon: '🔒', color: 'text-red-500' });
  }

  return (
    <div className="space-y-12 animate-reveal">
      <div>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Overview.</h1>
        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">Season 2026 Dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.name} className="group rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl transition-all hover:bg-white/[0.04] hover:border-blue-500/20">
            <div className="flex items-center justify-between mb-6">
              <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{card.icon}</span>
              <span className={`text-xs font-black uppercase tracking-widest ${card.color}`}>Live</span>
            </div>
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">{card.name}</p>
            <p className="text-4xl font-black italic text-white tracking-tighter">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Action Center */}
        <div className="rounded-[40px] border border-white/5 bg-white/[0.01] p-10 backdrop-blur-3xl">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-8 leading-none">Action <span className="text-blue-500">Center.</span></h2>
          <div className="space-y-4">

            {/* Pending Team Registrations */}
            {stats?.pendingTeams && stats.pendingTeams > 0 ? (
              <Link href="/admin/teams" className="flex items-center justify-between p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 transition-all group">
                <div className="flex items-center gap-4">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Team Registrations</h4>
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">{stats.pendingTeams} teams waiting for approval</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-all">→</div>
              </Link>
            ) : (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 text-neutral-500 uppercase font-black text-[10px] tracking-widest italic opacity-50">
                <span>✓</span> No pending team registrations
              </div>
            )}

            {/* Pending Admin Verification */}
            {stats?.pendingAdmins !== undefined && stats.pendingAdmins > 0 && (
              <Link href="/admin/admins" className="flex items-center justify-between p-6 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all group">
                <div className="flex items-center gap-4">
                  <span className="text-xl">🔒</span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Admin Verification</h4>
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">{stats.pendingAdmins} new staff requests</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-black transition-all">→</div>
              </Link>
            )}

            {/* Generate Fixtures — shown when there's an active/upcoming tournament */}
            {upcomingTournament ? (
              <div className={`flex flex-col gap-3 p-6 rounded-2xl border transition-all ${
                upcomingTournament.fixturesGenerated
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : readiness?.isReady
                  ? 'bg-blue-500/5 border-blue-500/20'
                  : 'bg-white/[0.02] border-white/5'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {upcomingTournament.fixturesGenerated
                      ? <LockKeyhole className="h-5 w-5 text-neutral-500" />
                      : <CalendarDays className={`h-5 w-5 ${readiness?.isReady ? 'text-blue-500' : 'text-neutral-500'}`} />
                    }
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Initialize Fixtures</h4>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">
                        {upcomingTournament.fixturesGenerated
                          ? 'Fixtures already generated — locked'
                          : `${upcomingTournament.name} — Season ${upcomingTournament.season}`
                        }
                      </p>
                    </div>
                  </div>
                  {upcomingTournament.fixturesGenerated ? (
                    <span className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-neutral-600 border border-white/5 flex items-center gap-1.5">
                      <LockKeyhole className="h-3 w-3" /> Generated
                    </span>
                  ) : !isSuperAdmin ? (
                    <span className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-neutral-600 border border-white/5 flex items-center gap-1.5 cursor-not-allowed" title="Only the Super Admin can generate fixtures">
                      <LockKeyhole className="h-3 w-3" /> Super Admin Only
                    </span>
                  ) : (
                    <button
                      disabled={!readiness?.isReady || isGenerating}
                      onClick={handleGenerateFixtures}
                      className="h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-lg shadow-blue-600/20"
                    >
                      {isGenerating ? 'Generating…' : 'Generate'}
                    </button>
                  )}
                </div>
                {!upcomingTournament.fixturesGenerated && readiness && !readiness.isReady && (
                  <div className="flex items-start gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-wide">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Needs {28 - readiness.totalTeams} more team{readiness.totalTeams !== 27 ? 's' : ''} • All teams need 5+ players</span>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/admin/tournaments" className="flex items-center justify-between p-6 rounded-2xl bg-blue-600/5 border border-blue-500/20 hover:bg-blue-600/10 transition-all group">
                <div className="flex items-center gap-4">
                  <span className="text-xl">🏆</span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tighter">No Active Tournament</h4>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 italic">Create a new tournament to get started</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">→</div>
              </Link>
            )}

            {/* Update Results */}
            <Link href="/admin/matches" className="flex items-center justify-between p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-all group">
              <div className="flex items-center gap-4">
                <span className="text-xl">⚽</span>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Update Results</h4>
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">Submit scores for recent fixtures</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">→</div>
            </Link>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="rounded-[40px] border border-white/5 bg-white/[0.01] p-10 backdrop-blur-3xl">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-8 leading-none">Quick <span className="text-neutral-500">Tools.</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/broadcast" className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group block">
              <span className="text-lg block mb-4">📣</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Post Broadcast</span>
            </Link>
            <Link href="/admin/matches" className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group block">
              <span className="text-lg block mb-4">📅</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Reschedule Match</span>
            </Link>
            <Link href="/admin/tournaments" className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group block">
              <span className="text-lg block mb-4">🏆</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Season Config</span>
            </Link>
            <Link href="/admin/venues" className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group block">
              <span className="text-lg block mb-4">📍</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Venues</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Fixture Configuration Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Fixture Configuration"
      >
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 italic">Scheduling Intelligence</p>
            <p className="text-sm text-neutral-400 font-medium leading-relaxed">
              Based on your <span className="text-white font-bold">{venueCount} active venues</span>, each round of 14 matches will be distributed across available slots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Rounds per Team</label>
              <input 
                type="number" 
                min="1" 
                max="27"
                value={numRounds}
                onChange={(e) => setNumRounds(Math.min(27, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-black italic tracking-tighter text-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Matches Per Day</label>
              <input 
                type="number" 
                min="1" 
                max="28"
                value={matchesPerDay}
                onChange={(e) => setMatchesPerDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-black italic tracking-tighter text-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              <span>📅 Weekend Policy</span>
              <span className="text-emerald-500 lowercase tracking-normal">Saturdays & Sundays only</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-2">
              <div className="text-left">
                <p className="text-[9px] font-black text-neutral-600 uppercase">Season Kickoff</p>
                <p className="text-xs font-bold text-white">{startTime?.toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-neutral-600 uppercase">Grand Finale</p>
                <p className="text-xs font-bold text-blue-500">{estimatedEndDate?.toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest text-center italic border-t border-white/5 pt-2">
              Total {numRounds * 14} matches • {Math.ceil((numRounds * 14) / matchesPerDay)} matchdays
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={confirmGenerate}
              className="flex-1 h-14 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <CalendarDays className="h-4 w-4" /> Initialize
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

