'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import { CalendarDays, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { PageSpinner } from '@/components/ui/Spinner';
import type { ApiResponse } from '@/types';

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
  formatVersion?: 1 | 2;
  format?: 'legacy_league' | 'two_group_knockout';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingTournament, setUpcomingTournament] = useState<UpcomingTournament | null>(null);
  const { admin } = useAuthStore();
  const canManageTournaments = admin?.role === 'admin' || admin?.role === 'super_admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get<ApiResponse<Stats>, ApiResponse<Stats>>('/dashboard/stats');
        if (response.success) setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUpcomingTournament = async () => {
      try {
        const res = await apiClient.get<ApiResponse<UpcomingTournament[]>, ApiResponse<UpcomingTournament[]>>('/tournaments');
        if (res.success) {
          const pending = res.data.find((tournament) => tournament.status === 'ongoing') ??
            res.data.find((tournament) => tournament.status === 'upcoming');
          if (pending) {
            setUpcomingTournament(pending);
          }
        }
      } catch (e) {
        console.error('Failed to fetch upcoming tournament:', e);
      }
    };

    fetchStats();
    fetchUpcomingTournament();
  }, []);

  if (isLoading) return <PageSpinner />;

  const isV2Competition = upcomingTournament?.formatVersion === 2 &&
    upcomingTournament.format === 'two_group_knockout';

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
        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">
          {upcomingTournament ? `Season ${upcomingTournament.season} Dashboard` : 'Tournament Dashboard'}
        </p>
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
        <div className="rounded-[40px] border border-white/5 bg-white/[0.01] p-10 backdrop-blur-3xl">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-8 leading-none">Action <span className="text-blue-500">Center.</span></h2>
          <div className="space-y-4">
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

            {upcomingTournament ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <CalendarDays className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tighter">{isV2Competition ? 'Competition Workflow' : 'Official Fixture Record'}</h4>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">
                        {isV2Competition
                          ? `${upcomingTournament.name} — 14-team group competition`
                          : `${upcomingTournament.name} — enter the physically confirmed schedule`
                        }
                      </p>
                    </div>
                  </div>
                  {canManageTournaments ? (
                    <Link href="/admin/tournaments" className="flex h-9 items-center rounded-xl bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500">
                      {isV2Competition ? 'Open Workflow' : 'Open Tournament'}
                    </Link>
                  ) : (
                    <span className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-neutral-600 border border-white/5 flex items-center gap-1.5 cursor-not-allowed" title="Administrator access is required to manage the official fixture record">
                      <LockKeyhole className="h-3 w-3" /> Administrator Only
                    </span>
                  )}
                </div>
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
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">→</div>
              </Link>
            )}

            <Link href="/admin/matches" className="flex items-center justify-between p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-all group">
              <div className="flex items-center gap-4">
                <span className="text-xl">⚽</span>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Update Results</h4>
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic">Submit scores for recent fixtures</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">→</div>
            </Link>
          </div>
        </div>

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

    </div>
  );
}
