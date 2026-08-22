import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Select } from '@/components/ui/Select';
import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import { lagosDateTimeInputToIso, toLagosDateTimeInput } from '@/utils/format';

interface Venue {
  name: string;
  _id: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface EditMatchModalProps {
  matchId: string;
  initialDate: string | null;
  initialVenue: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function EditMatchModal({ matchId, initialDate, initialVenue, onClose, onUpdate }: EditMatchModalProps) {
  const [date, setDate] = useState(() => toLagosDateTimeInput(initialDate));
  const [venue, setVenue] = useState(initialVenue || '');
  const [isSchedulePending, setIsSchedulePending] = useState(() => !initialDate && !initialVenue);
  const [isSaving, setIsSaving] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueLoadError, setVenueLoadError] = useState<string | null>(null);
  const venueRequestIdRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isSavingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const requestClose = useCallback(() => {
    if (!isSavingRef.current) onCloseRef.current();
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;

      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)).filter(
        (element) => !element.matches(':disabled') && element.getClientRects().length > 0
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [requestClose]);

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
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      if (!isSchedulePending && (!date || !venue)) {
        toast.error('Enter both the physically confirmed kickoff and venue, or leave both TBC');
        return;
      }
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(`/matches/${matchId}/details`, isSchedulePending
        ? { date: null, venue: null }
        : { date: lagosDateTimeInputToIso(date), venue });
      if (response.success) {
        toast.success('Match details updated successfully');
        onUpdate();
        onClose();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update match details'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-reveal">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close match editor"
        disabled={isSaving}
        onClick={requestClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-match-title"
        aria-describedby="edit-match-description"
        aria-busy={isSaving}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[40px] border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 id="edit-match-title" className="text-2xl font-black italic tracking-tighter text-white uppercase">Official Schedule</h2>
            <p id="edit-match-description" className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Record the physically confirmed kickoff and venue</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close match editor"
            disabled={isSaving}
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSaving} className="space-y-6 disabled:opacity-70">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs font-bold text-yellow-100">
            <input
              type="checkbox"
              checked={isSchedulePending}
              onChange={(event) => {
                setIsSchedulePending(event.target.checked);
                if (event.target.checked) {
                  setDate('');
                  setVenue('');
                }
              }}
              className="h-4 w-4 accent-yellow-400"
            />
            Keep kickoff and venue marked Schedule TBC
          </label>
          <div className="space-y-2">
            <label htmlFor="edit-match-date" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Date & Time • Africa/Lagos</label>
            <input
              id="edit-match-date"
              type="datetime-local"
              required={!isSchedulePending}
              disabled={isSchedulePending}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 font-mono text-base text-white transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [@media(pointer:fine)]:text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-match-venue" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 block">Venue</label>
            <Select
              id="edit-match-venue"
              required={!isSchedulePending}
              controlSize="large"
              surface="black"
              fontWeight="medium"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              disabled={isSchedulePending || loadingVenues || venues.length === 0}
              aria-describedby={venueLoadError ? 'edit-match-venue-error' : loadingVenues ? 'edit-match-venue-status' : undefined}
              aria-invalid={venueLoadError && !venue ? true : undefined}
            >
              <option value="" disabled>Select a venue</option>
              {venue && !venues.some((item) => item.name === venue) ? (
                <option value={venue}>{venue} (current venue)</option>
              ) : null}
              {venues.map((v) => (
                <option key={v._id} value={v.name}>{v.name}</option>
              ))}
            </Select>
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
                    : isSchedulePending ? 'The match remains honestly marked TBC.' : 'Retry before saving because this match has no usable venue.'}
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
              disabled={isSaving}
              onClick={requestClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (!isSchedulePending && (!date || !venue))}
              className="flex-1 rounded-xl bg-blue-600 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
