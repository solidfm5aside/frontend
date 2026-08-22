'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Clock3, LoaderCircle, MapPin, RefreshCw, ShieldCheck, Trophy } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/api-client';
import { Select } from '@/components/ui/Select';
import { lagosDateTimeInputToIso, toLagosDateTimeInput } from '@/utils/format';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface VenueOption {
  _id: string;
  name: string;
}

interface WomensFinalPlan {
  status?: 'published' | 'champion_decided' | 'not_published';
  tournamentId: string;
  tournamentRevision: number;
  stage: 'final';
  officialNumber: 4;
  fixtureKey: string;
  homeQualificationRank: 1;
  awayQualificationRank: 2;
  homeEntryId: string;
  awayEntryId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: string | null;
  venue: string | null;
  scheduleStatus: 'confirmed' | 'pending';
  sourceReference?: string | null;
  planHash: string;
  matchId?: string;
}

interface WomensFinalFixtureEditorProps {
  tournamentId: string;
  revision: number;
  venues: VenueOption[];
  canManage: boolean;
  canReview: boolean;
  canPublish: boolean;
  homeTeamName: string;
  awayTeamName: string;
  onPublished: () => Promise<void> | void;
}

interface StoredDraft {
  schemaVersion: 1;
  revision: number;
  kickoffAt: string;
  venue: string;
  sourceReference: string;
}

const inputClassName =
  'min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-xs';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function removeDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Publishing remains authoritative when browser storage is unavailable.
  }
}

export function WomensFinalFixtureEditor({
  tournamentId,
  revision,
  venues,
  canManage,
  canReview,
  canPublish,
  homeTeamName,
  awayTeamName,
  onPublished,
}: WomensFinalFixtureEditorProps) {
  const [kickoffAt, setKickoffAt] = useState('');
  const [venue, setVenue] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [plan, setPlan] = useState<WomensFinalPlan | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'review' | 'publish' | null>(null);
  const requestSequence = useRef(0);
  const storageKey = `solidfm:womens-final-draft:v1:${tournamentId}`;

  const loadPlan = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.get<ApiResponse<Partial<WomensFinalPlan>>, ApiResponse<Partial<WomensFinalPlan>>>(
        `/tournaments/${tournamentId}/competition/final/plan`,
      );
      if (!response.success) throw new Error(response.message || 'The women’s final record could not be loaded');
      if (requestId !== requestSequence.current) return;
      const published = (response.data.status === 'published' || response.data.status === 'champion_decided') && Boolean(response.data.planHash);
      setIsPublished(published);
      if (published) {
        const publishedPlan = response.data as WomensFinalPlan;
        setPlan(publishedPlan);
        setKickoffAt(toLagosDateTimeInput(publishedPlan.kickoffAt));
        setVenue(publishedPlan.venue ?? '');
        setSourceReference(publishedPlan.sourceReference ?? '');
        removeDraft(storageKey);
        return;
      }

      setPlan(null);
      let restoredKickoff = '';
      let restoredVenue = '';
      let restoredSource = '';
      try {
        const storedValue = window.localStorage.getItem(storageKey);
        const stored = storedValue ? JSON.parse(storedValue) as Partial<StoredDraft> : null;
        if (stored?.schemaVersion === 1 && stored.revision === revision) {
          restoredKickoff = typeof stored.kickoffAt === 'string' ? stored.kickoffAt : '';
          restoredVenue = typeof stored.venue === 'string' ? stored.venue : '';
          restoredSource = typeof stored.sourceReference === 'string' ? stored.sourceReference.slice(0, 200) : '';
        }
      } catch {
        removeDraft(storageKey);
      }
      setKickoffAt(restoredKickoff);
      setVenue(restoredVenue);
      setSourceReference(restoredSource);
    } catch (error: unknown) {
      if (requestId === requestSequence.current) setLoadError(getErrorMessage(error, 'Failed to load the women’s final record'));
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [revision, storageKey, tournamentId]);

  useEffect(() => {
    void loadPlan();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadPlan]);

  useEffect(() => {
    if (isLoading || isPublished) return;
    const timer = window.setTimeout(() => {
      try {
        const draft: StoredDraft = { schemaVersion: 1, revision, kickoffAt, venue, sourceReference };
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // The editor remains usable without browser storage.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isLoading, isPublished, kickoffAt, revision, sourceReference, storageKey, venue]);

  const hasConfirmedSchedule = Boolean(kickoffAt && venue);
  const hasPendingSchedule = !kickoffAt && !venue;
  const scheduleValid = hasConfirmedSchedule || hasPendingSchedule;
  const currentVenueMissing = venue && !venues.some((option) => option.name === venue);

  const buildSchedule = () => ({
    expectedRevision: revision,
    kickoffAt: hasConfirmedSchedule ? lagosDateTimeInputToIso(kickoffAt) : null,
    venue: hasConfirmedSchedule ? venue : null,
    ...(sourceReference.trim() ? { sourceReference: sourceReference.trim() } : {}),
  });

  const handleReview = async () => {
    if (!canManage || !canReview || !scheduleValid || busyAction) return;
    setBusyAction('review');
    try {
      const response = await apiClient.post<ApiResponse<WomensFinalPlan>, ApiResponse<WomensFinalPlan>>(
        `/tournaments/${tournamentId}/competition/final/preview`,
        buildSchedule(),
      );
      if (!response.success) throw new Error(response.message || 'The women’s final could not be reviewed');
      setPlan(response.data);
      setKickoffAt(toLagosDateTimeInput(response.data.kickoffAt));
      setVenue(response.data.venue ?? '');
      toast.success('Top-two final pairing and schedule verified');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to review the women’s final'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    if (!plan || !canManage || !canPublish || busyAction) return;
    if (!window.confirm(`Publish ${plan.homeTeamName} vs ${plan.awayTeamName} as the official women’s final?`)) return;
    setBusyAction('publish');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/final/publish`,
        { ...buildSchedule(), planHash: plan.planHash },
        {
          headers: {
            'Idempotency-Key': `solidfm:${tournamentId}:womens-final:${revision}:${plan.planHash}`,
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'The women’s final could not be published');
      removeDraft(storageKey);
      toast.success('Women’s final published');
      await onPublished();
      await loadPlan();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish the women’s final'));
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) return <div className="flex min-h-36 items-center justify-center rounded-2xl border border-white/5 bg-black/20" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-blue-400" /><span className="sr-only">Loading women’s final</span></div>;

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between">
        <span>{loadError}</span>
        <button type="button" onClick={() => void loadPlan()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/20 px-4 text-[9px] font-black uppercase tracking-widest text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
      </div>
    );
  }

  const displayedHome = plan?.homeTeamName ?? homeTeamName;
  const displayedAway = plan?.awayTeamName ?? awayTeamName;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Top two • one final</p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
          <span className="truncate text-sm font-black uppercase text-white sm:text-lg" title={displayedHome}>{displayedHome || 'League rank 1'}</span>
          <span className="text-[9px] font-black uppercase text-neutral-600">vs</span>
          <span className="truncate text-sm font-black uppercase text-white sm:text-lg" title={displayedAway}>{displayedAway || 'League rank 2'}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`womens-final-kickoff-${tournamentId}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><CalendarCheck2 className="h-3 w-3" /> Kickoff (Africa/Lagos) or TBC</label>
          <input id={`womens-final-kickoff-${tournamentId}`} type="datetime-local" disabled={isPublished || !canManage || Boolean(busyAction)} value={kickoffAt} aria-invalid={!scheduleValid} onChange={(event) => { setKickoffAt(event.target.value); setPlan(null); }} className={inputClassName} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`womens-final-venue-${tournamentId}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><MapPin className="h-3 w-3" /> Venue or TBC</label>
          <Select id={`womens-final-venue-${tournamentId}`} controlSize="compact" disabled={isPublished || !canManage || Boolean(busyAction)} value={venue} aria-invalid={!scheduleValid} onChange={(event) => { setVenue(event.target.value); setPlan(null); }}>
            <option value="">Schedule TBC</option>
            {currentVenueMissing ? <option value={venue}>{venue} (current)</option> : null}
            {venues.map((option) => <option key={option._id} value={option.name}>{option.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`womens-final-source-${tournamentId}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Official source <span className="normal-case tracking-normal">(optional)</span></label>
          <input id={`womens-final-source-${tournamentId}`} maxLength={200} disabled={isPublished || !canManage || Boolean(busyAction)} value={sourceReference} onChange={(event) => { setSourceReference(event.target.value); setPlan(null); }} placeholder="Physical final schedule reference" className={inputClassName} />
        </div>
      </div>

      {!scheduleValid ? <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">Kickoff and venue must either both be filled or both remain TBC.</p> : null}

      {isPublished ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4" /> Official final published • {hasConfirmedSchedule ? 'schedule confirmed' : 'schedule TBC'}</span>
          <Link href={`/admin/matches?tournament=${tournamentId}${plan?.matchId ? `&match=${plan.matchId}` : ''}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[9px] font-black uppercase tracking-widest text-black"><Clock3 className="h-3.5 w-3.5" /> Open Final</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-[#07131a]/95 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-widest text-white">{plan ? `Server verified • ${plan.planHash.slice(0, 12)}…` : 'The app derives rank 1 vs rank 2; it does not run a draw'}</p><p className="mt-1 text-[9px] text-neutral-500">{hasPendingSchedule ? 'A valid schedule-TBC record' : scheduleValid ? 'Kickoff and venue ready for review' : 'Complete both schedule fields'}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void handleReview()} disabled={!canManage || !canReview || !scheduleValid || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 text-[9px] font-black uppercase tracking-widest text-blue-200 disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'review' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Review final</button>
            {plan ? <button type="button" onClick={() => void handlePublish()} disabled={!canManage || !canPublish || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'publish' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Publish final</button> : null}
          </div>
        </div>
      )}
    </div>
  );
}
