import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface EditMatchModalProps {
  matchId: string;
  initialDate: string;
  initialVenue: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditMatchModal({ matchId, initialDate, initialVenue, onClose, onUpdate }: EditMatchModalProps) {
  const [date, setDate] = useState(
    initialDate ? new Date(initialDate).toISOString().slice(0, 16) : ''
  );
  const [venue, setVenue] = useState(initialVenue || '');
  const [isSaving, setIsSaving] = useState(false);
  const [venues, setVenues] = useState<{name: string, _id: string}[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response: any = await apiClient.get('/venues');
        if (response.success && response.data) {
          setVenues(response.data);
          if (!initialVenue && response.data.length > 0) {
            setVenue(response.data[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load venues');
      } finally {
        setLoadingVenues(false);
      }
    };
    fetchVenues();
  }, [initialVenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response: any = await apiClient.patch(`/matches/${matchId}/details`, {
        date: new Date(date).toISOString(),
        venue
      });
      if (response.success) {
        toast.success('Match details updated successfully');
        onUpdate();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update match details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-reveal">
      <div className="w-full max-w-md rounded-[40px] border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Reschedule</h2>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Update time and venue</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Venue</label>
            <div className="relative">
              <select
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={loadingVenues}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder:text-neutral-700 font-medium appearance-none disabled:opacity-50"
              >
                <option value="" disabled>Select a venue</option>
                {venues.map((v) => (
                  <option key={v._id} value={v.name}>{v.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-blue-600 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
