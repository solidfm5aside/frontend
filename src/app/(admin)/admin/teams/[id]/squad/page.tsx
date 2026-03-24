'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  Activity, 
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Player {
  _id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  nationality: string;
}

interface Team {
  _id: string;
  name: string;
  registrationStatus: string;
}

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    position: 'MF',
    jerseyNumber: '',
    nationality: 'Nigeria'
  });

  const fetchData = async () => {
    try {
      const [teamRes, playersRes]: any = await Promise.all([
        apiClient.get(`/teams/${id}`),
        apiClient.get(`/players?teamId=${id}`)
      ]);
      
      if (teamRes.success) setTeam(teamRes.data);
      if (playersRes.success) setPlayers(playersRes.data);
    } catch (error) {
      toast.error('Failed to load squad data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const response: any = await apiClient.post('/players', {
        ...formData,
        teamId: id,
        jerseyNumber: Number(formData.jerseyNumber)
      });
      if (response.success) {
        toast.success('Player added to squad');
        setFormData({ name: '', position: 'MF', jerseyNumber: '', nationality: 'Nigeria' });
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add player');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return;
    try {
      const response: any = await apiClient.delete(`/players/${playerId}`);
      if (response.success) {
        toast.success('Player removed');
        setPlayers(players.filter(p => p._id !== playerId));
      }
    } catch (error) {
      toast.error('Failed to remove player');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-reveal">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Link 
            href="/admin/teams" 
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Teams
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
              {team?.name} <span className="text-blue-500 not-italic">Squad.</span>
            </h1>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
              team?.registrationStatus === 'registered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              {team?.registrationStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Registration Form */}
        <div className="lg:col-span-1 border border-white/5 bg-white/[0.02] rounded-[40px] p-8 backdrop-blur-3xl h-fit">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Add Player</h2>
          </div>

          <form onSubmit={handleAddPlayer} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Full Name</label>
              <input 
                required
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Position</label>
                <select 
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all appearance-none"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                >
                  <option value="GK">GK</option>
                  <option value="DF">DF</option>
                  <option value="MF">MF</option>
                  <option value="FW">FW</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Jersey #</label>
                <input 
                  required
                  type="number"
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                  value={formData.jerseyNumber}
                  onChange={e => setFormData({...formData, jerseyNumber: e.target.value})}
                  placeholder="10"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={adding}
              className="w-full h-14 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {adding ? 'Processing...' : 'Register Player'}
            </button>
          </form>
        </div>

        {/* Squad Table */}
        <div className="lg:col-span-2 border border-white/5 bg-white/[0.02] rounded-[40px] overflow-hidden backdrop-blur-3xl">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Current Squad</h2>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{players.length} / 12 Registered</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  <th className="px-8 py-6">#</th>
                  <th className="px-8 py-6">Player</th>
                  <th className="px-8 py-6 text-center">Pos</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((player) => (
                  <tr key={player._id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <span className="text-lg font-black italic text-neutral-700 group-hover:text-blue-500 transition-colors">
                        {player.jerseyNumber.toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-white group-hover:text-blue-500 transition-colors uppercase">{player.name}</p>
                      <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{player.nationality}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="inline-block rounded-lg px-2 py-1 text-[10px] font-black bg-white/5 text-neutral-400 group-hover:text-white transition-colors">
                        {player.position}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDeletePlayer(player._id)}
                        className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">No players registered yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
