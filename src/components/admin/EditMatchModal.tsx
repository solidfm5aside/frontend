import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';

interface Venue {
  name: string;
  _id: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toLocalDateTimeInput(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const localTime = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

interface EditMatchModalProps {
  matchId: string;
  initialDate: string;
  initialVenue: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditMatchModal({ matchId, initialDate, initialVenue, onClose, onUpdate }: EditMatchModalProps) {
  const [date, setDate] = useState(() => toLocalDateTimeInput(initialDate));
  const [venue, setVenue] = useState(initialVenue || '');
  const [isSaving, setIsSaving] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueLoadError, setVenueLoadError] = useState<string | null>(null);
  const venueRequestIdRef = useRef(0);

  const fetchVenues = useCallback(async () => {
    const requestId = ++venueRequestIdRef.current;
    setLoadingVenues(true);

    try {
      const response = await apiClient.get<ApiResponse<Venue[]>, ApiResponse<Venue[]>>('/venues');
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || 'Failed to load the venue catalogue');
      }
      if (requestId !== venueRequestIdRef.current) return;

      setVenues(response.data);
      setVenue((currentVenue) => currentVenue || response.data[0]?.name || '');
      setVenueLoadError(response.data.length === 0 ? 'No active venues are currently registered' : null);
    } catch (error: unknown) {
      if (requestId !== venueRequestIdRef.current) return;
      setVenueLoadError(getErrorMessage(error, 'Failed to load the venue catalogue'));
    } finally {
      if (requestId === venueRequestIdRef.current) setLoadingVenues(false);
    }
  }, []);

  useEffect(() => {
    void fetchVenues();

    return () => {
      venueRequestIdRef.current += 1;
    };
  }, [fetchVenues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(`/matches/${matchId}/details`, {
        date: new Date(date).toISOString(),
        venue
      });
      if (response.success) {
        toast.success('Match details updated successfully');
        onUpdate();
        onClose();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update match details'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-reveal">
      <div role="dialog" aria-modal="true" aria-labelledby="edit-match-title" className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[40px] border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 id="edit-match-title" className="text-2xl font-black italic tracking-tighter text-white uppercase">Reschedule</h2>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Update time and venue</p>
          </div>
          <button
            type="button"
            aria-label="Close match editor"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="edit-match-date" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Date & Time</label>
            <input
              id="edit-match-date"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-match-venue" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Venue</label>
            <div className="relative">
              <select
                id="edit-match-venue"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                disabled={loadingVenues || (!venue && venues.length === 0)}
                aria-describedby={venueLoadError ? 'edit-match-venue-error' : loadingVenues ? 'edit-match-venue-status' : undefined}
                aria-invalid={venueLoadError && !venue ? true : undefined}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder:text-neutral-700 font-medium appearance-none disabled:opacity-50"
              >
                <option value="" disabled>Select a venue</option>
                {venue && !venues.some((item) => item.name === venue) ? (
                  <option value={venue}>{venue} (current venue)</option>
                ) : null}
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
            {loadingVenues ? (
              <p id="edit-match-venue-status" role="status" className="text-[10px] font-bold text-neutral-500">
                Loading venue catalogue...
              </p>
            ) : null}
            {venueLoadError ? (
              <div id="edit-match-venue-error" role="alert" className="flex flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {venueLoadError}. {venue
                    ? 'The current venue is preserved; retry to choose another venue.'
                    : 'Retry before saving because this match has no usable venue.'}
                </p>
                <button
                  type="button"
                  onClick={() => void fetchVenues()}
                  disabled={loadingVenues}
                  className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4 disabled:opacity-50"
                >
                  {loadingVenues ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            ) : null}
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
              disabled={isSaving || !venue}
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
