'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CheckCircle2, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Select } from '@/components/ui/Select';
import apiClient from '@/lib/api-client';
import { lagosDateTimeInputToIso, toLagosDateTimeInput } from '@/utils/format';
import type {
  CompetitionDraw,
  CompetitionEntry,
  QualificationSnapshotEntry,
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

interface QuarterFinalRow {
  slot: number;
  homeEntryId: string;
  awayEntryId: string;
  kickoffAt: string;
  venue: string;
}

interface OfficialQuarterFinalEditorProps {
  tournamentId: string;
  revision: number;
  qualificationSnapshot: QualificationSnapshotEntry[];
  entries: CompetitionEntry[];
  venues: VenueOption[];
  draft: CompetitionDraw | null;
  canManage: boolean;
  canCreate: boolean;
  onRefresh: () => Promise<void> | void;
}

const inputClassName =
  'min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [@media(pointer:fine)]:text-xs';

function blankRows(): QuarterFinalRow[] {
  return Array.from({ length: 4 }, (_, index) => ({
    slot: index + 1,
    homeEntryId: '',
    awayEntryId: '',
    kickoffAt: '',
    venue: '',
  }));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function rowsFromDraft(draft: CompetitionDraw | null): QuarterFinalRow[] {
  if (!draft || draft.pairings.length !== 4) return blankRows();
  return [...draft.pairings]
    .sort((left, right) => left.slot - right.slot)
    .map((pairing) => ({
      slot: pairing.slot,
      homeEntryId: pairing.homeEntryId,
      awayEntryId: pairing.awayEntryId,
      kickoffAt: toLagosDateTimeInput(pairing.kickoffAt),
      venue: pairing.venue ?? '',
    }));
}

function scheduleState(row: QuarterFinalRow) {
  if (row.kickoffAt && row.venue) return 'confirmed' as const;
  if (!row.kickoffAt && !row.venue) return 'pending' as const;
  return 'incomplete' as const;
}

function rowsFingerprint(rows: QuarterFinalRow[]) {
  return JSON.stringify(rows.map((row) => ({
    ...row,
    kickoffAt: row.kickoffAt || '',
    venue: row.venue || '',
  })));
}

function compactFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function OfficialQuarterFinalEditor({
  tournamentId,
  revision,
  qualificationSnapshot,
  entries,
  venues,
  draft,
  canManage,
  canCreate,
  onRefresh,
}: OfficialQuarterFinalEditorProps) {
  const [rows, setRows] = useState<QuarterFinalRow[]>(() => rowsFromDraft(draft));
  const [busyAction, setBusyAction] = useState<'save' | 'publish' | null>(null);

  useEffect(() => {
    setRows(rowsFromDraft(draft));
  }, [draft]);

  const entryById = useMemo(() => new Map(entries.map((entry) => [entry._id, entry])), [entries]);
  const qualifiedEntries = useMemo(
    () => qualificationSnapshot
      .map((qualified) => entryById.get(qualified.tournamentEntryId))
      .filter((entry): entry is CompetitionEntry => Boolean(entry)),
    [entryById, qualificationSnapshot],
  );
  const selectedEntryIds = rows.flatMap((row) => [row.homeEntryId, row.awayEntryId]).filter(Boolean);
  const pairingComplete = selectedEntryIds.length === 8 && new Set(selectedEntryIds).size === 8;
  const partialSchedules = rows.filter((row) => scheduleState(row) === 'incomplete').length;
  const pendingSchedules = rows.filter((row) => scheduleState(row) === 'pending').length;
  const draftFingerprint = rowsFingerprint(rowsFromDraft(draft));
  const currentFingerprint = rowsFingerprint(rows);
  const savedDraftIsCurrent = Boolean(draft) && draftFingerprint === currentFingerprint;

  const updateRow = (slot: number, patch: Partial<QuarterFinalRow>) => {
    if (busyAction) return;
    setRows((current) => current.map((row) => row.slot === slot ? { ...row, ...patch } : row));
  };

  const handleSave = async () => {
    if (!canManage || !canCreate || !pairingComplete || partialSchedules > 0 || busyAction) return;
    if (draft && !window.confirm('Save these physically confirmed pairings as a replacement draft? The previous draft remains in the audit record.')) return;
    setBusyAction('save');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/draws`,
        {
          expectedRevision: revision,
          pairings: rows.map((row) => {
            const hasSchedule = Boolean(row.kickoffAt && row.venue);
            return {
              slot: row.slot,
              homeEntryId: row.homeEntryId,
              awayEntryId: row.awayEntryId,
              kickoffAt: hasSchedule ? lagosDateTimeInputToIso(row.kickoffAt) : null,
              venue: hasSchedule ? row.venue : null,
            };
          }),
        },
        {
          headers: {
            'Idempotency-Key': `solidfm:${tournamentId}:official-quarter-finals:${revision}:${compactFingerprint(currentFingerprint)}`,
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Official quarter-finals could not be saved');
      toast.success('Physical quarter-final pairings saved for review');
      await onRefresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save the official quarter-finals'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    if (!draft || !savedDraftIsCurrent || !canManage || busyAction) return;
    if (!window.confirm(`Publish the four official quarter-finals? ${pendingSchedules} fixture(s) will remain schedule TBC.`)) return;
    setBusyAction('publish');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/draws/${draft._id}/publish`,
        { expectedRevision: revision },
        {
          headers: {
            'Idempotency-Key': `solidfm:${tournamentId}:publish-official-quarter-finals:${draft._id}`,
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Official quarter-finals could not be published');
      toast.success('Official quarter-finals published');
      await onRefresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish the official quarter-finals'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs leading-relaxed text-blue-100/80">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
        <div className="space-y-2">
          <p>Record the four pairings exactly as confirmed through the physical process. Every qualified team must be used once. A kickoff and venue may both remain blank until the schedule is officially confirmed.</p>
          <p className="font-bold text-white">Bracket path: the winner of QF 1 meets the winner of QF 2, while the winner of QF 3 meets the winner of QF 4.</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const state = scheduleState(row);
          const currentVenueMissing = row.venue && !venues.some((venue) => venue.name === row.venue);
          return (
            <fieldset key={row.slot} disabled={!canManage || Boolean(busyAction)} className={`rounded-2xl border p-4 disabled:opacity-70 ${state === 'incomplete' ? 'border-red-500/30 bg-red-500/5' : state === 'pending' ? 'border-yellow-500/20 bg-yellow-500/[0.04]' : 'border-white/5 bg-black/20'}`}>
              <legend className="sr-only">Official quarter-final {row.slot}</legend>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Quarter-final {row.slot}</span>
                <span className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-widest ${state === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : state === 'pending' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-red-500/10 text-red-300'}`}>{state === 'confirmed' ? 'Schedule confirmed' : state === 'pending' ? 'Schedule TBC' : 'Complete both schedule fields'}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(150px,1fr)_24px_minmax(150px,1fr)_190px_170px] lg:items-end">
                <div className="space-y-1.5">
                  <label htmlFor={`qf-home-${tournamentId}-${row.slot}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">First team</label>
                  <Select id={`qf-home-${tournamentId}-${row.slot}`} controlSize="compact" value={row.homeEntryId} onChange={(event) => updateRow(row.slot, { homeEntryId: event.target.value })}>
                    <option value="">Choose qualifier…</option>
                    {qualifiedEntries.map((entry) => <option key={entry._id} value={entry._id} disabled={selectedEntryIds.includes(entry._id) && entry._id !== row.homeEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <span aria-hidden="true" className="hidden pb-3 text-center text-[8px] font-black text-neutral-700 lg:block">VS</span>
                <div className="space-y-1.5">
                  <label htmlFor={`qf-away-${tournamentId}-${row.slot}`} className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Second team</label>
                  <Select id={`qf-away-${tournamentId}-${row.slot}`} controlSize="compact" value={row.awayEntryId} onChange={(event) => updateRow(row.slot, { awayEntryId: event.target.value })}>
                    <option value="">Choose qualifier…</option>
                    {qualifiedEntries.map((entry) => <option key={entry._id} value={entry._id} disabled={selectedEntryIds.includes(entry._id) && entry._id !== row.awayEntryId}>{entry.teamId.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`qf-kickoff-${tournamentId}-${row.slot}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><CalendarCheck2 className="h-3 w-3" /> Kickoff (Africa/Lagos) or TBC</label>
                  <input id={`qf-kickoff-${tournamentId}-${row.slot}`} type="datetime-local" value={row.kickoffAt} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.slot, { kickoffAt: event.target.value })} className={inputClassName} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`qf-venue-${tournamentId}-${row.slot}`} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-neutral-600"><MapPin className="h-3 w-3" /> Venue or TBC</label>
                  <Select id={`qf-venue-${tournamentId}-${row.slot}`} controlSize="compact" value={row.venue} aria-invalid={state === 'incomplete'} onChange={(event) => updateRow(row.slot, { venue: event.target.value })}>
                    <option value="">Schedule TBC</option>
                    {currentVenueMissing ? <option value={row.venue}>{row.venue} (current)</option> : null}
                    {venues.map((venue) => <option key={venue._id} value={venue.name}>{venue.name}</option>)}
                  </Select>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white">{selectedEntryIds.length}/8 qualifier slots filled • {pendingSchedules} schedule TBC</p>
          <p className="mt-1 text-[9px] text-neutral-600">{draft ? `Draft version ${draft.version} is in the official audit record.` : 'No pairing is saved until you review this physical record.'}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void handleSave()} disabled={!canManage || !canCreate || !pairingComplete || partialSchedules > 0 || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 text-[9px] font-black uppercase tracking-widest text-blue-200 disabled:cursor-not-allowed disabled:opacity-40">
            {busyAction === 'save' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {draft ? 'Save revised official QFs' : 'Review official QFs'}
          </button>
          {draft ? (
            <button type="button" onClick={() => void handlePublish()} disabled={!savedDraftIsCurrent || !canManage || Boolean(busyAction)} title={!savedDraftIsCurrent ? 'Save the revised pairings before publishing' : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busyAction === 'publish' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Publish official QFs
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
