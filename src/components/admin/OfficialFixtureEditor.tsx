'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CalendarCheck2, CheckCircle2, Clock3, LoaderCircle, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Select } from '@/components/ui/Select';
import apiClient from '@/lib/api-client';
import { lagosDateTimeInputToIso, toLagosDateTimeInput } from '@/utils/format';
import type {
  CompetitionEntry,
  CompetitionFixture,
  CompetitionFixturePlan,
  CompetitionGroupKey,
  CompetitionOfficialFixtureInput,
} from '@/types/competition';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface VenueOption {
  _id: string;
  name: string;
}

type FixtureFilter = 'all' | CompetitionGroupKey | 'pending';
type DraftGroupKey = CompetitionGroupKey | '';

interface DraftFixtureRow {
  matchId?: string;
  officialNumber: number;
  groupKey: DraftGroupKey;
  homeEntryId: string;
  awayEntryId: string;
  kickoffAt: string;
  venue: string;
}

interface StoredFixtureDraft {
  schemaVersion: 1;
  revision: number;
  rows: DraftFixtureRow[];
}

interface FixturePlanResult extends Partial<CompetitionFixturePlan> {
  status: 'published' | 'not_published';
  fixtures: CompetitionFixture[];
}

interface OfficialFixtureEditorProps {
  tournamentId: string;
  revision: number;
  entries: CompetitionEntry[];
  venues: VenueOption[];
  canManage: boolean;
  canReview: boolean;
  canPublish: boolean;
  onPublished: () => Promise<void> | void;
}

const GROUP_LABELS: Record<CompetitionGroupKey, string> = {
  A: 'Group A (Pot 1)',
  B: 'Group B (Pot 2)',
};

const FIXTURE_COUNT = 42;
const inputClassName =
  'min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-xs';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function blankRows(): DraftFixtureRow[] {
  return Array.from({ length: FIXTURE_COUNT }, (_, index) => ({
    officialNumber: index + 1,
    groupKey: '',
    homeEntryId: '',
    awayEntryId: '',
    kickoffAt: '',
    venue: '',
  }));
}

function rowsFromFixtures(fixtures: CompetitionFixture[]): DraftFixtureRow[] {
  if (fixtures.length !== FIXTURE_COUNT) return blankRows();
  return [...fixtures]
    .sort((left, right) => left.officialNumber - right.officialNumber)
    .map((fixture) => ({
      matchId: fixture.matchId,
      officialNumber: fixture.officialNumber,
      groupKey: fixture.groupKey,
      homeEntryId: fixture.homeEntryId,
      awayEntryId: fixture.awayEntryId,
      kickoffAt: toLagosDateTimeInput(fixture.kickoffAt),
      venue: fixture.venue ?? '',
    }));
}

function scheduleState(row: DraftFixtureRow) {
  if (row.kickoffAt && row.venue) return 'confirmed' as const;
  if (!row.kickoffAt && !row.venue) return 'pending' as const;
  return 'incomplete' as const;
}

function toOfficialInput(row: DraftFixtureRow): CompetitionOfficialFixtureInput {
  const hasSchedule = Boolean(row.kickoffAt && row.venue);
  return {
    officialNumber: row.officialNumber,
    groupKey: row.groupKey as CompetitionGroupKey,
    homeEntryId: row.homeEntryId,
    awayEntryId: row.awayEntryId,
    kickoffAt: hasSchedule ? lagosDateTimeInputToIso(row.kickoffAt) : null,
    venue: hasSchedule ? row.venue : null,
  };
}

function isStoredDraft(value: unknown): value is StoredFixtureDraft {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as StoredFixtureDraft;
  return candidate.schemaVersion === 1 &&
    Number.isInteger(candidate.revision) &&
    Array.isArray(candidate.rows) &&
    candidate.rows.length === FIXTURE_COUNT &&
    candidate.rows.every((row, index) => Boolean(row) &&
      row.officialNumber === index + 1 &&
      (row.groupKey === '' || row.groupKey === 'A' || row.groupKey === 'B') &&
      typeof row.homeEntryId === 'string' &&
      typeof row.awayEntryId === 'string' &&
      typeof row.kickoffAt === 'string' &&
      typeof row.venue === 'string' &&
      (row.matchId === undefined || typeof row.matchId === 'string'));
}

function removeStoredDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage may be unavailable in private mode; server state remains authoritative.
  }
}

export function OfficialFixtureEditor({
  tournamentId,
  revision,
  entries,
  venues,
  canManage,
  canReview,
  canPublish,
  onPublished,
}: OfficialFixtureEditorProps) {
  const [rows, setRows] = useState<DraftFixtureRow[]>(blankRows);
  const [plan, setPlan] = useState<CompetitionFixturePlan | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'review' | 'publish' | null>(null);
  const [filter, setFilter] = useState<FixtureFilter>('all');
  const requestSequence = useRef(0);
  const storageKey = `solidfm:official-fixture-draft:v1:${tournamentId}`;

  const loadPlan = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.get<ApiResponse<FixturePlanResult>, ApiResponse<FixturePlanResult>>(
        `/tournaments/${tournamentId}/competition/group-fixtures/plan`,
      );
      if (!response.success) throw new Error(response.message || 'Official fixture sheet could not be loaded');
      if (requestId !== requestSequence.current) return;

      const published = response.data.status === 'published' && response.data.fixtures.length === FIXTURE_COUNT;
      setIsPublished(published);
      if (published) {
        setRows(rowsFromFixtures(response.data.fixtures));
        setPlan(response.data as CompetitionFixturePlan);
        removeStoredDraft(storageKey);
      } else {
        let restoredRows = blankRows();
        try {
          const storedValue = window.localStorage.getItem(storageKey);
          const parsed: unknown = storedValue ? JSON.parse(storedValue) : null;
          if (isStoredDraft(parsed) && parsed.revision === revision) restoredRows = parsed.rows;
        } catch {
          removeStoredDraft(storageKey);
        }
        setRows(restoredRows);
        setPlan(null);
      }
    } catch (error: unknown) {
      if (requestId === requestSequence.current) {
        setLoadError(getErrorMessage(error, 'Failed to load the official fixture sheet'));
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
    const stored: StoredFixtureDraft = { schemaVersion: 1, revision, rows };
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        // The editor remains usable when browser storage is unavailable or full.
      }
    }, 250);
    return () => window.clearTimeout(saveTimer);
  }, [isLoading, isPublished, revision, rows, storageKey]);

  const entriesByGroup = useMemo(() => ({
    A: entries.filter((entry) => entry.groupKey === 'A'),
    B: entries.filter((entry) => entry.groupKey === 'B'),
  }), [entries]);
  const entryNames = useMemo(
    () => new Map(entries.map((entry) => [entry._id, entry.teamId.name])),
    [entries],
  );
  const confirmedCount = rows.filter((row) => scheduleState(row) === 'confirmed').length;
  const pendingCount = rows.filter((row) => scheduleState(row) === 'pending').length;
  const incompleteScheduleCount = FIXTURE_COUNT - confirmedCount - pendingCount;
  const incompletePairingCount = rows.filter(
    (row) => !row.groupKey || !row.homeEntryId || !row.awayEntryId || row.homeEntryId === row.awayEntryId,
  ).length;
  const canSubmitForReview = rows.length === FIXTURE_COUNT && incompleteScheduleCount === 0 && incompletePairingCount === 0;
  const visibleRows = rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return scheduleState(row) !== 'confirmed';
    return row.groupKey === filter;
  });

  const updateRow = (officialNumber: number, patch: Partial<DraftFixtureRow>) => {
    if (isPublished || busyAction) return;
    setRows((current) => current.map((row) => {
      if (row.officialNumber !== officialNumber) return row;
      const next = { ...row, ...patch };
      if (patch.groupKey !== undefined && patch.groupKey !== row.groupKey) {
        next.homeEntryId = '';
        next.awayEntryId = '';
      }
      return next;
    }));
    setPlan(null);
  };

  const handleReview = async () => {
    if (!canManage || !canReview || !canSubmitForReview || busyAction) return;
    setBusyAction('review');
    try {
      const response = await apiClient.post<ApiResponse<CompetitionFixturePlan>, ApiResponse<CompetitionFixturePlan>>(
        `/tournaments/${tournamentId}/competition/group-fixtures/preview`,
        { expectedRevision: revision, fixtures: rows.map(toOfficialInput) },
      );
      if (!response.success) throw new Error(response.message || 'Official fixture sheet could not be reviewed');
      setPlan(response.data);
      setRows(rowsFromFixtures(response.data.fixtures));
      toast.success(`Official sheet verified: ${response.data.confirmedCount} confirmed, ${response.data.pendingCount} pending`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to review the official fixture sheet'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    if (!plan || !canManage || !canPublish || busyAction) return;
    if (!window.confirm(`Publish all 42 official group fixtures? ${plan.pendingCount} fixture(s) will remain clearly marked schedule TBC.`)) return;
    setBusyAction('publish');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/group-fixtures/publish`,
        {
          expectedRevision: revision,
          planHash: plan.planHash,
          fixtures: rows.map(toOfficialInput),
        },
        {
          headers: {
            'Idempotency-Key': `solidfm:${tournamentId}:official-group:${revision}:${plan.planHash}`,
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Official fixtures could not be published');
      removeStoredDraft(storageKey);
      toast.success('Official group fixture sheet published');
      await onPublished();
      await loadPlan();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish the official fixtures'));
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/5 bg-black/20" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-blue-400" /><span className="sr-only">Loading official fixture sheet</span></div>;
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
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Official records</p>
          <p className="mt-2 text-2xl font-black italic text-white">{rows.length}/42</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Schedule confirmed</p>
          <p className="mt-2 text-2xl font-black italic text-white">{confirmedCount}</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-yellow-300">Schedule TBC</p>
          <p className="mt-2 text-2xl font-black italic text-white">{pendingCount}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 text-xs leading-relaxed text-neutral-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>This sheet records the fixtures confirmed through the physical process. Group A corresponds to Pot 1 and Group B to Pot 2. Leaving both kickoff and venue blank keeps a fixture honestly marked TBC.</span>
      </div>

      {pendingCount > 0 && isPublished ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-100 sm:flex-row sm:items-center sm:justify-between">
          <span><strong>{pendingCount} official fixture{pendingCount === 1 ? '' : 's'}</strong> still need a physically confirmed kickoff and venue.</span>
          <Link href={`/admin/matches?tournament=${tournamentId}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-[9px] font-black uppercase tracking-widest text-black"><Clock3 className="h-3.5 w-3.5" /> Open Match Centre</Link>
        </div>
      ) : null}

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Filter official fixtures">
        {([
          ['all', 'All 42'],
          ['A', 'Group A / Pot 1'],
          ['B', 'Group B / Pot 2'],
          ['pending', `Schedule TBC (${pendingCount + incompleteScheduleCount})`],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-xl border px-4 text-[9px] font-black uppercase tracking-widest transition-colors ${filter === value ? 'border-blue-400 bg-blue-600 text-white' : 'border-white/5 bg-white/5 text-neutral-500 hover:text-white'}`}>{label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleRows.map((row) => {
          const state = scheduleState(row);
          const groupEntries = row.groupKey ? entriesByGroup[row.groupKey] : [];
          const currentVenueMissing = row.venue && !venues.some((venue) => venue.name === row.venue);
          return (
            <fieldset key={row.officialNumber} disabled={isPublished || !canManage || Boolean(busyAction)} className={`rounded-2xl border p-4 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_245px] disabled:opacity-80 ${state === 'incomplete' ? 'border-red-500/30 bg-red-500/5' : state === 'pending' ? 'border-yellow-500/20 bg-yellow-500/[0.04]' : 'border-white/5 bg-black/20'}`}>
              <legend className="sr-only">Official fixture {row.officialNumber}</legend>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Official fixture {row.officialNumber}</span>
                <span className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-widest ${state === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : state === 'pending' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-red-500/10 text-red-300'}`}>{state === 'confirmed' ? 'Confirmed' : state === 'pending' ? 'Schedule TBC' : 'Complete both schedule fields'}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-[170px_minmax(150px,1fr)_24px_minmax(150px,1fr)_190px_170px] lg:items-end">
                <div className="space-y-1.5">
                  <label htmlFor={`official-group-${tournamentId}-${row.officialNumber}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Group / physical pot</label>
                  <Select id={`official-group-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.groupKey} onChange={(event) => updateRow(row.officialNumber, { groupKey: event.target.value as DraftGroupKey })}>
                    <option value="">Choose group…</option>
                    <option value="A">Group A (Pot 1)</option>
                    <option value="B">Group B (Pot 2)</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`official-home-${tournamentId}-${row.officialNumber}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Home team</label>
                  <Select id={`official-home-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.homeEntryId} disabled={!row.groupKey || isPublished || !canManage || Boolean(busyAction)} onChange={(event) => updateRow(row.officialNumber, { homeEntryId: event.target.value })}>
                    <option value="">Choose team…</option>
                    {groupEntries.map((entry) => <option key={entry._id} value={entry._id} disabled={entry._id === row.awayEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <span aria-hidden="true" className="hidden pb-3 text-center text-[8px] font-black text-neutral-700 lg:block">VS</span>
                <div className="space-y-1.5">
                  <label htmlFor={`official-away-${tournamentId}-${row.officialNumber}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Away team</label>
                  <Select id={`official-away-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.awayEntryId} disabled={!row.groupKey || isPublished || !canManage || Boolean(busyAction)} onChange={(event) => updateRow(row.officialNumber, { awayEntryId: event.target.value })}>
                    <option value="">Choose team…</option>
                    {groupEntries.map((entry) => <option key={entry._id} value={entry._id} disabled={entry._id === row.homeEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`official-kickoff-${tournamentId}-${row.officialNumber}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><CalendarCheck2 className="h-3 w-3" /> Kickoff (Africa/Lagos) or TBC</label>
                  <input id={`official-kickoff-${tournamentId}-${row.officialNumber}`} type="datetime-local" value={row.kickoffAt} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.officialNumber, { kickoffAt: event.target.value })} className={inputClassName} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`official-venue-${tournamentId}-${row.officialNumber}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><MapPin className="h-3 w-3" /> Venue or TBC</label>
                  <Select id={`official-venue-${tournamentId}-${row.officialNumber}`} controlSize="compact" value={row.venue} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.officialNumber, { venue: event.target.value })}>
                    <option value="">Schedule TBC</option>
                    {currentVenueMissing ? <option value={row.venue}>{row.venue} (current)</option> : null}
                    {venues.map((venue) => <option key={venue._id} value={venue.name}>{venue.name}</option>)}
                  </Select>
                </div>
              </div>
              {isPublished ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3 text-[8px] font-bold uppercase tracking-wider text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>{GROUP_LABELS[row.groupKey as CompetitionGroupKey] ?? 'Group pending'} • {entryNames.get(row.homeEntryId) ?? 'Home pending'} vs {entryNames.get(row.awayEntryId) ?? 'Away pending'} • Africa/Lagos</span>
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
            <p className="mt-1 text-[9px] text-neutral-500">{incompletePairingCount} incomplete pairing(s) • {incompleteScheduleCount} partial schedule(s) • {pendingCount} valid TBC</p>
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

      {incompleteScheduleCount > 0 ? (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> A kickoff and venue must either both be filled or both remain blank.</p>
      ) : null}
    </div>
  );
}
