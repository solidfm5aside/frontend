'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/api-client';
import { WomensFinalFixtureEditor } from '@/components/admin/WomensFinalFixtureEditor';
import { WomensLeagueFixtureEditor } from '@/components/admin/WomensLeagueFixtureEditor';
import { Select } from '@/components/ui/Select';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import type {
  CompetitionCommitteeDecisionMethod,
  CompetitionEntry,
  CompetitionRules,
  CompetitionTeamSummary,
} from '@/types/competition';
import type { Match } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TeamsResponse extends ApiResponse<CompetitionTeamSummary[]> {
  pagination?: { page: number; limit: number; total: number; pages: number };
}

interface VenueOption {
  _id: string;
  name: string;
}

interface WomensTournamentOverview {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  endDate?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  currentStage: string;
  fixturesGenerated: boolean;
  formatVersion: 3;
  format: 'single_table_final';
  division: 'women';
  workflowState: string;
  workflowRevision: number;
  competitionRules: CompetitionRules;
  qualificationSnapshot: WomensQualificationSnapshotEntry[];
  championTeamId?: string;
  runnerUpTeamId?: string;
}

interface WomensAllowedActions {
  editRules: false;
  editEntries: boolean;
  assignGroups: false;
  previewFixtures: boolean;
  publishFixtures: boolean;
  finalizeQualification: boolean;
  resolveTie: boolean;
  previewFinal: boolean;
  publishFinal: boolean;
  progressFinal: boolean;
}

interface WomensCapabilities {
  usesGroups: false;
  manualGroupAssignment: false;
  physicalLeagueFixtures: true;
  randomFixtureGeneration: false;
  qualifiesToFinal: true;
  physicalFinal: true;
  knockoutDraw: false;
  semifinals: false;
  thirdPlace: false;
}

interface WomensQualificationSnapshotEntry {
  tournamentEntryId: string;
  teamId: string;
  rank: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  scope: 'table';
}

interface WomensOverview {
  tournament: WomensTournamentOverview;
  entries: CompetitionEntry[];
  readiness: {
    isReadyForFixturePreview: boolean;
    blockers: string[];
    entryCount: number;
    requiredEntryCount: 3;
    venueCount: number;
  };
  progress: {
    workflowState: string;
    workflowRevision: number;
    leagueMatches?: Record<string, number>;
    groupMatches?: Record<string, number>;
    ranking?: WomensRankingState | null;
  };
  formatPolicy: Record<string, unknown>;
  allowedActions: WomensAllowedActions;
  capabilities: WomensCapabilities;
}

interface WomensStandingRow {
  tournamentEntryId: string;
  tableSlot: number;
  teamId: CompetitionTeamSummary;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
}

interface WomensTableTie {
  scope: 'table';
  basisHash: string;
  startRank: number;
  endRank: number;
  teamIds: string[];
  affectsQualificationOrSeeding: boolean;
  resolved: boolean;
  orderedTeamIds?: string[];
  method?: CompetitionCommitteeDecisionMethod;
  note?: string;
}

interface WomensRankingState {
  tournamentId: string;
  workflowRevision: number;
  scope: 'table';
  table: WomensStandingRow[];
  ties: WomensTableTie[];
  unresolvedTies: WomensTableTie[];
  staleResolutionBasisHashes: string[];
  leagueComplete: boolean;
  canFinalizeQualification: boolean;
}

interface TournamentMetadataDraft {
  name: string;
  season: string;
  startDate: string;
  endDate: string;
}

interface WomensCompetitionPanelProps {
  tournamentId: string;
  canManageCompetition: boolean;
}

const REGISTERED_TEAM_PAGE_SIZE = 100;
const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base font-bold text-white outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark] [@media(pointer:fine)]:text-sm';
const labelClassName = 'text-[9px] font-black uppercase tracking-[0.18em] text-neutral-500';
const CONFIRMED_FORMAT_SUMMARY = [
  { label: 'Division', value: 'Women', detail: 'Exactly three registered women’s teams' },
  { label: 'League', value: 'Single round', detail: 'Three physical fixtures • two per team' },
  { label: 'Qualification', value: 'Top two', detail: 'League rank 1 vs league rank 2' },
  { label: 'Final', value: 'One match', detail: 'No draw • no semi-final • no third place' },
  { label: 'Squad', value: 'Max 10', detail: 'Players stay within the women’s division' },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function humanize(value: string) {
  if (value === 'group_stage') return 'League stage';
  if (value === 'qualification_finalized') return 'Finalists locked';
  if (value === 'knockout_stage') return 'Final stage';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateInputValue(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

async function fetchAllRegisteredWomensTeams(): Promise<CompetitionTeamSummary[]> {
  const fetchPage = (page: number) => apiClient.get<TeamsResponse, TeamsResponse>(
    `/teams/admin?page=${page}&limit=${REGISTERED_TEAM_PAGE_SIZE}&registrationStatus=registered&division=women`,
  );
  const first = await fetchPage(1);
  if (!first.success) throw new Error(first.message || 'Registered women’s teams could not be loaded');
  const expectedTotal = first.pagination?.total ?? first.data.length;
  const pages = first.pagination?.pages ?? Math.ceil(expectedTotal / REGISTERED_TEAM_PAGE_SIZE);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => fetchPage(index + 2)));
  if (remaining.some((response) => !response.success || (response.pagination && response.pagination.total !== expectedTotal))) {
    throw new Error('The women’s team catalogue changed while it was loading. Reload and try again.');
  }
  const teams = [first, ...remaining].flatMap((response) => response.data);
  if (teams.length !== expectedTotal || new Set(teams.map((team) => team._id)).size !== expectedTotal) {
    throw new Error('The registered women’s team catalogue was incomplete. Reload before entering teams.');
  }
  return teams.sort((left, right) => left.name.localeCompare(right.name));
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
  const [isOpen, setIsOpen] = useState(() => Boolean(defaultOpen));

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group rounded-[26px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${complete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
          {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
        </span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-black uppercase tracking-widest text-white">{title}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-600">{summary}</span></span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/5 p-5 sm:p-6">{children}</div>
    </details>
  );
}

function WomensTieCard({
  tie,
  teamNames,
  disabled,
  onResolve,
}: {
  tie: WomensTableTie;
  teamNames: Map<string, string>;
  disabled: boolean;
  onResolve: (input: { basisHash: string; orderedTeamIds: string[]; method: CompetitionCommitteeDecisionMethod; note?: string }) => Promise<void>;
}) {
  const [orderedTeamIds, setOrderedTeamIds] = useState(() => [...tie.teamIds]);
  const [method, setMethod] = useState<'' | CompetitionCommitteeDecisionMethod>('');
  const [note, setNote] = useState('');

  const move = (index: number, direction: -1 | 1) => {
    setOrderedTeamIds((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!method || disabled || (method === 'other' && !note.trim())) return;
    await onResolve({
      basisHash: tie.basisHash,
      orderedTeamIds,
      method,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
      <div><p className="text-xs font-black uppercase tracking-widest text-orange-200">Committee order required</p><p className="mt-1 text-[9px] text-orange-100/60">Ranks {tie.startRank}–{tie.endRank}{tie.affectsQualificationOrSeeding ? ' affect the final places or seeding.' : ' remain exactly tied.'}</p></div>
      <ol className="space-y-2">
        {orderedTeamIds.map((teamId, index) => (
          <li key={teamId} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[9px] font-black text-white">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{teamNames.get(teamId) ?? 'Tied team'}</span>
            <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Move ${teamNames.get(teamId) ?? 'team'} up`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 text-neutral-500 hover:text-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={disabled || index === orderedTeamIds.length - 1} aria-label={`Move ${teamNames.get(teamId) ?? 'team'} down`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 text-neutral-500 hover:text-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><label htmlFor={`women-tie-method-${tie.basisHash}`} className={labelClassName}>Decision method</label><Select id={`women-tie-method-${tie.basisHash}`} required controlSize="compact" value={method} onChange={(event) => setMethod(event.target.value as typeof method)}><option value="">Choose method…</option><option value="coin_toss">Coin toss</option><option value="draw">Committee draw</option><option value="other">Other documented method</option></Select></div>
        <div className="space-y-1.5"><label htmlFor={`women-tie-note-${tie.basisHash}`} className={labelClassName}>Committee note {method === 'other' ? '(required)' : '(optional)'}</label><input id={`women-tie-note-${tie.basisHash}`} required={method === 'other'} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className={inputClassName} /></div>
      </div>
      <button type="submit" disabled={!method || disabled || (method === 'other' && !note.trim())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[9px] font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-4 w-4" /> Save final table order</button>
    </form>
  );
}

export function WomensCompetitionPanel({ tournamentId, canManageCompetition }: WomensCompetitionPanelProps) {
  const [overview, setOverview] = useState<WomensOverview | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<CompetitionTeamSummary[]>([]);
  const [registeredTeamsAvailable, setRegisteredTeamsAvailable] = useState(true);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<WomensRankingState | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [metadataDraft, setMetadataDraft] = useState<TournamentMetadataDraft>({ name: '', season: '', startDate: '', endDate: '' });
  const requestSequence = useRef(0);

  const fetchCompetition = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const [overviewResult, womenTeamsResult, venuesResult, matchesResult] = await Promise.allSettled([
        apiClient.get<ApiResponse<WomensOverview>, ApiResponse<WomensOverview>>(`/tournaments/${tournamentId}/competition`),
        fetchAllRegisteredWomensTeams(),
        apiClient.get<ApiResponse<VenueOption[]>, ApiResponse<VenueOption[]>>('/venues'),
        apiClient.get<ApiResponse<Match[]>, ApiResponse<Match[]>>(`/matches?tournamentId=${encodeURIComponent(tournamentId)}`),
      ]);
      if (overviewResult.status === 'rejected') throw overviewResult.reason;
      const overviewResponse = overviewResult.value;
      if (!overviewResponse.success) throw new Error(overviewResponse.message || 'The women’s competition workspace could not be loaded');
      if (requestId !== requestSequence.current) return;
      if (overviewResponse.data.tournament.formatVersion !== 3 || overviewResponse.data.tournament.format !== 'single_table_final' || overviewResponse.data.tournament.division !== 'women') {
        throw new Error('The server returned a different competition format for this women’s workspace');
      }

      const ancillaryIssues: string[] = [];
      const womenTeams = womenTeamsResult.status === 'fulfilled' ? womenTeamsResult.value : [];
      const teamsAvailable = womenTeamsResult.status === 'fulfilled';
      if (!teamsAvailable) ancillaryIssues.push('registered women’s teams');

      const venuesResponse = venuesResult.status === 'fulfilled' ? venuesResult.value : null;
      if (!venuesResponse?.success) ancillaryIssues.push('venues');

      const matchesResponse = matchesResult.status === 'fulfilled' ? matchesResult.value : null;
      if (!matchesResponse?.success) ancillaryIssues.push('match records');

      setOverview(overviewResponse.data);
      setRegisteredTeams(womenTeams);
      setRegisteredTeamsAvailable(teamsAvailable);
      setVenues(venuesResponse?.success ? venuesResponse.data : []);
      setMatches(matchesResponse?.success ? matchesResponse.data : []);
      setRanking(overviewResponse.data.progress.ranking ?? null);
      setMetadataDraft({
        name: overviewResponse.data.tournament.name,
        season: overviewResponse.data.tournament.season,
        startDate: dateInputValue(overviewResponse.data.tournament.startDate),
        endDate: dateInputValue(overviewResponse.data.tournament.endDate),
      });
      setLoadError(ancillaryIssues.length > 0
        ? `The competition record loaded, but ${ancillaryIssues.join(', ')} could not be refreshed. Retry before making changes that depend on them.`
        : null);
    } catch (error: unknown) {
      if (requestId === requestSequence.current) setLoadError(getErrorMessage(error, 'Failed to load the women’s competition workspace'));
    } finally {
      if (!silent && requestId === requestSequence.current) setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchCompetition();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchCompetition]);

  const workflowState = overview?.progress.workflowState;
  const workflowRevision = overview?.progress.workflowRevision;
  useEffect(() => {
    if (!workflowState || !workflowRevision || !['group_stage', 'qualification_finalized', 'knockout_stage', 'completed'].includes(workflowState)) return;
    let cancelled = false;
    const fetchRanking = async () => {
      try {
        const response = await apiClient.get<ApiResponse<WomensRankingState>, ApiResponse<WomensRankingState>>(`/tournaments/${tournamentId}/competition/ranking`);
        if (!cancelled && response.success) setRanking(response.data);
      } catch (error) {
        if (!cancelled) console.warn('Women’s ranking audit is temporarily unavailable:', error);
      }
    };
    void fetchRanking();
    return () => { cancelled = true; };
  }, [tournamentId, workflowRevision, workflowState]);

  const entryTeamIds = useMemo(() => new Set(overview?.entries.map((entry) => entry.teamId._id) ?? []), [overview?.entries]);
  const availableTeams = useMemo(() => registeredTeams.filter((team) => !entryTeamIds.has(team._id)), [entryTeamIds, registeredTeams]);
  const teamNames = useMemo(() => new Map(overview?.entries.map((entry) => [entry.teamId._id, entry.teamId.name]) ?? []), [overview?.entries]);

  if (isLoading && !overview) return <div className="flex min-h-56 items-center justify-center rounded-[30px] border border-white/5 bg-white/[0.02]" role="status"><LoaderCircle className="h-6 w-6 animate-spin text-blue-500" /><span className="sr-only">Loading women’s competition workspace</span></div>;
  if (!overview) return <div role="alert" className="rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300"><p>{loadError ?? 'Women’s competition workspace is unavailable.'}</p><button type="button" onClick={() => void fetchCompetition()} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4"><RefreshCw className="h-3.5 w-3.5" /> Try again</button></div>;

  const { tournament, entries, readiness } = overview;
  const revision = overview.progress.workflowRevision;
  const actionPolicy = overview.allowedActions;
  const leagueMatches = matches.filter((match) => match.stage === 'league');
  const completedLeagueMatches = overview.progress.leagueMatches?.completed ?? leagueMatches.filter((match) => match.status === 'completed').length;
  const finalMatch = matches.find((match) => match.stage === 'final');
  const finalReadyToComplete = finalMatch?.status === 'completed' && Boolean(finalMatch.winner);
  const rulesConfirmed = tournament.competitionRules.teamCount === 3 && tournament.competitionRules.groupCount === 1 && tournament.competitionRules.teamsPerGroup === 3 && tournament.competitionRules.roundRobinLegs === 1 && tournament.competitionRules.qualifiersPerGroup === 2 && tournament.competitionRules.drawMode === null && tournament.competitionRules.thirdPlaceMatch === false && tournament.competitionRules.maxRosterPlayers === 10 && overview.capabilities.physicalLeagueFixtures && overview.capabilities.qualifiesToFinal && overview.capabilities.physicalFinal && !overview.capabilities.randomFixtureGeneration && !overview.capabilities.knockoutDraw && !overview.capabilities.semifinals && !overview.capabilities.thirdPlace;

  const persistedStart = dateInputValue(tournament.startDate);
  const persistedEnd = dateInputValue(tournament.endDate);
  const metadataChanged = metadataDraft.name.trim() !== tournament.name || metadataDraft.season.trim() !== tournament.season || (!tournament.fixturesGenerated && (metadataDraft.startDate !== persistedStart || metadataDraft.endDate !== persistedEnd));
  const metadataValid = metadataDraft.name.trim().length >= 3 && metadataDraft.season.trim().length > 0 && (tournament.fixturesGenerated || (Boolean(metadataDraft.startDate) && (!metadataDraft.endDate || metadataDraft.endDate >= metadataDraft.startDate)));

  const handleMetadataSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCompetition || !metadataChanged || !metadataValid || busyAction) return;
    setBusyAction('metadata');
    try {
      const response = await apiClient.patch<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}`, {
        name: metadataDraft.name.trim(), season: metadataDraft.season.trim(),
        ...(!tournament.fixturesGenerated ? { startDate: metadataDraft.startDate, endDate: metadataDraft.endDate || null } : {}),
      });
      if (!response.success) throw new Error(response.message || 'Women’s season details could not be saved');
      toast.success('Women’s season details saved');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to save women’s season details')); } finally { setBusyAction(null); }
  };

  const handleAddEntry = async () => {
    if (!canManageCompetition || !actionPolicy.editEntries || !selectedTeamId || busyAction || entries.length >= 3) return;
    setBusyAction('add-entry');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/competition/entries`, { expectedRevision: revision, teamId: selectedTeamId });
      if (!response.success) throw new Error(response.message || 'Women’s team could not be added');
      setSelectedTeamId('');
      toast.success('Women’s team entered in this tournament');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to enter the women’s team')); } finally { setBusyAction(null); }
  };

  const handleRemoveEntry = async (entry: CompetitionEntry) => {
    if (!canManageCompetition || !actionPolicy.editEntries || busyAction || !window.confirm(`Remove ${entry.teamId.name} from this women’s tournament?`)) return;
    setBusyAction(`remove:${entry._id}`);
    try {
      const response = await apiClient.delete<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/competition/entries/${entry._id}`, { data: { expectedRevision: revision } });
      if (!response.success) throw new Error(response.message || 'Women’s team could not be removed');
      toast.success('Women’s tournament entry removed');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to remove the women’s tournament entry')); } finally { setBusyAction(null); }
  };

  const handleResolveTie = async (input: { basisHash: string; orderedTeamIds: string[]; method: CompetitionCommitteeDecisionMethod; note?: string }) => {
    if (busyAction || !canManageCompetition || !actionPolicy.resolveTie) return;
    const orderedNames = input.orderedTeamIds.map((teamId, index) => `${index + 1}. ${teamNames.get(teamId) ?? 'Tied team'}`).join('\n');
    if (!window.confirm(`Save this final women’s table order?\n\n${orderedNames}`)) return;
    setBusyAction(`tie:${input.basisHash}`);
    try {
      const response = await apiClient.put<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/competition/table/tie-resolutions`, { expectedRevision: revision, ...input });
      if (!response.success) throw new Error(response.message || 'Committee order could not be saved');
      toast.success('Women’s table committee order saved');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to save the committee order')); } finally { setBusyAction(null); }
  };

  const handleFinalizeQualification = async () => {
    if (!canManageCompetition || !actionPolicy.finalizeQualification || busyAction || !ranking?.canFinalizeQualification) return;
    if (!window.confirm('Lock the completed women’s league table and qualify ranks 1 and 2 for the final?')) return;
    setBusyAction('qualification');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/competition/qualification/finalize`, { expectedRevision: revision }, { headers: { 'Idempotency-Key': `solidfm:${tournamentId}:womens-qualification:${revision}` } });
      if (!response.success) throw new Error(response.message || 'Women’s qualification could not be finalized');
      toast.success('Top two women’s teams finalized');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to finalize the women’s top two')); } finally { setBusyAction(null); }
  };

  const handleCompleteCompetition = async () => {
    if (!canManageCompetition || !actionPolicy.progressFinal || busyAction || !finalReadyToComplete) return;
    if (!window.confirm('Confirm the women’s final winner, runner-up and champion record?')) return;
    setBusyAction('complete');
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>(`/tournaments/${tournamentId}/competition/knockout/progress`, { expectedRevision: revision }, { headers: { 'Idempotency-Key': `solidfm:${tournamentId}:womens-complete:${revision}:${finalMatch?._id ?? 'final'}` } });
      if (!response.success) throw new Error(response.message || 'Women’s champion could not be confirmed');
      toast.success('Women’s champion confirmed and competition completed');
      await fetchCompetition(true);
    } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to complete the women’s competition')); } finally { setBusyAction(null); }
  };

  const qualificationNames = [...tournament.qualificationSnapshot].sort((left, right) => left.rank - right.rank).map((item) => teamNames.get(item.teamId) ?? 'Qualified team');
  const qualificationLocked = ['qualification_finalized', 'knockout_stage', 'completed'].includes(overview.progress.workflowState);
  const unresolvedQualificationTeamIds = new Set(
    ranking?.unresolvedTies
      .filter((tie) => tie.affectsQualificationOrSeeding)
      .flatMap((tie) => tie.teamIds) ?? [],
  );

  return (
    <section aria-labelledby={`womens-competition-${tournamentId}-title`} className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] border border-blue-500/20 bg-blue-500/[0.04] p-5 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-blue-400">Women • Three-Team League</span><span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-neutral-400">{humanize(overview.progress.workflowState)}</span></div><h3 id={`womens-competition-${tournamentId}-title`} className="text-2xl font-black uppercase tracking-tighter text-white italic sm:text-3xl">{tournament.name}</h3><p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">Season {tournament.season} • Women’s division • Workflow revision {revision}</p></div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]"><div className="rounded-2xl border border-white/5 bg-black/20 p-3 text-center"><p className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Teams</p><p className="mt-1 text-xl font-black text-white italic">{entries.length}/3</p></div><div className="rounded-2xl border border-white/5 bg-black/20 p-3 text-center"><p className="text-[7px] font-black uppercase tracking-widest text-neutral-600">League</p><p className="mt-1 text-xl font-black text-white italic">{completedLeagueMatches}/3</p></div><div className="rounded-2xl border border-white/5 bg-black/20 p-3 text-center"><p className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Final</p><p className="mt-1 text-xl font-black text-white italic">{finalMatch?.status === 'completed' ? 'Done' : finalMatch ? 'Set' : '—'}</p></div></div>
        </div>
      </div>

      {loadError ? <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200 sm:flex-row sm:items-center"><span className="flex min-w-0 flex-1 items-start gap-3"><AlertCircle className="h-4 w-4 shrink-0" /><span>{loadError}</span></span><button type="button" onClick={() => void fetchCompetition(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/20 px-4 text-[9px] font-black uppercase tracking-widest text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div> : null}

      {readiness.blockers.length > 0 && overview.progress.workflowState !== 'group_stage' ? (
        <div role="status" className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-100">
          <p className="font-black uppercase tracking-widest">Before the league can be published</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-yellow-100/70">
            {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      ) : null}

      <StepCard key={`women-format-${rulesConfirmed}`} number={1} title="Season details & women’s format" summary={rulesConfirmed ? 'Confirmed three-team rules are active' : 'Competition rules need backend attention'} complete={rulesConfirmed} defaultOpen={!rulesConfirmed}>
        <form onSubmit={handleMetadataSave} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1.5"><label htmlFor={`women-name-${tournamentId}`} className={labelClassName}>Tournament name</label><input id={`women-name-${tournamentId}`} required minLength={3} maxLength={120} value={metadataDraft.name} onChange={(event) => setMetadataDraft((current) => ({ ...current, name: event.target.value }))} className={inputClassName} /></div><div className="space-y-1.5"><label htmlFor={`women-season-${tournamentId}`} className={labelClassName}>Season</label><input id={`women-season-${tournamentId}`} required maxLength={40} value={metadataDraft.season} onChange={(event) => setMetadataDraft((current) => ({ ...current, season: event.target.value }))} className={inputClassName} /></div><div className="space-y-1.5"><label htmlFor={`women-start-${tournamentId}`} className={labelClassName}>Start date</label><input id={`women-start-${tournamentId}`} type="date" required disabled={tournament.fixturesGenerated} value={metadataDraft.startDate} onChange={(event) => setMetadataDraft((current) => ({ ...current, startDate: event.target.value }))} className={inputClassName} /></div><div className="space-y-1.5"><label htmlFor={`women-end-${tournamentId}`} className={labelClassName}>End date (optional)</label><input id={`women-end-${tournamentId}`} type="date" min={metadataDraft.startDate || undefined} disabled={tournament.fixturesGenerated} value={metadataDraft.endDate} onChange={(event) => setMetadataDraft((current) => ({ ...current, endDate: event.target.value }))} className={inputClassName} /></div></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{CONFIRMED_FORMAT_SUMMARY.map((item) => <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 p-4"><p className="text-[7px] font-black uppercase tracking-widest text-neutral-600">{item.label}</p><p className="mt-2 text-sm font-black uppercase text-white">{item.value}</p><p className="mt-1 text-[8px] leading-relaxed text-neutral-500">{item.detail}</p></div>)}</div>
          <div className="flex justify-end"><button type="submit" disabled={!canManageCompetition || !metadataChanged || !metadataValid || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[9px] font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'metadata' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details</button></div>
        </form>
      </StepCard>

      <StepCard key={`women-entries-${entries.length === 3}`} number={2} title="Women’s tournament entries" summary={`${entries.length} of exactly 3 registered women’s teams entered`} complete={entries.length === 3} defaultOpen={entries.length !== 3}>
        <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><label htmlFor={`women-entry-${tournamentId}`} className="sr-only">Registered women’s team to enter</label><Select id={`women-entry-${tournamentId}`} surface="muted" value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} disabled={!registeredTeamsAvailable || !canManageCompetition || !actionPolicy.editEntries || entries.length >= 3 || Boolean(busyAction)}><option value="">Choose a registered women’s team…</option>{availableTeams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</Select><button type="button" onClick={() => void handleAddEntry()} disabled={!registeredTeamsAvailable || !canManageCompetition || !actionPolicy.editEntries || !selectedTeamId || entries.length >= 3 || Boolean(busyAction)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'add-entry' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Enter team</button></div><p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Only registered women’s teams are available. Existing men’s teams cannot be selected.</p><div className="grid gap-3 sm:grid-cols-3">{entries.map((entry) => <div key={entry._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"><TeamAvatar name={entry.teamId.name} logo={entry.teamId.logo} size="xs" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{entry.teamId.name}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-neutral-600">Table slot {entry.tableSlot ?? '—'}</p></div><button type="button" onClick={() => void handleRemoveEntry(entry)} disabled={!canManageCompetition || !actionPolicy.editEntries || Boolean(busyAction)} aria-label={`Remove ${entry.teamId.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30">{busyAction === `remove:${entry._id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div>)}</div>{registeredTeamsAvailable && registeredTeams.length < 3 ? <div role="alert" className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-100">Only {registeredTeams.length} registered women’s team{registeredTeams.length === 1 ? '' : 's'} currently exist. Add or update women’s teams in <Link href="/admin/teams" className="font-bold text-white underline underline-offset-4">Team Management</Link>.</div> : null}</div>
      </StepCard>

      <StepCard key={`women-fixtures-${entries.length === 3 && !tournament.fixturesGenerated}`} number={3} title="Official women’s league fixtures" summary={tournament.fixturesGenerated ? `${completedLeagueMatches}/3 league results completed` : 'Record the exact three physical fixtures, then review and publish'} complete={tournament.fixturesGenerated} defaultOpen={entries.length === 3 && !tournament.fixturesGenerated}>
        {entries.length === 3 ? <WomensLeagueFixtureEditor tournamentId={tournamentId} revision={revision} entries={entries} venues={venues} canManage={canManageCompetition} canReview={actionPolicy.previewFixtures !== false && overview.progress.workflowState === 'entries_ready'} canPublish={actionPolicy.publishFixtures !== false && overview.progress.workflowState === 'entries_ready'} onPublished={() => fetchCompetition(true)} /> : <p className="rounded-2xl border border-white/5 bg-black/20 p-5 text-xs text-neutral-500">Enter exactly three registered women’s teams before recording the physical fixture sheet.</p>}
      </StepCard>

      <StepCard key={`women-table-${overview.progress.workflowState === 'group_stage'}`} number={4} title="League table & top two" summary={overview.progress.workflowState === 'qualification_finalized' || overview.progress.workflowState === 'knockout_stage' || overview.progress.workflowState === 'completed' ? 'Ranks 1 and 2 are locked for the final' : `${completedLeagueMatches}/3 league matches completed`} complete={['qualification_finalized', 'knockout_stage', 'completed'].includes(overview.progress.workflowState)} defaultOpen={overview.progress.workflowState === 'group_stage'}>
        {ranking ? <div className="space-y-5"><div className="overflow-x-auto rounded-2xl border border-white/5"><table className="w-full min-w-[620px] text-left"><caption className="sr-only">Women’s league table</caption><thead className="bg-black/30"><tr>{['#', 'Team', 'MP', 'W', 'D', 'L', 'GD', 'PTS'].map((heading, index) => <th key={heading} className={`px-4 py-3 text-[8px] font-black uppercase tracking-widest text-neutral-600 ${index > 1 ? 'text-center' : ''}`}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{ranking.table.map((row) => { const tiePending = unresolvedQualificationTeamIds.has(row.teamId._id); const isLockedFinalist = qualificationLocked && row.rank <= 2; return <tr key={row.teamId._id} className={isLockedFinalist && row.rank === 2 ? 'border-b-2 border-emerald-500/20' : ''}><td className="px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black ${isLockedFinalist ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{row.rank}</span></td><td className="px-4 py-3"><span className="flex items-center gap-2"><TeamAvatar name={row.teamId.name} logo={row.teamId.logo} size="xs" /><span className="text-xs font-bold text-white">{row.teamId.name}</span>{isLockedFinalist ? <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[7px] font-black uppercase text-emerald-400">Final</span> : tiePending ? <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[7px] font-black uppercase text-orange-300">Tie pending</span> : null}</span></td>{[row.played, row.won, row.drawn, row.lost, row.goalDifference, row.points].map((value, index) => <td key={index} className="px-4 py-3 text-center text-xs font-bold text-neutral-300">{value}</td>)}</tr>; })}</tbody></table></div>{ranking.leagueComplete && ranking.unresolvedTies.length > 0 ? <div className="space-y-3">{ranking.unresolvedTies.map((tie) => <WomensTieCard key={tie.basisHash} tie={tie} teamNames={teamNames} disabled={!canManageCompetition || !actionPolicy.resolveTie || Boolean(busyAction)} onResolve={handleResolveTie} />)}</div> : null}{overview.progress.workflowState === 'group_stage' ? <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-white">League: {completedLeagueMatches} of 3 completed</p><p className="mt-1 text-[9px] text-neutral-500">All schedules must be confirmed and any tie affecting the top two resolved before locking the finalists.</p></div><button type="button" onClick={() => void handleFinalizeQualification()} disabled={!canManageCompetition || !actionPolicy.finalizeQualification || !ranking.canFinalizeQualification || Boolean(busyAction)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'qualification' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Lock top two</button></div> : null}</div> : <p className="rounded-2xl border border-white/5 bg-black/20 p-5 text-xs text-neutral-500">The women’s league table becomes available after the three official fixtures are published.</p>}
      </StepCard>

      <StepCard key={`women-final-${['qualification_finalized', 'knockout_stage', 'completed'].includes(overview.progress.workflowState)}`} number={5} title="Official women’s final" summary={overview.progress.workflowState === 'completed' ? `Champion: ${teamNames.get(tournament.championTeamId ?? '') ?? 'recorded'}` : finalMatch ? `${finalMatch.status} • ${finalMatch.date && finalMatch.venue ? 'schedule confirmed' : 'schedule TBC'}` : 'League rank 1 vs league rank 2 • physical schedule'} complete={overview.progress.workflowState === 'completed'} defaultOpen={['qualification_finalized', 'knockout_stage', 'completed'].includes(overview.progress.workflowState)}>
        {['qualification_finalized', 'knockout_stage', 'completed'].includes(overview.progress.workflowState) ? <div className="space-y-5"><WomensFinalFixtureEditor tournamentId={tournamentId} revision={revision} venues={venues} canManage={canManageCompetition} canReview={overview.progress.workflowState === 'qualification_finalized' && actionPolicy.previewFinal !== false} canPublish={overview.progress.workflowState === 'qualification_finalized' && actionPolicy.publishFinal !== false} homeTeamName={qualificationNames[0] ?? 'League rank 1'} awayTeamName={qualificationNames[1] ?? 'League rank 2'} onPublished={() => fetchCompetition(true)} />{overview.progress.workflowState === 'knockout_stage' ? <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-white">Final result: {finalMatch?.status ?? 'awaiting match record'}</p><p className="mt-1 text-[9px] text-neutral-500">Record and validate the final in Match Centre, then confirm the champion here.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Link href={`/admin/matches?tournament=${tournamentId}${finalMatch?._id ? `&match=${finalMatch._id}` : ''}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-[9px] font-black uppercase tracking-widest text-white">Open final</Link><button type="button" onClick={() => void handleCompleteCompetition()} disabled={!canManageCompetition || actionPolicy.progressFinal === false || !finalReadyToComplete || Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">{busyAction === 'complete' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Confirm champion</button></div></div> : null}{overview.progress.workflowState === 'completed' ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-100"><Trophy className="h-5 w-5 shrink-0" /> Women’s champion and runner-up are locked in the official record.</div> : null}</div> : <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 p-5 text-xs text-neutral-500"><LockKeyhole className="h-4 w-4 shrink-0" /> Complete all three league matches and lock the top two before recording the physical final schedule.</div>}
      </StepCard>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-relaxed text-blue-100"><Users className="mt-0.5 h-4 w-4 shrink-0" /><span>This women’s tournament is fully separate from the men’s competition. The app records physical league fixtures and the physical final schedule; it never runs a random generator or draw.</span></div>
    </section>
  );
}
