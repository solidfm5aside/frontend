'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/api-client';
import { Select } from '@/components/ui/Select';
import { lagosDateTimeInputToIso, toLagosDateTimeInput } from '@/utils/format';
import type { CompetitionEntry } from '@/types/competition';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface VenueOption {
  _id: string;
  name: string;
}

interface WomensLeagueFixture {
  matchId?: string;
  fixtureKey?: string;
  officialNumber: number;
  homeEntryId: string;
  awayEntryId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  kickoffAt: string | null;
  venue: string | null;
  scheduleStatus: 'confirmed' | 'pending';
}

interface WomensLeagueFixturePlan {
  tournamentId: string;
  tournamentRevision: number;
  totalMatches: number;
  confirmedCount: number;
  pendingCount: number;
  fixtures: WomensLeagueFixture[];
  planHash: string;
  status?: 'published' | 'not_published';
  sourceReference?: string;
}

interface PlanResult extends Partial<WomensLeagueFixturePlan> {
  status: 'published' | 'not_published';
  fixtures: WomensLeagueFixture[];
}

interface DraftRow {
  matchId?: string;
  officialNumber: number;
  homeEntryId: string;
  awayEntryId: string;
  kickoffAt: string;
  venue: string;
}

interface StoredDraft {
  schemaVersion: 1;
  revision: number;
  sourceReference: string;
  rows: DraftRow[];
}

interface WomensLeagueFixtureEditorProps {
  tournamentId: string;
  revision: number;
  entries: CompetitionEntry[];
  venues: VenueOption[];
  canManage: boolean;
  canReview: boolean;
  canPublish: boolean;
  onPublished: () => Promise<void> | void;
}

const FIXTURE_COUNT = 3;
const inputClassName =
  'min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-xs';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function blankRows(): DraftRow[] {
  return Array.from({ length: FIXTURE_COUNT }, (_, index) => ({
    officialNumber: index + 1,
    homeEntryId: '',
    awayEntryId: '',
    kickoffAt: '',
    venue: '',
  }));
}

function rowsFromFixtures(fixtures: WomensLeagueFixture[]): DraftRow[] {
  if (fixtures.length !== FIXTURE_COUNT) return blankRows();
  return [...fixtures]
    .sort((left, right) => left.officialNumber - right.officialNumber)
    .map((fixture) => ({
      matchId: fixture.matchId,
      officialNumber: fixture.officialNumber,
      homeEntryId: fixture.homeEntryId,
      awayEntryId: fixture.awayEntryId,
      kickoffAt: toLagosDateTimeInput(fixture.kickoffAt),
      venue: fixture.venue ?? '',
    }));
}

function scheduleState(row: DraftRow) {
  if (row.kickoffAt && row.venue) return 'confirmed' as const;
  if (!row.kickoffAt && !row.venue) return 'pending' as const;
  return 'incomplete' as const;
}

function toOfficialInput(row: DraftRow) {
  const hasSchedule = Boolean(row.kickoffAt && row.venue);
  return {
    officialNumber: row.officialNumber,
    homeEntryId: row.homeEntryId,
    awayEntryId: row.awayEntryId,
    kickoffAt: hasSchedule ? lagosDateTimeInputToIso(row.kickoffAt) : null,
    venue: hasSchedule ? row.venue : null,
  };
}

function isStoredDraft(value: unknown): value is StoredDraft {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as StoredDraft;
  return candidate.schemaVersion === 1 &&
    Number.isInteger(candidate.revision) &&
    typeof candidate.sourceReference === 'string' &&
    candidate.sourceReference.length <= 200 &&
    Array.isArray(candidate.rows) &&
    candidate.rows.length === FIXTURE_COUNT &&
    candidate.rows.every((row, index) => row?.officialNumber === index + 1 &&
      typeof row.homeEntryId === 'string' &&
      typeof row.awayEntryId === 'string' &&
      typeof row.kickoffAt === 'string' &&
      typeof row.venue === 'string');
}

function removeStoredDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Server state remains authoritative when storage is unavailable.
  }
}

function pairingError(rows: DraftRow[], entries: CompetitionEntry[]) {
  if (entries.length !== 3) return 'Exactly three women’s teams must be entered first.';
  if (rows.some((row) => !row.homeEntryId || !row.awayEntryId || row.homeEntryId === row.awayEntryId)) {
    return 'Choose two different teams for every fixture.';
  }
  const validEntryIds = new Set(entries.map((entry) => entry._id));
  if (rows.some((row) => !validEntryIds.has(row.homeEntryId) || !validEntryIds.has(row.awayEntryId))) {
    return 'Every pairing must use one of this tournament’s three women’s teams.';
  }
  const pairKeys = rows.map((row) => [row.homeEntryId, row.awayEntryId].sort().join(':'));
  if (new Set(pairKeys).size !== FIXTURE_COUNT) return 'Each pair of teams must meet exactly once.';
  const appearances = new Map(entries.map((entry) => [entry._id, 0]));
  for (const row of rows) {
    appearances.set(row.homeEntryId, (appearances.get(row.homeEntryId) ?? 0) + 1);
    appearances.set(row.awayEntryId, (appearances.get(row.awayEntryId) ?? 0) + 1);
  }
  if ([...appearances.values()].some((count) => count !== 2)) {
    return 'Each team must appear in exactly two league fixtures.';
  }
  return null;
}

export function WomensLeagueFixtureEditor({
  tournamentId,
  revision,
  entries,
  venues,
  canManage,
  canReview,
  canPublish,
  onPublished,
}: WomensLeagueFixtureEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(blankRows);
  const [sourceReference, setSourceReference] = useState('');
  const [plan, setPlan] = useState<WomensLeagueFixturePlan | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'review' | 'publish' | null>(null);
  const requestSequence = useRef(0);
  const storageKey = `solidfm:womens-league-fixture-draft:v1:${tournamentId}`;

  const loadPlan = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.get<ApiResponse<PlanResult>, ApiResponse<PlanResult>>(
        `/tournaments/${tournamentId}/competition/league-fixtures/plan`,
      );
      if (!response.success) throw new Error(response.message || 'Women’s official fixture sheet could not be loaded');
      if (requestId !== requestSequence.current) return;

      const published = response.data.status === 'published' && response.data.fixtures.length === FIXTURE_COUNT;
      setIsPublished(published);
      if (published) {
        setRows(rowsFromFixtures(response.data.fixtures));
        setSourceReference(response.data.sourceReference ?? '');
        setPlan(response.data as WomensLeagueFixturePlan);
        removeStoredDraft(storageKey);
      } else {
        let restoredRows = blankRows();
        let restoredSource = '';
        try {
          const storedValue = window.localStorage.getItem(storageKey);
          const parsed: unknown = storedValue ? JSON.parse(storedValue) : null;
          if (isStoredDraft(parsed) && parsed.revision === revision) {
            restoredRows = parsed.rows;
            restoredSource = parsed.sourceReference;
          }
        } catch {
          removeStoredDraft(storageKey);
        }
        setRows(restoredRows);
        setSourceReference(restoredSource);
        setPlan(null);
      }
    } catch (error: unknown) {
      if (requestId === requestSequence.current) {
        setLoadError(getErrorMessage(error, 'Failed to load the women’s official fixture sheet'));
      }
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
        const stored: StoredDraft = { schemaVersion: 1, revision, sourceReference, rows };
        window.localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        // The editor remains usable without browser storage.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isLoading, isPublished, revision, rows, sourceReference, storageKey]);

  const entryNames = useMemo(
    () => new Map(entries.map((entry) => [entry._id, entry.teamId.name])),
    [entries],
  );
  const scheduleIncompleteCount = rows.filter((row) => scheduleState(row) === 'incomplete').length;
  const confirmedCount = rows.filter((row) => scheduleState(row) === 'confirmed').length;
  const pendingCount = rows.filter((row) => scheduleState(row) === 'pending').length;
  const currentPairingError = pairingError(rows, entries);
  const canSubmitForReview = !currentPairingError && scheduleIncompleteCount === 0;

  const updateRow = (officialNumber: number, patch: Partial<DraftRow>) => {
    if (isPublished || busyAction) return;
    setRows((current) => current.map((row) => row.officialNumber === officialNumber
      ? { ...row, ...patch }
      : row));
    setPlan(null);
  };

  const handleReview = async () => {
    if (!canManage || !canReview || !canSubmitForReview || busyAction) return;
    setBusyAction('review');
    try {
      const response = await apiClient.post<ApiResponse<WomensLeagueFixturePlan>, ApiResponse<WomensLeagueFixturePlan>>(
        `/tournaments/${tournamentId}/competition/league-fixtures/preview`,
        {
          expectedRevision: revision,
          fixtures: rows.map(toOfficialInput),
          ...(sourceReference.trim() ? { sourceReference: sourceReference.trim() } : {}),
        },
      );
      if (!response.success) throw new Error(response.message || 'Women’s official fixture sheet could not be reviewed');
      setPlan(response.data);
      setRows(rowsFromFixtures(response.data.fixtures));
      toast.success(`Women’s official sheet verified: ${response.data.confirmedCount} confirmed, ${response.data.pendingCount} TBC`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to review the women’s official fixture sheet'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    if (!plan || !canManage || !canPublish || busyAction) return;
    if (!window.confirm(`Publish the three official women’s league fixtures? ${plan.pendingCount} fixture(s) will remain schedule TBC.`)) return;
    setBusyAction('publish');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/league-fixtures/publish`,
        {
          expectedRevision: revision,
          planHash: plan.planHash,
          fixtures: rows.map(toOfficialInput),
          ...(sourceReference.trim() ? { sourceReference: sourceReference.trim() } : {}),
        },
        {
          headers: {
            'Idempotency-Key': `solidfm:${tournamentId}:womens-league:${revision}:${plan.planHash}`,
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Women’s official fixtures could not be published');
      removeStoredDraft(storageKey);
      toast.success('Women’s official league fixture sheet published');
      await onPublished();
      await loadPlan();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish the women’s official fixtures'));
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/5 bg-black/20" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-blue-400" /><span className="sr-only">Loading women’s official fixture sheet</span></div>;
  }

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between">
        <span>{loadError}</span>
        <button type="button" onClick={() => void loadPlan()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/20 px-4 text-[9px] font-black uppercase tracking-widest text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Official fixtures</p><p className="mt-2 text-2xl font-black italic text-white">3</p></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Schedule confirmed</p><p className="mt-2 text-2xl font-black italic text-white">{confirmedCount}</p></div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-yellow-300">Schedule TBC</p><p className="mt-2 text-2xl font-black italic text-white">{pendingCount}</p></div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 text-xs leading-relaxed text-neutral-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>Record the three pairings exactly as agreed through the physical process. The app validates one meeting per pair but never chooses the pairings or schedule.</span>
      </div>

      <div className="space-y-2">
        <label htmlFor={`womens-source-${tournamentId}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Official source / reference <span className="normal-case tracking-normal">(optional)</span></label>
        <input id={`womens-source-${tournamentId}`} maxLength={200} disabled={isPublished || !canManage || Boolean(busyAction)} value={sourceReference} onChange={(event) => { setSourceReference(event.target.value); setPlan(null); }} placeholder="e.g. Physical fixture sheet approved 24 Aug 2026" className={inputClassName} />
      </div>

      {isPublished && pendingCount > 0 ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-100 sm:flex-row sm:items-center sm:justify-between">
          <span><strong>{pendingCount} fixture{pendingCount === 1 ? '' : 's'}</strong> still need a physically confirmed kickoff and venue.</span>
          <Link href={`/admin/matches?tournament=${tournamentId}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-[9px] font-black uppercase tracking-widest text-black"><Clock3 className="h-3.5 w-3.5" /> Open Match Centre</Link>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const state = scheduleState(row);
          const currentVenueMissing = row.venue && !venues.some((venue) => venue.name === row.venue);
          return (
            <fieldset key={row.officialNumber} disabled={isPublished || !canManage || Boolean(busyAction)} className={`rounded-2xl border p-4 disabled:opacity-80 ${state === 'incomplete' ? 'border-red-500/30 bg-red-500/5' : state === 'pending' ? 'border-yellow-500/20 bg-yellow-500/[0.04]' : 'border-white/5 bg-black/20'}`}>
              <legend className="sr-only">Women’s official league fixture {row.officialNumber}</legend>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Official fixture {row.officialNumber}</span>
                <span className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-widest ${state === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : state === 'pending' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-red-500/10 text-red-300'}`}>{state === 'confirmed' ? 'Confirmed' : state === 'pending' ? 'Schedule TBC' : 'Complete both schedule fields'}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(150px,1fr)_24px_minmax(150px,1fr)_190px_170px] lg:items-end">
                <div className="space-y-1.5">
                  <label htmlFor={`womens-home-${tournamentId}-${row.officialNumber}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Home team</label>
                  <Select id={`womens-home-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.homeEntryId} onChange={(event) => updateRow(row.officialNumber, { homeEntryId: event.target.value })}>
                    <option value="">Choose women’s team…</option>
                    {entries.map((entry) => <option key={entry._id} value={entry._id} disabled={entry._id === row.awayEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <span aria-hidden="true" className="hidden pb-3 text-center text-[8px] font-black text-neutral-700 lg:block">VS</span>
                <div className="space-y-1.5">
                  <label htmlFor={`womens-away-${tournamentId}-${row.officialNumber}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Away team</label>
                  <Select id={`womens-away-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.awayEntryId} onChange={(event) => updateRow(row.officialNumber, { awayEntryId: event.target.value })}>
                    <option value="">Choose women’s team…</option>
                    {entries.map((entry) => <option key={entry._id} value={entry._id} disabled={entry._id === row.homeEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`womens-kickoff-${tournamentId}-${row.officialNumber}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><CalendarCheck2 className="h-3 w-3" /> Kickoff (Africa/Lagos) or TBC</label>
                  <input id={`womens-kickoff-${tournamentId}-${row.officialNumber}`} type="datetime-local" value={row.kickoffAt} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.officialNumber, { kickoffAt: event.target.value })} className={inputClassName} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`womens-venue-${tournamentId}-${row.officialNumber}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><MapPin className="h-3 w-3" /> Venue or TBC</label>
                  <Select id={`womens-venue-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.venue} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.officialNumber, { venue: event.target.value })}>
                    <option value="">Schedule TBC</option>
                    {currentVenueMissing ? <option value={row.venue}>{row.venue} (current)</option> : null}
                    {venues.map((venue) => <option key={venue._id} value={venue.name}>{venue.name}</option>)}
                  </Select>
                </div>
              </div>
              {isPublished ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3 text-[8px] font-bold uppercase tracking-wider text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>{entryNames.get(row.homeEntryId) ?? 'Home pending'} vs {entryNames.get(row.awayEntryId) ?? 'Away pending'} • Africa/Lagos</span>
                  <Link href={`/admin/matches?tournament=${tournamentId}&${row.matchId ? `match=${row.matchId}` : `fixture=${row.officialNumber}`}`} className="inline-flex min-h-10 items-center text-white underline decoration-white/20 underline-offset-4">{state === 'pending' ? 'Add official schedule' : 'Edit in Match Centre'}</Link>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>

      {!isPublished ? (
        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-[#07131a]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-white">{plan ? `Server verified • ${plan.planHash.slice(0, 12)}…` : 'Draft stays on this device until publication'}</p>
            <p className="mt-1 text-[9px] text-neutral-500">{currentPairingError ?? `${scheduleIncompleteCount} partial schedule(s) • ${pendingCount} valid TBC`}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void handleReview()} disabled={!canManage || !canReview || !canSubmitForReview || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 text-[9px] font-black uppercase tracking-widest text-blue-200 disabled:cursor-not-allowed disabled:opacity-40">
              {busyAction === 'review' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Review official sheet
            </button>
            {plan ? (
              <button type="button" onClick={() => void handlePublish()} disabled={!canManage || !canPublish || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
                {busyAction === 'publish' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Publish official fixtures
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {scheduleIncompleteCount > 0 || currentPairingError ? (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {currentPairingError ?? 'A kickoff and venue must either both be filled or both remain blank.'}</p>
      ) : null}
    </div>
  );
}
