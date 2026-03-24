'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Player {
  _id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  nationality: string;
  teamId: {
    _id: string;
    name: string;
  };
}

export default function PlayersDirectoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState('all');

  const fetchPlayers = async () => {
    try {
      const response: any = await apiClient.get('/players?limit=100');
      if (response.success) {
        setPlayers(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch player directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.teamId?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPos = posFilter === 'all' || p.position === posFilter;
    return matchesSearch && matchesPos;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-reveal">
      {/* Header & Controls */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Players.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Global Talent Directory</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search players or teams..."
              className="pl-12 pr-6 py-4 rounded-2xl border border-white/5 bg-white/5 text-sm text-white focus:border-blue-500/50 outline-none transition-all w-full sm:w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5">
            {['all', 'GK', 'DF', 'MF', 'FW'].map((f) => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  posFilter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Players Grid/Table */}
      <div className="rounded-[40px] border border-white/5 bg-white/[0.01] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Player Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Current Club</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-center">Pos</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.map((player) => (
                <tr key={player._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center font-black text-neutral-700 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all text-xl">
                        {player.jerseyNumber}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white tracking-tight uppercase group-hover:text-blue-500 transition-colors">{player.name}</p>
                        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mt-1 tracking-widest">{player.nationality}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-neutral-300 uppercase tracking-tight">{player.teamId?.name || 'Unassigned'}</p>
                       {player.teamId && (
                         <Link href={`/admin/teams/${player.teamId._id}/squad`} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="h-3 w-3" />
                         </Link>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-8 text-center text-[10px] font-black">
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-neutral-500 group-hover:text-white transition-colors">
                      {player.position}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <button className="text-neutral-700 hover:text-white transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPlayers.length === 0 && (
                 <tr>
                    <td colSpan={4} className="px-8 py-32 text-center">
                       <Users className="h-12 w-12 text-neutral-800 mx-auto mb-6" />
                       <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] italic">No elite players discovered yet</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
