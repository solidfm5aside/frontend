'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { Users, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Team {
  _id: string;
  name: string;
  city: string;
  captainName: string;
  contactPhone: string;
  contactEmail: string;
  registrationStatus: 'pending' | 'registered' | 'withdrawn';
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'registered'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    limit: 10
  });

  const fetchTeams = async (page = 1, currentFilter = filter) => {
    setIsLoading(true);
    try {
      const response: any = await apiClient.get(`/teams?page=${page}&limit=10&registrationStatus=${currentFilter}`);
      if (response.success) {
        setTeams(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams(currentPage, filter);
  }, [currentPage, filter]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response: any = await apiClient.patch(`/teams/${id}`, { registrationStatus: status });
      if (response.success) {
        setTeams(teams.map(t => t._id === id ? { ...t, registrationStatus: status as any } : t));
        toast.success(`Team status updated to ${status}`);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'registered') => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Teams.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Manage Season Registrations</p>
        </div>
        
        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5">
            {['all', 'pending', 'registered'].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f as any)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
        </div>
      </div>

      <div className="rounded-[40px] border border-white/5 bg-white/[0.01] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Squad Name</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Captain / Contact</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teams.length > 0 ? teams.map((team) => (
                <tr key={team._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-500 text-xl">
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white tracking-tight">{team.name}</p>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">{team.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <p className="text-sm font-medium text-neutral-300">{team.captainName}</p>
                    <p className="text-[10px] font-bold text-neutral-600 mt-1">{team.contactPhone} • {team.contactEmail}</p>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      team.registrationStatus === 'registered' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      team.registrationStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20'
                    }`}>
                      {team.registrationStatus}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <Link
                        href={`/admin/teams/${team._id}/squad`}
                        className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/5 bg-white/5 text-neutral-500 hover:text-blue-500 hover:border-blue-500/50 transition-all"
                        title="Manage Squad"
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                      
                      {team.registrationStatus === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(team._id, 'registered')}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-600/20"
                          title="Approve Team"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      
                      {team.registrationStatus !== 'withdrawn' && (
                        <button
                          onClick={() => handleStatusUpdate(team._id, 'withdrawn')}
                          className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/10 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Reject Team"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm('Delete this team registration?')) {
                            apiClient.delete(`/teams/${team._id}`).then(() => fetchTeams());
                          }
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/5 text-neutral-700 hover:text-red-600 transition-all"
                        title="Delete Team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={4} className="px-8 py-20 text-center">
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] italic">No squads found matching this filter</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
              Showing <span className="text-white">{(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, pagination.total)}</span> of <span className="text-white">{pagination.total}</span> teams
           </div>
           
           <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Prev
              </button>
              
              <div className="flex items-center gap-1">
                 {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                   <button
                     key={p}
                     onClick={() => setCurrentPage(p)}
                     className={`h-8 w-8 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                       currentPage === p ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'
                     }`}
                   >
                     {p}
                   </button>
                 ))}
              </div>

              <button
                disabled={currentPage === pagination.pages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                className="px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
           </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] font-bold text-neutral-700 uppercase tracking-[0.3em] italic">
         Changes reflect immediately across all public standings and fixtures.
      </p>
    </div>
  );
}
