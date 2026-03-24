'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Link from 'next/link';

interface Stats {
  totalTeams: number;
  pendingTeams: number;
  totalMatches: number;
  totalPlayers: number;
  pendingAdmins?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response: any = await apiClient.get('/dashboard/stats');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

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
             <button className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group">
                <span className="text-lg block mb-4">📣</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Post Broadcast</span>
             </button>
             <button className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group">
                <span className="text-lg block mb-4">📅</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Reschedule Match</span>
             </button>
             <button className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group">
                <span className="text-lg block mb-4">🏆</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Season Config</span>
             </button>
             <button className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group">
                <span className="text-lg block mb-4">📉</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">Gen Report</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
