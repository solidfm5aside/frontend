'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import {
  CompetitionDraw,
  CompetitionCommitteeDecisionMethod,
  CompetitionDrawMode,
  CompetitionEntry,
  CompetitionFixturePlan,
  CompetitionGroupKey,
  CompetitionOverview,
  CompetitionRankingSnapshot,
  CompetitionRankingState,
  CompetitionTeamSummary,
  CompetitionTieCluster,
  CompetitionTieBreaker,
  CompetitionTieResolutionAuditEntry,
} from '@/types/competition';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TeamsResponse extends ApiResponse<CompetitionTeamSummary[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface V2CompetitionPanelProps {
  tournamentId: string;
  canManageCompetition: boolean;
}

interface TournamentMetadataDraft {
  name: string;
  season: string;
  startDate: string;
  endDate: string;
}

interface CommitteeTieResolutionInput {
  groupKey: CompetitionGroupKey;
  basisHash: string;
  orderedTeamIds: string[];
  method: CompetitionCommitteeDecisionMethod;
  note?: string;
}

interface CompetitionRankingView extends CompetitionRankingSnapshot {
  workflowRevision: number;
  resolutionHistory: CompetitionTieResolutionAuditEntry[];
}

const GROUP_KEYS: CompetitionGroupKey[] = ['A', 'B'];
const CONFIRMED_TIE_BREAKERS: CompetitionTieBreaker[] = [
  'points',
  'goal_difference',
  'goals_for',
  'head_to_head',
  'committee_decision',
];
const TIE_BREAKER_LABELS: Record<CompetitionTieBreaker, string> = {
  points: 'Points',
  goal_difference: 'Goal difference',
  goals_for: 'Goals scored',
  head_to_head: 'Head-to-head',
  committee_decision: 'Explicit committee decision',
};
const COMMITTEE_METHOD_LABELS: Record<CompetitionCommitteeDecisionMethod, string> = {
  coin_toss: 'Coin toss',
  draw: 'Committee draw',
  other: 'Other documented method',
};
const RANKING_AUDIT_WORKFLOW_STATES = new Set([
  'qualification_finalized',
  'knockout_draw_published',
  'knockout_stage',
  'completed',
]);
const DRAW_MODE_LABELS: Record<CompetitionDrawMode, string> = {
  manual: 'Manual pairings',
  random: 'Random draw',
  seeded_cross_group: 'Fixed cross-group quarter-finals',
};
const FIXED_QUARTER_FINALS = [
  { slot: 1, home: { groupKey: 'A', rank: 1 }, away: { groupKey: 'B', rank: 4 } },
  { slot: 2, home: { groupKey: 'A', rank: 2 }, away: { groupKey: 'B', rank: 3 } },
  { slot: 3, home: { groupKey: 'B', rank: 1 }, away: { groupKey: 'A', rank: 4 } },
  { slot: 4, home: { groupKey: 'B', rank: 2 }, away: { groupKey: 'A', rank: 3 } },
] as const;
const FIXED_FORMAT_SUMMARY = [
  { label: 'Field', value: '14 teams', detail: 'Two manual groups of seven' },
  { label: 'Group stage', value: 'Single leg', detail: 'Six matches per team • 42 total' },
  { label: 'Qualification', value: 'Top four', detail: 'Eight quarter-finalists' },
  { label: 'Knockout', value: 'Fixed QF', detail: 'Cross-group position pairings' },
  { label: 'Squad', value: 'Max 10', detail: 'Ten registered players per team' },
  { label: 'Placement', value: 'No third', detail: 'Quarter-finals • Semis • Final' },
] as const;
const EXPECTED_GROUP_MATCHES = 42;
const WORKFLOW_STEPS = [
  { key: 'setup', label: 'Rules & teams' },
  { key: 'entries_ready', label: '14 teams' },
  { key: 'groups_assigned', label: 'Groups saved' },
  { key: 'group_stage', label: 'Group stage' },
  { key: 'qualification_finalized', label: 'Qualified' },
  { key: 'knockout_stage', label: 'Knockout bracket' },
  { key: 'completed', label: 'Champion' },
];
const WORKFLOW_STEP_INDEX: Record<string, number> = {
  setup: 0,
  entries_ready: 1,
  groups_assigned: 2,
  group_fixtures_published: 3,
  group_stage: 3,
  qualification_finalized: 4,
  knockout_draw_published: 5,
  knockout_stage: 5,
  completed: 6,
};
const KNOCKOUT_STAGE_ORDER = ['quarter_finals', 'semi_finals', 'final'];
const REGISTERED_TEAM_PAGE_SIZE = 100;

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]';
const labelClassName = 'text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function fetchAllRegisteredTeams(): Promise<CompetitionTeamSummary[]> {
  const loadPage = (page: number) =>
    apiClient.get<TeamsResponse, TeamsResponse>(
      `/teams/admin?page=${page}&limit=${REGISTERED_TEAM_PAGE_SIZE}&registrationStatus=registered`,
    );

  const firstPage = await loadPage(1);
  if (!firstPage.success) {
    throw new Error(firstPage.message || 'Registered teams could not be loaded');
  }

  const expectedTotal = firstPage.pagination?.total ?? firstPage.data.length;
  const expectedPages = firstPage.pagination?.pages ?? Math.ceil(expectedTotal / REGISTERED_TEAM_PAGE_SIZE);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, expectedPages - 1) }, (_, index) => loadPage(index + 2)),
  );

  if (remainingPages.some((response) => !response.success)) {
    throw new Error('One or more registered-team pages could not be loaded');
  }
  if (
    remainingPages.some(
      (response) => response.pagination && response.pagination.total !== expectedTotal,
    )
  ) {
    throw new Error('The registered-team catalogue changed while it was loading. Reload and try again.');
  }

  const teams = [firstPage, ...remainingPages].flatMap((response) => response.data);
  const uniqueTeamIds = new Set(teams.map((team) => team._id));
  if (teams.length !== expectedTotal || uniqueTeamIds.size !== expectedTotal) {
    throw new Error('The registered-team catalogue was incomplete. Reload before assigning teams.');
  }

  return teams;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateInputValue(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function progressionButtonLabel(workflowState: string, currentStage: string) {
  if (workflowState === 'completed') return 'Competition completed';
  if (currentStage === 'final') return 'Confirm champion & complete';
  const nextStage: Record<string, string> = {
    quarter_finals: 'semi-finals',
    semi_finals: 'final fixtures',
  };
  return `Create ${nextStage[currentStage] ?? 'next round'}`;
}

function emptyGroupSlots(): Record<CompetitionGroupKey, string[]> {
  return { A: Array(7).fill(''), B: Array(7).fill('') };
}

function groupsFromEntries(entries: CompetitionEntry[]) {
  const groups = emptyGroupSlots();
  for (const entry of entries) {
    if (entry.groupKey && entry.groupSlot && entry.groupSlot >= 1 && entry.groupSlot <= 7) {
      groups[entry.groupKey][entry.groupSlot - 1] = entry._id;
    }
  }
  return groups;
}

function StepCard({
  number,
  title,
  summary,
  complete,
  defaultOpen,
  children,
}: {
  number: number;
  title: string;
  summary: string;
  complete: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[26px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black',
            complete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/10 text-blue-400',
          )}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black uppercase tracking-widest text-white">{title}</span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-600">{summary}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/5 p-5 sm:p-6">{children}</div>
    </details>
  );
}

function CommitteeTieResolutionCard({
  tie,
  teamNames,
  canManageCompetition,
  correctionAllowed,
  disabled,
  onResolve,
}: {
  tie: CompetitionTieCluster;
  teamNames: Map<string, string>;
  canManageCompetition: boolean;
  correctionAllowed: boolean;
  disabled: boolean;
  onResolve: (input: CommitteeTieResolutionInput) => Promise<boolean>;
}) {
  const hasAppliedResolution = Boolean(
    tie.resolved &&
    tie.method &&
    tie.orderedTeamIds?.length === tie.teamIds.length,
  );
  const initialOrder = hasAppliedResolution ? tie.orderedTeamIds! : tie.teamIds;
  const [orderedTeamIds, setOrderedTeamIds] = useState(() => [...initialOrder]);
  const [method, setMethod] = useState<'' | CompetitionCommitteeDecisionMethod>(tie.method ?? '');
  const [note, setNote] = useState(tie.note ?? '');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const moveTeam = (index: number, direction: -1 | 1) => {
    setOrderedTeamIds((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const submitResolution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCompetition || !correctionAllowed || !method || (method === 'other' && !note.trim()) || disabled) return;
    const saved = await onResolve({
      groupKey: tie.groupKey,
      basisHash: tie.basisHash,
      orderedTeamIds,
      method,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    if (saved) setIsCorrecting(false);
  };

  const cancelCorrection = () => {
    setOrderedTeamIds([...(tie.orderedTeamIds ?? tie.teamIds)]);
    setMethod(tie.method ?? '');
    setNote(tie.note ?? '');
    setIsCorrecting(false);
  };

  const headToHeadByTeam = new Map(tie.headToHead.map((row) => [row.teamId, row]));

  if (hasAppliedResolution && (!isCorrecting || !correctionAllowed)) {
    const decidedAt = tie.decidedAt ? new Date(tie.decidedAt) : null;
    const decidedAtLabel = decidedAt && !Number.isNaN(decidedAt.getTime())
      ? decidedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Decision saved';

    return (
      <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Applied committee decision • Group {tie.groupKey} positions {tie.startRank}–{tie.endRank}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">{tie.method ? COMMITTEE_METHOD_LABELS[tie.method] : 'Documented decision'} • {decidedAtLabel}</p>
          </div>
          {canManageCompetition && correctionAllowed ? (
            <button type="button" onClick={() => setIsCorrecting(true)} disabled={disabled} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-[9px] font-black uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40">
              <RefreshCw className="h-3.5 w-3.5" /> Edit / correct
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-600"><LockKeyhole className="h-3.5 w-3.5" /> {canManageCompetition ? 'Qualification locked' : 'Administrator access required'}</span>
          )}
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {tie.orderedTeamIds!.map((teamId, index) => (
            <li key={teamId} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[9px] font-black text-emerald-400">{tie.startRank + index}</span>
              <span className="min-w-0 truncate text-xs font-bold text-white">{teamNames.get(teamId) ?? 'Tied team'}</span>
            </li>
          ))}
        </ol>
        {tie.note ? <p className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-neutral-400"><span className="font-bold text-neutral-300">Decision note:</span> {tie.note}</p> : null}
        <p className="mt-3 text-[8px] font-bold uppercase tracking-widest text-emerald-100/40">Result basis {tie.basisHash.slice(0, 10)}… • Corrections remain in the committee audit history.</p>
      </article>
    );
  }

  return (
    <form onSubmit={submitResolution} className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] p-4" aria-busy={disabled}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-200">{hasAppliedResolution ? 'Correct' : 'Resolve'} Group {tie.groupKey} • Positions {tie.startRank}–{tie.endRank}</p>
          <p className="mt-1 text-xs text-orange-100/70">Head-to-head did not separate these teams. Place every team in the committee&apos;s explicit final order.{hasAppliedResolution ? ' The previous decision remains in the audit history.' : ''}</p>
        </div>
        {tie.affectsQualificationOrSeeding ? <span className="w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-orange-300">Affects QF place</span> : null}
      </div>

      <ol className="mt-4 space-y-2">
        {orderedTeamIds.map((teamId, index) => {
          const headToHead = headToHeadByTeam.get(teamId);
          return (
            <li key={teamId} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[9px] font-black text-blue-400">{tie.startRank + index}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-white">{teamNames.get(teamId) ?? 'Tied team'}</span>
                {headToHead ? <span className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-neutral-600">H2H: {headToHead.points} pts • GD {headToHead.goalDifference >= 0 ? '+' : ''}{headToHead.goalDifference} • GF {headToHead.goalsFor}</span> : null}
              </span>
              <button type="button" onClick={() => moveTeam(index, -1)} disabled={!canManageCompetition || !correctionAllowed || disabled || index === 0} aria-label={`Move ${teamNames.get(teamId) ?? 'team'} higher`} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => moveTeam(index, 1)} disabled={!canManageCompetition || !correctionAllowed || disabled || index === orderedTeamIds.length - 1} aria-label={`Move ${teamNames.get(teamId) ?? 'team'} lower`} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label htmlFor={`tie-method-${tie.basisHash}`} className={labelClassName}>Decision method</label>
          <select id={`tie-method-${tie.basisHash}`} required value={method} disabled={!canManageCompetition || !correctionAllowed || disabled} onChange={(event) => setMethod(event.target.value as '' | CompetitionCommitteeDecisionMethod)} className={inputClassName}>
            <option value="" className="bg-[#07131a]">Choose method…</option>
            {Object.entries(COMMITTEE_METHOD_LABELS).map(([value, label]) => <option key={value} value={value} className="bg-[#07131a]">{label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor={`tie-note-${tie.basisHash}`} className={labelClassName}>Decision note {method === 'other' ? '(required)' : '(optional)'}</label>
          <input id={`tie-note-${tie.basisHash}`} required={method === 'other'} maxLength={500} value={note} disabled={!canManageCompetition || !correctionAllowed || disabled} onChange={(event) => setNote(event.target.value)} placeholder="Record the committee reference or explanation" className={inputClassName} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-orange-500/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[8px] font-bold uppercase tracking-widest text-orange-100/50">Result revision {tie.basisHash.slice(0, 10)}… prevents applying this order to changed scores.</span>
        {canManageCompetition && correctionAllowed ? (
          <span className="flex flex-col gap-2 sm:flex-row">
            {hasAppliedResolution ? <button type="button" onClick={cancelCorrection} disabled={disabled} className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-5 text-[9px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white disabled:opacity-40">Cancel</button> : null}
            <button type="submit" disabled={disabled || !method || (method === 'other' && !note.trim())} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-[9px] font-black uppercase tracking-widest text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-4 w-4" /> {hasAppliedResolution ? 'Save corrected order' : 'Save committee order'}</button>
          </span>
        ) : <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-600"><LockKeyhole className="h-3.5 w-3.5" /> {canManageCompetition ? 'Qualification locked' : 'Administrator access required'}</span>}
      </div>
    </form>
  );
}

function CommitteeDecisionAuditHistory({
  history,
  teamNames,
}: {
  history: CompetitionTieResolutionAuditEntry[];
  teamNames: Map<string, string>;
}) {
  return (
    <details className="group rounded-2xl border border-white/5 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-300">Committee decision audit</span>
          <span className="mt-1 block text-[8px] font-bold uppercase tracking-widest text-neutral-600">{history.length} append-only {history.length === 1 ? 'record' : 'records'} • oldest first</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-open:rotate-180" />
      </summary>
      <ol className="space-y-3 border-t border-white/5 p-4">
        {history.map((decision) => {
          const decidedAt = new Date(decision.decidedAt);
          const decisionDate = Number.isNaN(decidedAt.getTime())
            ? 'Date unavailable'
            : decidedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
          const supersededAt = decision.supersededAt ? new Date(decision.supersededAt) : null;
          const supersededDate = supersededAt && !Number.isNaN(supersededAt.getTime())
            ? supersededAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
            : null;

          return (
            <li key={decision.decisionId} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white">Group {decision.groupKey} • Decision revision {decision.decisionRevision}</p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-neutral-600">{COMMITTEE_METHOD_LABELS[decision.method]} • {decisionDate}</p>
                </div>
                <span className={clsx(
                  'w-fit rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-widest',
                  decision.status === 'active'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-neutral-500/20 bg-neutral-500/10 text-neutral-500',
                )}>{decision.status}</span>
              </div>
              <ol className="mt-3 flex flex-wrap gap-2" aria-label={`Group ${decision.groupKey} committee order revision ${decision.decisionRevision}`}>
                {decision.orderedTeamIds.map((teamId, index) => (
                  <li key={teamId} className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-[9px] font-bold text-neutral-300">{index + 1}. {teamNames.get(teamId) ?? 'Tied team'}</li>
                ))}
              </ol>
              {decision.note ? <p className="mt-3 text-xs text-neutral-500"><span className="font-bold text-neutral-400">Note:</span> {decision.note}</p> : null}
              <p className="mt-3 text-[7px] font-bold uppercase tracking-widest text-neutral-700">Decision {decision.decisionId.slice(0, 8)}… • Basis {decision.basisHash.slice(0, 10)}…{supersededDate ? ` • Corrected ${supersededDate}` : ''}</p>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

export function V2CompetitionPanel({ tournamentId, canManageCompetition }: V2CompetitionPanelProps) {
  const [overview, setOverview] = useState<CompetitionOverview | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<CompetitionTeamSummary[]>([]);
  const [draws, setDraws] = useState<CompetitionDraw[]>([]);
  const [rankingState, setRankingState] = useState<CompetitionRankingView | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [metadataDraft, setMetadataDraft] = useState<TournamentMetadataDraft>({
    name: '',
    season: '',
    startDate: '',
    endDate: '',
  });
  const [groupSlots, setGroupSlots] = useState<Record<CompetitionGroupKey, string[]>>(emptyGroupSlots);
  const [matchesPerDay, setMatchesPerDay] = useState('');
  const [fixturePlan, setFixturePlan] = useState<CompetitionFixturePlan | null>(null);
  const idempotencyKeys = useRef(new Map<string, string>());
  const competitionRequestSequence = useRef(0);
  const rankingRequestSequence = useRef(0);

  const fetchCompetition = useCallback(async (silent = false) => {
    const requestSequence = ++competitionRequestSequence.current;
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const [overviewResponse, registeredTeamResults, drawsResponse] = await Promise.all([
        apiClient.get<ApiResponse<CompetitionOverview>, ApiResponse<CompetitionOverview>>(
          `/tournaments/${tournamentId}/competition`,
        ),
        fetchAllRegisteredTeams(),
        apiClient.get<ApiResponse<CompetitionDraw[]>, ApiResponse<CompetitionDraw[]>>(
          `/tournaments/${tournamentId}/competition/draws`,
        ),
      ]);
      if (!overviewResponse.success || !drawsResponse.success) {
        throw new Error('The competition workspace could not be loaded');
      }
      if (requestSequence !== competitionRequestSequence.current) return;

      const nextOverview = overviewResponse.data;
      setOverview(nextOverview);
      setRegisteredTeams(registeredTeamResults);
      setDraws(drawsResponse.data);
      setGroupSlots(groupsFromEntries(nextOverview.entries));
      setMetadataDraft({
        name: nextOverview.tournament.name,
        season: nextOverview.tournament.season,
        startDate: dateInputValue(nextOverview.tournament.startDate),
        endDate: dateInputValue(nextOverview.tournament.endDate),
      });
      setFixturePlan((current) =>
        current?.tournamentRevision === nextOverview.progress.workflowRevision ? current : null,
      );
      if (nextOverview.progress.workflowState === 'group_stage') {
        rankingRequestSequence.current += 1;
        setIsRankingLoading(false);
        if (nextOverview.progress.ranking) {
          setRankingState({
            ...nextOverview.progress.ranking,
            workflowRevision: nextOverview.progress.workflowRevision,
            resolutionHistory: [],
          });
          setRankingError(null);
        } else {
          setRankingState(null);
          setRankingError('The competition overview did not include the live group ranking. Reload the workspace.');
        }
      } else if (!RANKING_AUDIT_WORKFLOW_STATES.has(nextOverview.progress.workflowState)) {
        rankingRequestSequence.current += 1;
        setIsRankingLoading(false);
        setRankingState(null);
        setRankingError(null);
      }
    } catch (error: unknown) {
      if (requestSequence === competitionRequestSequence.current) {
        setLoadError(getErrorMessage(error, 'Failed to load the competition workspace'));
      }
    } finally {
      if (!silent && requestSequence === competitionRequestSequence.current) setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchCompetition();
    return () => {
      competitionRequestSequence.current += 1;
      rankingRequestSequence.current += 1;
    };
  }, [fetchCompetition]);

  const workflowState = overview?.progress.workflowState;
  const workflowRevision = overview?.progress.workflowRevision;

  const fetchRanking = useCallback(async () => {
    const requestSequence = ++rankingRequestSequence.current;
    setIsRankingLoading(true);
    setRankingError(null);
    try {
      const response = await apiClient.get<
        ApiResponse<CompetitionRankingState>,
        ApiResponse<CompetitionRankingState>
      >(`/tournaments/${tournamentId}/competition/ranking`);
      if (!response.success) throw new Error(response.message || 'Competition ranking could not be loaded');
      if (requestSequence === rankingRequestSequence.current) setRankingState(response.data);
    } catch (error: unknown) {
      if (requestSequence === rankingRequestSequence.current) {
        setRankingState(null);
        setRankingError(getErrorMessage(error, 'Failed to load tie-resolution state'));
      }
    } finally {
      if (requestSequence === rankingRequestSequence.current) setIsRankingLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (workflowState === 'group_stage') {
      rankingRequestSequence.current += 1;
      return;
    }
    if (!workflowState || !RANKING_AUDIT_WORKFLOW_STATES.has(workflowState)) {
      rankingRequestSequence.current += 1;
      setRankingState(null);
      setRankingError(null);
      setIsRankingLoading(false);
      return;
    }
    void fetchRanking();
  }, [fetchRanking, workflowRevision, workflowState]);

  const getIdempotencyKey = (operation: string, revision: number, detail = '') => {
    const cacheKey = `${operation}:${revision}:${detail}`;
    const existing = idempotencyKeys.current.get(cacheKey);
    if (existing) return existing;
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const key = `solidfm:${tournamentId}:${operation}:${uniquePart}`;
    idempotencyKeys.current.set(cacheKey, key);
    return key;
  };

  const entryTeamIds = useMemo(
    () => new Set(overview?.entries.map((entry) => entry.teamId._id) ?? []),
    [overview?.entries],
  );
  const availableTeams = useMemo(
    () => registeredTeams
      .filter((team) => !entryTeamIds.has(team._id))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [entryTeamIds, registeredTeams],
  );
  const entryById = useMemo(
    () => new Map(overview?.entries.map((entry) => [entry._id, entry]) ?? []),
    [overview?.entries],
  );
  const teamNameById = useMemo(
    () => new Map(overview?.entries.map((entry) => [entry.teamId._id, entry.teamId.name]) ?? []),
    [overview?.entries],
  );
  const qualificationByEntryId = useMemo(
    () => new Map(
      overview?.tournament.qualificationSnapshot.map((entry) => [entry.tournamentEntryId, entry]) ?? [],
    ),
    [overview?.tournament.qualificationSnapshot],
  );
  const qualificationByPosition = useMemo(
    () => new Map(
      overview?.tournament.qualificationSnapshot.map((entry) => [
        `${entry.groupKey}:${entry.rank}`,
        entry,
      ]) ?? [],
    ),
    [overview?.tournament.qualificationSnapshot],
  );

  if (isLoading && !overview) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-[30px] border border-white/5 bg-white/[0.02]">
        <LoaderCircle className="h-6 w-6 animate-spin text-blue-500" aria-label="Loading competition workspace" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div role="alert" className="rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        <p>{loadError ?? 'Competition workspace is unavailable.'}</p>
        <button
          type="button"
          onClick={() => void fetchCompetition()}
          className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  const { tournament, readiness, progress, allowedActions, entries } = overview;
  const revision = progress.workflowRevision;
  const confirmedRulesPersisted = tournament.competitionRules.teamCount === 14 &&
    tournament.competitionRules.groupCount === 2 &&
    tournament.competitionRules.teamsPerGroup === 7 &&
    tournament.competitionRules.roundRobinLegs === 1 &&
    tournament.competitionRules.qualifiersPerGroup === 4 &&
    tournament.competitionRules.drawMode === 'seeded_cross_group' &&
    tournament.competitionRules.avoidSameGroupFirstRound === true &&
    tournament.competitionRules.thirdPlaceMatch === false &&
    tournament.competitionRules.maxRosterPlayers === 10 &&
    CONFIRMED_TIE_BREAKERS.every(
      (tieBreaker, index) => tournament.competitionRules.tieBreakers[index] === tieBreaker,
    ) && tournament.competitionRules.tieBreakers.length === CONFIRMED_TIE_BREAKERS.length;
  const allGroupSlots = [...groupSlots.A, ...groupSlots.B];
  const groupsComplete = allGroupSlots.every(Boolean) && new Set(allGroupSlots).size === 14;
  const completedGroupMatches = progress.groupMatches.completed ?? 0;
  const scheduledGroupMatches = progress.groupMatches.scheduled ?? 0;
  const liveGroupMatches = progress.groupMatches.live ?? 0;
  const totalGroupMatches = Object.values(progress.groupMatches).reduce((total, count) => total + count, 0);
  const expectedGroupMatches = EXPECTED_GROUP_MATCHES;
  const groupStageComplete = totalGroupMatches === expectedGroupMatches &&
    completedGroupMatches === expectedGroupMatches;
  const currentWorkflowIndex = WORKFLOW_STEP_INDEX[progress.workflowState] ?? 0;
  const latestDraw = [...draws].sort((left, right) => right.version - left.version)[0];
  const currentDraftDraw = [...draws]
    .sort((left, right) => right.version - left.version)
    .find((draw) => draw.status === 'draft');
  const bracket = progress.bracket;
  const progressionStage = tournament.currentStage;
  const progressionNodes = bracket.stages[progressionStage] ?? [];
  const resolvedProgressionNodes = progressionNodes.filter(
    (node) => node.match?.status === 'completed' && Boolean(node.match.winner),
  ).length;
  const progressionReady = progressionNodes.length > 0 && resolvedProgressionNodes === progressionNodes.length;
  const resolvedCommitteeTies = rankingState?.ties.filter((tie) => tie.resolved) ?? [];
  const committeeResolutionHistory = rankingState?.resolutionHistory ?? [];

  const persistedStartDate = dateInputValue(tournament.startDate);
  const persistedEndDate = dateInputValue(tournament.endDate);
  const metadataChanged = metadataDraft.name.trim() !== tournament.name ||
    metadataDraft.season.trim() !== tournament.season ||
    (!tournament.fixturesGenerated && (
      metadataDraft.startDate !== persistedStartDate || metadataDraft.endDate !== persistedEndDate
    ));
  const metadataDatesValid = Boolean(metadataDraft.startDate) &&
    (!metadataDraft.endDate || metadataDraft.endDate >= metadataDraft.startDate);
  const metadataValid = metadataDraft.name.trim().length >= 3 &&
    metadataDraft.season.trim().length > 0 &&
    (tournament.fixturesGenerated || metadataDatesValid);

  const handleMetadataSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!metadataChanged || !metadataValid || busyAction) return;
    setBusyAction('metadata');
    try {
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}`,
        {
          name: metadataDraft.name.trim(),
          season: metadataDraft.season.trim(),
          ...(!tournament.fixturesGenerated
            ? { startDate: metadataDraft.startDate, endDate: metadataDraft.endDate || null }
            : {}),
        },
      );
      if (!response.success) throw new Error(response.message || 'Season details could not be saved');
      toast.success('Season details saved');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save season details'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedTeamId || busyAction || entries.length >= 14) return;
    setBusyAction('add-entry');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/entries`,
        { expectedRevision: revision, teamId: selectedTeamId },
      );
      if (!response.success) throw new Error(response.message || 'Team could not be added');
      toast.success('Team entered in this tournament');
      setSelectedTeamId('');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to enter team'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveEntry = async (entry: CompetitionEntry) => {
    if (busyAction || !window.confirm(`Remove ${entry.teamId.name} from this tournament?`)) return;
    setBusyAction(`remove-entry:${entry._id}`);
    try {
      const response = await apiClient.delete<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/entries/${entry._id}`,
        { data: { expectedRevision: revision } },
      );
      if (!response.success) throw new Error(response.message || 'Team could not be removed');
      toast.success('Tournament entry removed');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove tournament entry'));
    } finally {
      setBusyAction(null);
    }
  };

  const assignEntryToGroupSlot = (groupKey: CompetitionGroupKey, slotIndex: number, entryId: string) => {
    setGroupSlots((current) => {
      const next = { A: [...current.A], B: [...current.B] };
      if (!entryId) {
        next[groupKey][slotIndex] = '';
        return next;
      }
      const displacedEntryId = next[groupKey][slotIndex];
      let previousLocation: { groupKey: CompetitionGroupKey; slotIndex: number } | null = null;
      for (const key of GROUP_KEYS) {
        const index = next[key].indexOf(entryId);
        if (index >= 0) previousLocation = { groupKey: key, slotIndex: index };
      }
      if (previousLocation) {
        next[previousLocation.groupKey][previousLocation.slotIndex] = displacedEntryId;
      }
      next[groupKey][slotIndex] = entryId;
      return next;
    });
  };

  const swapGroupSlot = (groupKey: CompetitionGroupKey, slotIndex: number) => {
    const otherGroup: CompetitionGroupKey = groupKey === 'A' ? 'B' : 'A';
    setGroupSlots((current) => {
      const next = { A: [...current.A], B: [...current.B] };
      [next[groupKey][slotIndex], next[otherGroup][slotIndex]] = [
        next[otherGroup][slotIndex],
        next[groupKey][slotIndex],
      ];
      return next;
    });
  };

  const handleSaveGroups = async () => {
    if (!groupsComplete || busyAction) return;
    setBusyAction('groups');
    try {
      const assignments = GROUP_KEYS.flatMap((groupKey) =>
        groupSlots[groupKey].map((entryId, index) => ({
          entryId,
          groupKey,
          groupSlot: index + 1,
        })),
      );
      const response = await apiClient.put<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/groups`,
        { expectedRevision: revision, assignments },
      );
      if (!response.success) throw new Error(response.message || 'Groups could not be saved');
      toast.success('Group A and Group B assignments saved');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save group assignments'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePreviewFixtures = async () => {
    const perDay = Number(matchesPerDay);
    if (!Number.isInteger(perDay) || perDay < 3 || perDay > 28 || busyAction) return;
    setBusyAction('preview');
    try {
      const response = await apiClient.post<ApiResponse<CompetitionFixturePlan>, ApiResponse<CompetitionFixturePlan>>(
        `/tournaments/${tournamentId}/competition/group-fixtures/preview`,
        { matchesPerDay: perDay },
      );
      if (!response.success) throw new Error(response.message || 'Fixture preview could not be created');
      setFixturePlan(response.data);
      toast.success(`${response.data.totalMatches} group fixtures previewed`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to preview group fixtures'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublishFixtures = async () => {
    if (!fixturePlan || busyAction || !canManageCompetition) return;
    if (!window.confirm(`Publish all ${fixturePlan.totalMatches} group-stage fixtures? Setup will be locked.`)) return;
    setBusyAction('publish-fixtures');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/group-fixtures/publish`,
        {
          expectedRevision: revision,
          planHash: fixturePlan.planHash,
          matchesPerDay: fixturePlan.matchesPerDay,
        },
        {
          headers: {
            'Idempotency-Key': getIdempotencyKey('publish-fixtures', revision, fixturePlan.planHash),
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Fixtures could not be published');
      toast.success('Group-stage fixtures published');
      setFixturePlan(null);
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish group fixtures'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleFinalizeQualification = async () => {
    if (!groupStageComplete || busyAction || !canManageCompetition) return;
    if (!window.confirm('Finalize the qualifiers from the completed group tables?')) return;
    setBusyAction('qualification');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/qualification/finalize`,
        { expectedRevision: revision },
        {
          headers: {
            'Idempotency-Key': getIdempotencyKey('finalize-qualification', revision),
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Qualification could not be finalized');
      toast.success('Group-stage qualifiers finalized');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to finalize qualification'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleResolveCommitteeTie = async (input: CommitteeTieResolutionInput) => {
    if (
      progress.workflowState !== 'group_stage' ||
      !canManageCompetition ||
      busyAction ||
      rankingState?.workflowRevision !== revision
    ) return false;
    const isCorrection = rankingState.ties.some(
      (tie) => tie.groupKey === input.groupKey && tie.basisHash === input.basisHash && tie.resolved,
    );
    const orderedNames = input.orderedTeamIds
      .map((teamId, index) => `${index + 1}. ${teamNameById.get(teamId) ?? 'Tied team'}`)
      .join('\n');
    const correctionNotice = isCorrection
      ? '\n\nThe existing decision will remain in the audit history.'
      : '';
    if (!window.confirm(`${isCorrection ? 'Correct' : 'Save'} this final Group ${input.groupKey} committee order?\n\n${orderedNames}${correctionNotice}`)) return false;

    setBusyAction(`tie:${input.basisHash}`);
    try {
      const response = await apiClient.put<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/tie-resolutions`,
        { expectedRevision: revision, ...input },
      );
      if (!response.success) throw new Error(response.message || 'Committee order could not be saved');
      toast.success(`Group ${input.groupKey} committee order saved`);
      await fetchCompetition(true);
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save committee order'));
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateDraw = async () => {
    if (busyAction || !canManageCompetition) return;
    if (currentDraftDraw && !window.confirm('Create a replacement fixed quarter-final draft? The current draft will remain in the audit history.')) return;
    setBusyAction('create-draw');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/draws`,
        { expectedRevision: revision },
        {
          headers: {
            'Idempotency-Key': getIdempotencyKey('create-draw', revision, 'fixed-quarter-finals'),
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Draw could not be created');
      toast.success('Fixed quarter-final draft created');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create knockout draw'));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublishDraw = async (draw: CompetitionDraw) => {
    if (busyAction || !canManageCompetition) return;
    if (!window.confirm(`Publish bracket version ${draw.version} and schedule the four quarter-finals?`)) return;
    setBusyAction('publish-draw');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(
        `/tournaments/${tournamentId}/competition/draws/${draw._id}/publish`,
        { expectedRevision: revision },
        {
          headers: {
            'Idempotency-Key': getIdempotencyKey('publish-draw', revision, draw._id),
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'Draw could not be published');
      toast.success('Quarter-finals published');
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to publish knockout draw'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleProgressKnockout = async () => {
    if (!canManageCompetition || !allowedActions.progressKnockout || !progressionReady || busyAction) return;
    const actionLabel = progressionButtonLabel(progress.workflowState, tournament.currentStage);
    if (!window.confirm(`${actionLabel}? Completed results and validated winners will be locked into the bracket.`)) return;
    setBusyAction('progress-knockout');
    try {
      const response = await apiClient.post<
        ApiResponse<{ action: 'round_materialized' | 'competition_completed' | 'third_place_recorded'; stage?: string; fixtureCount?: number }>,
        ApiResponse<{ action: 'round_materialized' | 'competition_completed' | 'third_place_recorded'; stage?: string; fixtureCount?: number }>
      >(
        `/tournaments/${tournamentId}/competition/knockout/progress`,
        { expectedRevision: revision },
        {
          headers: {
            'Idempotency-Key': getIdempotencyKey(
              'progress-knockout',
              revision,
              `${progressionStage}:${bracket.revision ?? 'none'}`,
            ),
          },
        },
      );
      if (!response.success) throw new Error(response.message || 'The knockout bracket could not progress');
      const successMessage = response.data.action === 'competition_completed'
        ? 'Champion confirmed and competition completed'
        : `${humanize(response.data.stage ?? 'Next round')} fixtures created`;
      toast.success(successMessage);
      await fetchCompetition(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to progress the knockout bracket'));
    } finally {
      setBusyAction(null);
    }
  };

  const qualifiedName = (entryId: string) => {
    const entry = entryById.get(entryId);
    const snapshot = qualificationByEntryId.get(entryId);
    return entry?.teamId.name ?? (snapshot ? `Group ${snapshot.groupKey} #${snapshot.rank}` : 'Unknown qualifier');
  };

  const drawTeamName = (team: CompetitionTeamSummary | string, entryId: string) =>
    typeof team === 'string' ? qualifiedName(entryId) : team.name;

  const qualifiedPositionName = (groupKey: CompetitionGroupKey, rank: number) => {
    const qualified = qualificationByPosition.get(`${groupKey}:${rank}`);
    return qualified ? qualifiedName(qualified.tournamentEntryId) : `${groupKey}${rank}`;
  };

  return (
    <section aria-labelledby={`competition-${tournamentId}-title`} className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] border border-blue-500/20 bg-blue-500/[0.04] p-5 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-blue-400">14-Team Competition</span>
              <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-neutral-400">{humanize(progress.workflowState)}</span>
            </div>
            <h3 id={`competition-${tournamentId}-title`} className="text-2xl font-black italic uppercase tracking-tighter text-white sm:text-3xl">
              {tournament.name}
            </h3>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.25em] text-neutral-500">
              Season {tournament.season} • Workflow revision {revision}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            {[
              { label: 'Teams', value: `${readiness.entryCount}/14` },
              {
                label: 'Group slots',
                value: `${readiness.groupCounts.A + readiness.groupCounts.B}/14`,
              },
              { label: 'Venues', value: readiness.venueCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-3 text-center">
                <p className="text-lg font-black italic text-white">{item.value}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-neutral-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-7 overflow-x-auto pb-2 scrollbar-hide" aria-label="Competition progress">
          <ol className="flex min-w-[720px] items-start">
            {WORKFLOW_STEPS.map((step, index) => {
              const reached = index <= currentWorkflowIndex;
              return (
                <li key={step.key} className="flex flex-1 items-start last:flex-none">
                  <div className="flex w-24 flex-col items-center text-center">
                    <span className={clsx('h-2.5 w-2.5 rounded-full', reached ? 'bg-blue-500' : 'bg-white/10')} />
                    <span className={clsx('mt-2 text-[7px] font-black uppercase tracking-wider', reached ? 'text-blue-300' : 'text-neutral-700')}>{step.label}</span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 ? (
                    <span className={clsx('mt-1 h-px flex-1', index < currentWorkflowIndex ? 'bg-blue-500' : 'bg-white/10')} />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void fetchCompetition()} className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-white">
            <RefreshCw className="h-3.5 w-3.5" /> Reload
          </button>
        </div>
      ) : null}

      {readiness.blockers.length > 0 && progress.workflowState !== 'group_stage' ? (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4" role="status">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-300">
            <AlertCircle className="h-4 w-4" /> Items still required
          </div>
          <ul className="mt-3 space-y-1 pl-5 text-xs text-orange-200/80">
            {readiness.blockers.map((blocker) => <li key={blocker} className="list-disc">{blocker}</li>)}
          </ul>
        </div>
      ) : null}

      <StepCard
        number={1}
        title="Season details & confirmed format"
        summary={confirmedRulesPersisted ? 'Fixed 14-team rules are active' : 'Competition format needs attention'}
        complete={confirmedRulesPersisted}
        defaultOpen={!confirmedRulesPersisted}
      >
        <div className="space-y-7">
          <form onSubmit={handleMetadataSave} className="space-y-5" aria-busy={busyAction === 'metadata'}>
            <fieldset disabled={Boolean(busyAction)} className="space-y-5 disabled:opacity-70">
              <legend className="sr-only">Season details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor={`season-name-${tournamentId}`} className={labelClassName}>Tournament name</label>
                  <input id={`season-name-${tournamentId}`} required minLength={3} maxLength={120} value={metadataDraft.name} onChange={(event) => setMetadataDraft((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`season-label-${tournamentId}`} className={labelClassName}>Season</label>
                  <input id={`season-label-${tournamentId}`} required maxLength={40} value={metadataDraft.season} onChange={(event) => setMetadataDraft((current) => ({ ...current, season: event.target.value }))} className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`season-start-${tournamentId}`} className={labelClassName}>Start date</label>
                  <input id={`season-start-${tournamentId}`} type="date" required disabled={tournament.fixturesGenerated || Boolean(busyAction)} value={metadataDraft.startDate} onChange={(event) => setMetadataDraft((current) => ({ ...current, startDate: event.target.value }))} className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`season-end-${tournamentId}`} className={labelClassName}>End date <span className="normal-case tracking-normal">(optional)</span></label>
                  <input id={`season-end-${tournamentId}`} type="date" min={metadataDraft.startDate || undefined} disabled={tournament.fixturesGenerated || Boolean(busyAction)} value={metadataDraft.endDate} onChange={(event) => setMetadataDraft((current) => ({ ...current, endDate: event.target.value }))} className={inputClassName} />
                </div>
              </div>
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {tournament.fixturesGenerated ? (
                <span className="inline-flex items-start gap-2 text-[9px] font-bold uppercase leading-relaxed tracking-widest text-neutral-600"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Dates lock after fixture publication; use the match reschedule workflow instead. Name and season remain editable.</span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Dates can be changed safely until fixtures are published.</span>
              )}
              <button type="submit" disabled={!metadataChanged || !metadataValid || Boolean(busyAction)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                {busyAction === 'metadata' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save season details
              </button>
            </div>
          </form>

          <div className="border-t border-white/5 pt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-white">Confirmed competition format</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-600">These sporting rules are fixed for this competition and cannot be altered per season.</p>
              </div>
              <span className={clsx('w-fit rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest', confirmedRulesPersisted ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-300')}>
                {confirmedRulesPersisted ? 'Format active' : 'Format mismatch'}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FIXED_FORMAT_SUMMARY.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600">{item.label}</p>
                  <p className="mt-2 text-sm font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[9px] text-neutral-500">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className={labelClassName}>Ranking order</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {CONFIRMED_TIE_BREAKERS.map((tieBreaker, index) => (
                  <li key={tieBreaker} className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[9px] font-black text-blue-400">{index + 1}</span>
                    {TIE_BREAKER_LABELS[tieBreaker]}
                  </li>
                ))}
              </ol>
            </div>
            {!confirmedRulesPersisted ? (
              <p role="alert" className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">The server did not return the confirmed fixed format. Reload after the backend update; fixture publication remains blocked until the persisted rules match.</p>
            ) : null}
          </div>
        </div>
      </StepCard>

      <StepCard number={2} title="Tournament entries" summary={`${entries.length} of exactly 14 registered teams entered`} complete={entries.length === 14} defaultOpen={entries.length !== 14}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label htmlFor={`entry-team-${tournamentId}`} className="sr-only">Registered team to enter</label>
              <select id={`entry-team-${tournamentId}`} value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} disabled={!allowedActions.editEntries || entries.length >= 14 || Boolean(busyAction)} className={inputClassName}>
                <option value="" className="bg-[#07131a]">Select a registered team…</option>
                {availableTeams.map((team) => <option key={team._id} value={team._id} className="bg-[#07131a]">{team.name}{team.city ? ` — ${team.city}` : ''}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => void handleAddEntry()} disabled={!selectedTeamId || !allowedActions.editEntries || entries.length >= 14 || Boolean(busyAction)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busyAction === 'add-entry' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add team
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {entries.map((entry, index) => (
              <div key={entry._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
                <span className="w-5 text-center text-[9px] font-black text-neutral-600">{index + 1}</span>
                <TeamAvatar name={entry.teamId.name} logo={entry.teamId.logo ?? entry.teamLogoSnapshot} size="xs" />
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{entry.teamId.name}</span>
                {allowedActions.editEntries ? (
                  <button type="button" onClick={() => void handleRemoveEntry(entry)} disabled={Boolean(busyAction)} aria-label={`Remove ${entry.teamId.name} from tournament`} className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30">
                    {busyAction === `remove-entry:${entry._id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                ) : <LockKeyhole className="h-3.5 w-3.5 text-neutral-700" />}
              </div>
            ))}
          </div>
          {entries.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-[9px] font-black uppercase tracking-widest text-neutral-700">No team has been entered in this tournament</p> : null}
        </div>
      </StepCard>

      <StepCard number={3} title="Group assignment" summary={`Group A ${readiness.groupCounts.A}/7 • Group B ${readiness.groupCounts.B}/7`} complete={progress.workflowState !== 'setup' && readiness.groupCounts.A === 7 && readiness.groupCounts.B === 7} defaultOpen={entries.length === 14 && readiness.groupCounts.A !== 7}>
        <div className="space-y-6">
          <p className="text-xs leading-relaxed text-neutral-500">Assign every entry to one numbered slot. Selecting a team already in another slot swaps the two positions; the move button swaps the same numbered slot across groups.</p>
          <div className="grid gap-5 lg:grid-cols-2">
            {GROUP_KEYS.map((groupKey) => (
              <fieldset key={groupKey} className="rounded-[24px] border border-white/5 bg-black/20 p-4" disabled={!allowedActions.assignGroups || Boolean(busyAction)}>
                <legend className="px-2 text-sm font-black uppercase tracking-widest text-white">Group {groupKey}</legend>
                <div className="mt-3 space-y-2">
                  {groupSlots[groupKey].map((entryId, index) => (
                    <div key={`${groupKey}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)_38px] items-center gap-2">
                      <span className="text-center text-[10px] font-black text-blue-400">{index + 1}</span>
                      <label className="sr-only" htmlFor={`group-${groupKey}-${index}-${tournamentId}`}>Group {groupKey} slot {index + 1}</label>
                      <select id={`group-${groupKey}-${index}-${tournamentId}`} value={entryId} onChange={(event) => assignEntryToGroupSlot(groupKey, index, event.target.value)} className="min-w-0 rounded-xl border border-white/10 bg-[#07131a] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500">
                        <option value="">Choose team…</option>
                        {entries.map((entry) => <option key={entry._id} value={entry._id}>{entry.teamId.name}</option>)}
                      </select>
                      <button type="button" onClick={() => swapGroupSlot(groupKey, index)} aria-label={`Swap group ${groupKey} slot ${index + 1} with group ${groupKey === 'A' ? 'B' : 'A'}`} title={`Swap with Group ${groupKey === 'A' ? 'B' : 'A'} slot ${index + 1}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 text-neutral-500 hover:border-blue-500/30 hover:text-blue-400">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">{groupsComplete ? 'All 14 slots contain one unique team.' : 'Fill all 14 slots before saving.'}</span>
            <button type="button" onClick={() => void handleSaveGroups()} disabled={!allowedActions.assignGroups || !groupsComplete || Boolean(busyAction)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busyAction === 'groups' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Save both groups
            </button>
          </div>
        </div>
      </StepCard>

      <StepCard number={4} title="Group fixtures" summary={progress.workflowState === 'group_stage' ? `${completedGroupMatches} of ${expectedGroupMatches} completed` : 'Preview the exact 42-match single-leg schedule before publishing'} complete={['group_stage', 'qualification_finalized', 'knockout_stage'].includes(progress.workflowState)} defaultOpen={progress.workflowState === 'groups_assigned'}>
        {progress.workflowState === 'groups_assigned' ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor={`matches-per-day-${tournamentId}`} className={labelClassName}>Matches per calendar day</label>
                <input id={`matches-per-day-${tournamentId}`} type="number" min={3} max={28} value={matchesPerDay} onChange={(event) => { setMatchesPerDay(event.target.value); setFixturePlan(null); }} placeholder="Enter an approved number (3–28)" className={inputClassName} />
                <p className="text-[9px] text-neutral-600">Minimum 3 keeps each combined Group A/B round within its Saturday–Sunday matchweek.</p>
              </div>
              <button type="button" onClick={() => void handlePreviewFixtures()} disabled={!allowedActions.previewFixtures || !matchesPerDay || Boolean(busyAction)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-6 text-[10px] font-black uppercase tracking-widest text-blue-300 disabled:cursor-not-allowed disabled:opacity-40">
                {busyAction === 'preview' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Preview schedule
              </button>
            </div>

            {fixturePlan ? (
              <div className="overflow-hidden rounded-2xl border border-white/5">
                <div className="flex flex-col gap-3 bg-blue-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{fixturePlan.totalMatches} fixtures • Single round robin</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-neutral-500">Verified plan {fixturePlan.planHash.slice(0, 12)}…</p>
                  </div>
                  {canManageCompetition ? (
                    <button type="button" onClick={() => void handlePublishFixtures()} disabled={!allowedActions.publishFixtures || fixturePlan.tournamentRevision !== revision || Boolean(busyAction)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40">
                      {busyAction === 'publish-fixtures' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Publish fixtures
                    </button>
                  ) : <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-500"><LockKeyhole className="h-3.5 w-3.5" /> Administrator access required</span>}
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <caption className="sr-only">Group-stage fixture preview</caption>
                    <thead className="sticky top-0 bg-[#07131a] text-[8px] font-black uppercase tracking-widest text-neutral-500">
                      <tr><th scope="col" className="px-4 py-3">Group</th><th scope="col" className="px-4 py-3">Round</th><th scope="col" className="px-4 py-3">Fixture</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3">Venue</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fixturePlan.fixtures.map((fixture) => (
                        <tr key={fixture.fixtureKey} className="text-neutral-300">
                          <td className="px-4 py-3 font-black text-blue-400">{fixture.groupKey}</td>
                          <td className="px-4 py-3">L{fixture.leg} • R{fixture.round}</td>
                          <td className="px-4 py-3 font-bold text-white">{fixture.homeTeamName} <span className="text-neutral-600">vs</span> {fixture.awayTeamName}</td>
                          <td className="whitespace-nowrap px-4 py-3">{new Date(fixture.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                          <td className="px-4 py-3">{fixture.venue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Scheduled', value: scheduledGroupMatches },
              { label: 'Live', value: liveGroupMatches },
              { label: 'Completed', value: completedGroupMatches },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center"><p className="text-2xl font-black italic text-white">{item.value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-neutral-600">{item.label}</p></div>)}
          </div>
        )}
      </StepCard>

      <StepCard number={5} title="Qualification & knockout workflow" summary={progress.workflowState === 'completed' ? `Champion: ${bracket.championTeam?.name ?? 'recorded'}` : progress.workflowState === 'group_stage' ? `${completedGroupMatches}/${expectedGroupMatches} group matches complete` : latestDraw ? `Quarter-final bracket v${latestDraw.version} • ${latestDraw.status}` : 'Finalize the top four in each group, then publish the fixed quarter-finals'} complete={progress.workflowState === 'completed'} defaultOpen={['group_stage', 'qualification_finalized', 'knockout_stage', 'completed'].includes(progress.workflowState)}>
        <div className="space-y-6">
          {progress.workflowState === 'group_stage' ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">Group stage: {completedGroupMatches} of {expectedGroupMatches} completed</p>
                  <p className="mt-1 text-xs text-neutral-500">The top four in each group qualify after every match is complete and any head-to-head or committee tie affecting qualification or seeding is resolved.</p>
                </div>
                {canManageCompetition ? (
                  <button type="button" onClick={() => void handleFinalizeQualification()} disabled={!allowedActions.finalizeQualification || !groupStageComplete || rankingState?.canFinalizeQualification !== true || Boolean(busyAction)} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
                    {busyAction === 'qualification' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finalize qualifiers
                  </button>
                ) : <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-600"><LockKeyhole className="h-3.5 w-3.5" /> Administrator access required</span>}
              </div>

              {rankingError ? (
                <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>{rankingError}</span>
                  <button type="button" onClick={() => void fetchRanking()} className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-white"><RefreshCw className="h-3.5 w-3.5" /> Reload ranking</button>
                </div>
              ) : null}

              {rankingState?.groupStageComplete && rankingState.unresolvedTies.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-200">Committee decision required</p>
                    <p className="mt-1 text-xs text-orange-100/70">The automatic order—points, goal difference, goals scored, then head-to-head—still leaves {rankingState.unresolvedTies.length} exact {rankingState.unresolvedTies.length === 1 ? 'tie' : 'ties'}. Any tie marked as affecting a quarter-final place must be ordered before qualification can be locked.</p>
                  </div>
                  {rankingState.unresolvedTies.map((tie) => (
                    <CommitteeTieResolutionCard
                      key={tie.basisHash}
                      tie={tie}
                      teamNames={teamNameById}
                      canManageCompetition={canManageCompetition}
                      correctionAllowed={progress.workflowState === 'group_stage'}
                      disabled={Boolean(busyAction)}
                      onResolve={handleResolveCommitteeTie}
                    />
                  ))}
                </div>
              ) : null}

              {rankingState?.groupStageComplete && rankingState.unresolvedTies.length === 0 ? (
                <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> Ranking order is complete. The top four in each group can now be finalized.
                </div>
              ) : null}

              {rankingState?.groupStageComplete && resolvedCommitteeTies.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Applied committee decisions</p>
                    <p className="mt-1 text-xs text-neutral-500">Review the saved order below. An administrator can correct it before qualification is finalized.</p>
                  </div>
                  {resolvedCommitteeTies.map((tie) => (
                    <CommitteeTieResolutionCard
                      key={`${tie.basisHash}:${tie.decidedAt ?? 'active'}`}
                      tie={tie}
                      teamNames={teamNameById}
                      canManageCompetition={canManageCompetition}
                      correctionAllowed={progress.workflowState === 'group_stage'}
                      disabled={Boolean(busyAction)}
                      onResolve={handleResolveCommitteeTie}
                    />
                  ))}
                </div>
              ) : null}

              {rankingState?.groupStageComplete && committeeResolutionHistory.length > 0 ? (
                <CommitteeDecisionAuditHistory
                  history={committeeResolutionHistory}
                  teamNames={teamNameById}
                />
              ) : null}

              {rankingState && !rankingState.groupStageComplete ? (
                <p className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-neutral-500">Committee controls stay hidden until all 42 group matches are complete. Current live rankings continue to update from completed results.</p>
              ) : null}

              {rankingState && rankingState.staleResolutionBasisHashes.length > 0 ? (
                <p role="alert" className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-200">A previous committee decision no longer matches the current result basis and is not being applied. Review any unresolved tie shown above.</p>
              ) : null}
            </div>
          ) : null}

          {RANKING_AUDIT_WORKFLOW_STATES.has(progress.workflowState) ? (
            <div className="space-y-4 rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Committee decision record</p>
                  <p className="mt-1 text-xs text-neutral-600">Qualification is locked. Saved decisions and corrections remain visible here, but can no longer be changed.</p>
                </div>
              </div>

              {isRankingLoading && !rankingState ? (
                <p role="status" className="flex items-center gap-2 text-xs text-neutral-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading committee decision record…</p>
              ) : null}

              {rankingError ? (
                <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>{rankingError}</span>
                  <button type="button" onClick={() => void fetchRanking()} className="inline-flex min-h-10 items-center gap-2 font-black uppercase tracking-widest text-white"><RefreshCw className="h-3.5 w-3.5" /> Reload record</button>
                </div>
              ) : null}

              {resolvedCommitteeTies.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Applied committee decisions</p>
                  {resolvedCommitteeTies.map((tie) => (
                    <CommitteeTieResolutionCard
                      key={`${tie.basisHash}:${tie.decidedAt ?? 'active'}`}
                      tie={tie}
                      teamNames={teamNameById}
                      canManageCompetition={canManageCompetition}
                      correctionAllowed={false}
                      disabled={Boolean(busyAction)}
                      onResolve={handleResolveCommitteeTie}
                    />
                  ))}
                </div>
              ) : null}

              {committeeResolutionHistory.length > 0 ? (
                <CommitteeDecisionAuditHistory
                  history={committeeResolutionHistory}
                  teamNames={teamNameById}
                />
              ) : null}

              {!isRankingLoading && !rankingError && rankingState && resolvedCommitteeTies.length === 0 && committeeResolutionHistory.length === 0 ? (
                <p className="text-xs text-neutral-600">No committee decision was required during qualification.</p>
              ) : null}
            </div>
          ) : null}

          {progress.workflowState === 'qualification_finalized' ? (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {tournament.qualificationSnapshot.map((qualified) => {
                  const entry = entryById.get(qualified.tournamentEntryId);
                  return (
                    <div key={qualified.tournamentEntryId} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-[9px] font-black text-emerald-400">{qualified.groupKey}{qualified.rank}</span>
                      <span className="min-w-0 truncate text-xs font-bold text-white">{entry?.teamId.name ?? 'Qualified team'}</span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Fixed quarter-final path</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-600">Pairings come directly from final group positions; there is no random or manual draw.</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {FIXED_QUARTER_FINALS.map((pairing) => (
                    <div key={pairing.slot} className="grid grid-cols-[26px_minmax(0,1fr)_22px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-white/5 p-3">
                      <span className="text-[9px] font-black text-blue-400">QF{pairing.slot}</span>
                      <span className="min-w-0 truncate text-[10px] font-bold text-white" title={qualifiedPositionName(pairing.home.groupKey, pairing.home.rank)}>{pairing.home.groupKey}{pairing.home.rank} • {qualifiedPositionName(pairing.home.groupKey, pairing.home.rank)}</span>
                      <span className="text-center text-[8px] font-black text-neutral-700">VS</span>
                      <span className="min-w-0 truncate text-right text-[10px] font-bold text-white" title={qualifiedPositionName(pairing.away.groupKey, pairing.away.rank)}>{pairing.away.groupKey}{pairing.away.rank} • {qualifiedPositionName(pairing.away.groupKey, pairing.away.rank)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Creating the fixed bracket saves a reviewable draft; publishing it schedules the quarter-finals.</p>
                {canManageCompetition ? (
                  <button type="button" onClick={() => void handleCreateDraw()} disabled={!allowedActions.createDraw || Boolean(busyAction)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
                    {busyAction === 'create-draw' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {currentDraftDraw ? 'Replace bracket draft' : 'Create QF bracket'}
                  </button>
                ) : <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-600"><LockKeyhole className="h-3.5 w-3.5" /> Administrator access required</span>}
              </div>
            </div>
          ) : null}

          {currentDraftDraw ? (
            <div className="overflow-hidden rounded-2xl border border-blue-500/20">
              <div className="flex flex-col gap-3 bg-blue-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">Fixed quarter-final bracket • Version {currentDraftDraw.version}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-blue-300">{DRAW_MODE_LABELS[currentDraftDraw.mode]}</p>
                </div>
                {canManageCompetition && progress.workflowState === 'qualification_finalized' ? (
                  <button type="button" onClick={() => void handlePublishDraw(currentDraftDraw)} disabled={Boolean(busyAction)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40">
                    {busyAction === 'publish-draw' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Publish quarter-finals
                  </button>
                ) : null}
              </div>
              <div className="grid gap-px bg-white/5 sm:grid-cols-2">
                {currentDraftDraw.pairings.map((pairing) => (
                  <div key={pairing.slot} className="bg-[#07131a] p-4 text-xs">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Match {pairing.slot}</span>
                    <p className="mt-2 font-bold text-white">{drawTeamName(pairing.homeTeamId, pairing.homeEntryId)} <span className="px-1 text-neutral-600">vs</span> {drawTeamName(pairing.awayTeamId, pairing.awayEntryId)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {['knockout_stage', 'completed'].includes(progress.workflowState) && bracket.status !== 'not_created' ? (
            <div className="space-y-5">
              {bracket.championTeam ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
                    <Trophy className="mx-auto h-5 w-5 text-yellow-400" />
                    <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-yellow-300">Champion</p>
                    <p className="mt-1 text-sm font-black text-white">{bracket.championTeam.name ?? 'Recorded team'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Runner-up</p>
                    <p className="mt-2 text-sm font-black text-white">{bracket.runnerUpTeam?.name ?? '—'}</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {KNOCKOUT_STAGE_ORDER.map((stage) => {
                  const nodes = bracket.stages[stage] ?? [];
                  if (nodes.length === 0) return null;
                  return (
                    <div key={stage} className="overflow-hidden rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between bg-black/20 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white">{humanize(stage)}</p>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">{nodes.filter((node) => node.resolvedAt).length}/{nodes.length} resolved</span>
                      </div>
                      <div className="grid gap-px bg-white/5 sm:grid-cols-2">
                        {nodes.map((node) => {
                          const homeName = node.match?.homeTeam?.name ?? node.homeTeam?.name ?? 'Awaiting team';
                          const awayName = node.match?.awayTeam?.name ?? node.awayTeam?.name ?? 'Awaiting team';
                          return (
                            <div key={node.key} className="bg-[#07131a] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Match {node.slot}</span>
                                <span className={clsx('rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-widest', node.match?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : node.match?.status === 'live' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-neutral-600')}>{node.match?.status ?? 'waiting'}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                <span className={clsx('min-w-0 flex-1 truncate font-bold', node.winnerTeam?._id === node.homeTeam?._id ? 'text-yellow-300' : 'text-white')}>{homeName}</span>
                                <span className="shrink-0 font-black text-neutral-500">{node.match ? `${node.match.homeScore} – ${node.match.awayScore}` : 'vs'}</span>
                                <span className={clsx('min-w-0 flex-1 truncate text-right font-bold', node.winnerTeam?._id === node.awayTeam?._id ? 'text-yellow-300' : 'text-white')}>{awayName}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allowedActions.progressKnockout ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{humanize(progressionStage)}: {resolvedProgressionNodes}/{progressionNodes.length} validated result(s)</p>
                    <p className="mt-1 text-xs text-neutral-400">Every match in this round must be completed with its winner set in the match console.</p>
                  </div>
                  {canManageCompetition ? (
                    <button type="button" onClick={() => void handleProgressKnockout()} disabled={!progressionReady || Boolean(busyAction)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
                      {busyAction === 'progress-knockout' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {progressionButtonLabel(progress.workflowState, tournament.currentStage)}
                    </button>
                  ) : <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-600"><LockKeyhole className="h-3.5 w-3.5" /> Administrator access required</span>}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs leading-relaxed text-yellow-100/80">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <span>The knockout route is fixed: A1–B4, A2–B3, B1–A4, and B2–A3, followed by semi-finals and the final. There is no random draw, play-in, bye, or third-place match.</span>
          </div>
        </div>
      </StepCard>
    </section>
  );
}
