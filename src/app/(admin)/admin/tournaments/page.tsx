'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';
import { Plus, CheckCircle2, RefreshCw, CalendarDays, AlertCircle, Flame, Clock, Archive, LockKeyhole } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  fixturesGenerated: boolean;
  currentStage: string;
}

interface TournamentCardProps {
  tournament: Tournament;
  readiness?: any;
  isGenerating: boolean;
  isSuperAdmin: boolean;
  onStatusUpdate: (id: string, status: string) => void;
  onGenerateFixtures: (id: string) => void;
  onGenerateKnockout: (id: string, stage: string) => void;
}

function TournamentCard({
  tournament,
  readiness,
  isGenerating,
  isSuperAdmin,
  onStatusUpdate,
  onGenerateFixtures,
  onGenerateKnockout,
}: TournamentCardProps) {
  return (
    <div className="group rounded-[30px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl transition-all hover:bg-white/[0.04] hover:border-blue-500/20 relative overflow-hidden">
      <div className="relative z-10 flex justify-between items-start mb-8">
        <div>
          <span className={`inline-flex px-3 py-1 mb-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            tournament.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
            tournament.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
            'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
          }`}>
            {tournament.status === 'ongoing' ? '🔴 Live' : tournament.status === 'upcoming' ? '⏳ Pending' : '🏆 Archived'}
          </span>
          <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">{tournament.name}</h3>
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">
            Season {tournament.season} • {new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-2xl">
          {tournament.status === 'completed' ? '🏆' : tournament.status === 'ongoing' ? '🔥' : '⏳'}
        </div>
      </div>

      <div className="relative z-10 flex flex-col border-t border-white/5 pt-6 gap-4">
        {tournament.status === 'upcoming' && (
          <div className="flex flex-col gap-3">
            {readiness && !readiness.isReady && (
              <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 p-3 text-[10px] font-bold text-orange-400 border border-orange-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Requires 28 teams ({readiness.totalTeams} registered) with 5+ players each before fixtures can be generated.</span>
              </div>
            )}
            {readiness?.isReady && !tournament.fixturesGenerated && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" /> All 28 teams are ready!
              </div>
            )}
            <div className="flex gap-3">
              {tournament.fixturesGenerated ? (
                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 border border-white/5">
                  <LockKeyhole className="h-3.5 w-3.5" /> Fixtures Generated
                </div>
              ) : !isSuperAdmin ? (
                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 border border-white/5 cursor-not-allowed" title="Only the Super Admin can generate fixtures">
                  <LockKeyhole className="h-3.5 w-3.5" /> Super Admin Only
                </div>
              ) : (
                <button
                  disabled={!readiness?.isReady || isGenerating}
                  onClick={() => onGenerateFixtures(tournament._id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600/10 disabled:hover:text-blue-500"
                >
                  <CalendarDays className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : '1. Generate Fixtures'}
                </button>
              )}
              {tournament.fixturesGenerated && tournament.currentStage !== 'final' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStageMap: any = {
                      'league': 'playoff',
                      'playoff': 'round_of_16',
                      'round_of_16': 'quarter_finals',
                      'quarter_finals': 'semi_finals',
                      'semi_finals': 'final'
                    };
                    const nextStage = nextStageMap[tournament.currentStage] || 'round_of_16';
                    if (confirm(`Generate fixtures for the ${nextStage.replace(/_/g, ' ')} stage?`)) {
                      onGenerateKnockout(tournament._id, nextStage);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-blue-500/20"
                  title="Generate Next Phase"
                >
                  <Flame className="h-3.5 w-3.5" />
                  {tournament.currentStage === 'league' ? 'Gen Playoffs' : 
                   tournament.currentStage === 'playoff' ? 'Gen R16' : 'Next Phase'}
                </button>
              )}

              <button 
                onClick={() => onStatusUpdate(tournament._id, 'ongoing')}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" /> 2. Start Season
              </button>
            </div>
          </div>
        )}
        {tournament.status === 'ongoing' && (
          <button
            onClick={() => { if (confirm('Mark this season as completed?')) onStatusUpdate(tournament._id, 'completed'); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600/10 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all hover:bg-blue-600 hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Completed
          </button>
        )}
        {tournament.status === 'completed' && (
          <div className="w-full text-center py-3 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">
            Archived Edition
          </div>
        )}
      </div>

      {tournament.status === 'ongoing' && (
        <div className="absolute inset-0 bg-emerald-500/5 opacity-50 z-0"></div>
      )}
    </div>
  );
}

export default function TournamentsManagementPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [readiness, setReadiness] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', season: '', startDate: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTourneyId, setSelectedTourneyId] = useState<string | null>(null);
  const [numRounds, setNumRounds] = useState(6);
  const [matchesPerDay, setMatchesPerDay] = useState(7);
  const [venueCount, setVenueCount] = useState(0);

  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'super_admin';

  const calculateEndDate = () => {
    const tournament = tournaments.find(t => t._id === selectedTourneyId);
    if (!tournament) return null;
    
    const totalMatches = numRounds * 14;
    const totalDaysNeeded = Math.ceil(totalMatches / matchesPerDay);
    
    let currentDate = new Date(tournament.startDate);
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
  const startTime = (() => {
    const tournament = tournaments.find(t => t._id === selectedTourneyId);
    if (!tournament) return null;
    const d = new Date(tournament.startDate);
    const diff = (6 - d.getUTCDay() + 7) % 7;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  })();

  const fetchTournaments = async () => {
    setIsLoading(true);
    try {
      const response: any = await apiClient.get('/tournaments');
      if (response.success) {
        setTournaments(response.data);
        const rData: Record<string, any> = {};
        for (const t of response.data) {
          if (t.status === 'upcoming') {
            try {
              const rRes: any = await apiClient.get(`/tournaments/${t._id}/readiness`);
              if (rRes.success) rData[t._id] = rRes.data;
            } catch (e) {}
          }
        }
        setReadiness(rData);
      }
    } catch (error) {
      toast.error('Failed to fetch tournaments');
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

  useEffect(() => { 
    fetchTournaments(); 
    fetchVenues();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response: any = await apiClient.post('/tournaments', newTournament);
      if (response.success) {
        toast.success('Season created successfully');
        setIsCreating(false);
        setNewTournament({ name: '', season: '', startDate: '' });
        fetchTournaments();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create season');
    }
  };

  const handleGenerateKnockout = async (tournamentId: string, stage: string) => {
    setIsLoading(true);
    try {
      const response: any = await apiClient.post(`/tournaments/${tournamentId}/generate-knockout`, {
        stage
      });
      if (response.success) {
        toast.success(`Knockout fixtures generated for ${stage.replace('_', ' ')}!`);
        fetchTournaments();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate knockout fixtures');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response: any = await apiClient.patch(`/tournaments/${id}`, { status });
      if (response.success) {
        toast.success(`Season status updated to ${status}`);
        fetchTournaments();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleGenerateFixtures = (id: string) => {
    setSelectedTourneyId(id);
    setIsModalOpen(true);
  };

  const confirmGenerate = async () => {
    if (!selectedTourneyId) return;

    setIsGenerating(selectedTourneyId);
    setIsModalOpen(false);
    try {
      const response: any = await apiClient.post(`/tournaments/${selectedTourneyId}/generate-fixtures`, {
        numRounds,
        matchesPerDay
      });
      if (response.success) {
        toast.success(`Fixtures successfully generated (${numRounds} rounds, ${matchesPerDay} matches/day)!`);
        fetchTournaments();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate fixtures');
    } finally {
      setIsGenerating(null);
      setSelectedTourneyId(null);
    }
  };

  const ongoing = tournaments.filter(t => t.status === 'ongoing');
  const upcoming = tournaments.filter(t => t.status === 'upcoming');
  const completed = tournaments.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  const SectionHeader = ({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) => (
    <div className={`flex items-center gap-3 mb-6`}>
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <h2 className="text-sm font-black uppercase tracking-widest text-white">{label}</h2>
      <span className="ml-1 rounded-full bg-white/5 px-3 py-0.5 text-[10px] font-black text-neutral-500">{count}</span>
    </div>
  );

  return (
    <div className="space-y-14 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Seasons.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Tournament Configuration</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20"
        >
          <Plus className="h-4 w-4" /> Initialize Season
        </button>
      </div>

      {isCreating && (
        <div className="rounded-[40px] border border-blue-500/20 bg-blue-500/5 p-8 backdrop-blur-3xl animate-reveal">
          <h2 className="text-xl font-black italic tracking-tighter text-white uppercase mb-6">New Season Initializer</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tournament Name</label>
              <input type="text" required value={newTournament.name} onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} placeholder="e.g. SolidFM 5-Aside" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Season Year</label>
              <input type="text" required value={newTournament.season} onChange={(e) => setNewTournament({ ...newTournament, season: e.target.value })} placeholder="e.g. 2026" className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
              <input type="date" required value={newTournament.startDate} onChange={(e) => setNewTournament({ ...newTournament, startDate: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/50 px-6 py-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none [color-scheme:dark]" />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsCreating(false)} className="h-[54px] flex-1 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">Cancel</button>
              <button type="submit" className="h-[54px] flex-1 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">Confirm</button>
            </div>
          </form>
        </div>
      )}

      {/* ONGOING */}
      {ongoing.length > 0 && (
        <section>
          <SectionHeader icon={<Flame className="h-4 w-4 text-emerald-500" />} label="Active Season" count={ongoing.length} color="bg-emerald-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ongoing.map(t => (
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} isGenerating={isGenerating === t._id} isSuperAdmin={isSuperAdmin} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeader icon={<Clock className="h-4 w-4 text-yellow-500" />} label="Upcoming / Pending" count={upcoming.length} color="bg-yellow-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcoming.map(t => (
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} isGenerating={isGenerating === t._id} isSuperAdmin={isSuperAdmin} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
            ))}
          </div>
        </section>
      )}

      {/* COMPLETED */}
      {completed.length > 0 && (
        <section>
          <SectionHeader icon={<Archive className="h-4 w-4 text-blue-400" />} label="Past Editions" count={completed.length} color="bg-blue-500/10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completed.map(t => (
              <TournamentCard key={t._id} tournament={t} readiness={readiness[t._id]} isGenerating={isGenerating === t._id} isSuperAdmin={isSuperAdmin} onStatusUpdate={handleStatusUpdate} onGenerateFixtures={handleGenerateFixtures} onGenerateKnockout={handleGenerateKnockout} />
            ))}
          </div>
        </section>
      )}

      {tournaments.length === 0 && (
        <div className="p-12 text-center rounded-[40px] border border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] italic">No tournaments found. Initialize the first season!</p>
        </div>
      )}

      {/* Fixture Configuration Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTourneyId(null);
        }} 
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
              onClick={() => {
                setIsModalOpen(false);
                setSelectedTourneyId(null);
              }}
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

