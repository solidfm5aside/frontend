'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { Clock, Trophy, Zap } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatTime } from '@/utils/format';

interface BracketTeam {
  _id: string;
  name: string;
}

interface BracketMatch {
  _id: string;
  homeTeam?: BracketTeam | null;
  awayTeam?: BracketTeam | null;
  homeScore: number;
  awayScore: number;
  status: string;
  date: string | null;
  venue?: string | null;
  scheduleStatus?: 'confirmed' | 'pending';
  winner?: string | BracketTeam | null;
  isExtraTime?: boolean;
  shootoutScore?: { home: number; away: number };
}

interface BracketData {
  [stage: string]: BracketMatch[];
}

interface ManagedBracketSource {
  type: 'draw_pairing' | 'winner' | 'loser' | 'qualification_rank' | string;
  sourceNodeKey?: string;
  drawPairingSlot?: number;
  drawSide?: 'home' | 'away';
  rank?: number;
}

interface ManagedBracketNode {
  key: string;
  stage: string;
  homeSource?: ManagedBracketSource;
  awaySource?: ManagedBracketSource;
  homeTeam?: BracketTeam | null;
  awayTeam?: BracketTeam | null;
  winnerTeam?: BracketTeam | null;
  match?: BracketMatch | null;
}

interface ManagedBracketState {
  bracketVersion: number;
  stages: Record<string, ManagedBracketNode[]>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface KnockoutBracketProps {
  tournamentId: string;
  filterStage?: string;
  finalOnly?: boolean;
}

interface BracketResult {
  tournamentId: string;
  requestKey: number;
  bracket: BracketData | null;
  error: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  playoff: 'Playoffs',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_finals: 'Quarter Finals',
  semi_finals: 'Semi Finals',
  third_place: 'Third Place',
  final: 'Grand Final',
};

const STAGE_ORDER = [
  'playoff',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'third_place',
  'final',
];

function getStageLabel(stage: string) {
  return STAGE_LABELS[stage] ?? stage.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function sourcePlaceholder(source?: ManagedBracketSource): BracketTeam {
  if (source?.sourceNodeKey) {
    const [stage, rawSlot] = source.sourceNodeKey.split(':');
    const result = source.type === 'loser' ? 'Loser' : 'Winner';
    return {
      _id: `placeholder:${source.type}:${source.sourceNodeKey}`,
      name: `${result} of ${getStageLabel(stage)} ${rawSlot || ''}`.trim(),
    };
  }

  if (source?.type === 'qualification_rank' && source.rank) {
    return {
      _id: `placeholder:qualification:${source.rank}`,
      name: `League rank ${source.rank}`,
    };
  }

  if (!source) {
    return { _id: 'placeholder:tbc', name: 'To be confirmed' };
  }

  const drawSide = source.drawSide ? ` ${source.drawSide}` : '';
  return {
    _id: `placeholder:draw:${source.drawPairingSlot ?? 0}:${source.drawSide ?? ''}`,
    name: `Official quarter-final pairing ${source.drawPairingSlot ?? ''}${drawSide}`.trim(),
  };
}

function normalizeBracketData(value: BracketData | ManagedBracketState): BracketData {
  if (!('stages' in value) || !value.stages || typeof value.stages !== 'object') {
    return value as BracketData;
  }

  return Object.fromEntries(
    Object.entries(value.stages).filter(([, nodes]) => Array.isArray(nodes)).map(([stage, nodes]) => [
      stage,
      nodes.map((node: ManagedBracketNode) => {
        if (node.match) {
          return {
            ...node.match,
            _id: node.match._id || node.key,
            homeTeam: node.homeTeam ?? node.match.homeTeam ?? sourcePlaceholder(node.homeSource),
            awayTeam: node.awayTeam ?? node.match.awayTeam ?? sourcePlaceholder(node.awaySource),
            winner: node.winnerTeam ?? node.match.winner ?? null,
          };
        }

        return {
          _id: node.key,
          homeTeam: node.homeTeam ?? sourcePlaceholder(node.homeSource),
          awayTeam: node.awayTeam ?? sourcePlaceholder(node.awaySource),
          homeScore: 0,
          awayScore: 0,
          status: 'pending',
          date: null,
          venue: null,
          scheduleStatus: 'pending',
          winner: node.winnerTeam ?? null,
        } satisfies BracketMatch;
      }),
    ]),
  );
}

function getAvailableStages(bracket: BracketData) {
  const knownStages = STAGE_ORDER.filter((stage) => bracket[stage]?.length > 0);
  const extraStages = Object.keys(bracket).filter(
    (stage) => !STAGE_ORDER.includes(stage) && bracket[stage]?.length > 0
  );
  return [...knownStages, ...extraStages];
}

function getInitialStage(bracket: BracketData) {
  const stages = getAvailableStages(bracket);
  const latestMaterializedStage = [...stages].reverse().find((stage) =>
    bracket[stage].some((match) => match.status !== 'pending' || Boolean(match.date)),
  );
  return latestMaterializedStage ?? stages[0] ?? '';
}

function handleTabListKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  stages: readonly string[],
  currentStage: string,
  activateStage: (stage: string) => void,
) {
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex < 0 || stages.length === 0) return;

  let nextIndex: number;
  switch (event.key) {
    case 'ArrowLeft':
      nextIndex = (currentIndex - 1 + stages.length) % stages.length;
      break;
    case 'ArrowRight':
      nextIndex = (currentIndex + 1) % stages.length;
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = stages.length - 1;
      break;
    default:
      return;
  }

  const nextStage = stages[nextIndex];
  if (nextStage === undefined) return;

  event.preventDefault();
  activateStage(nextStage);
  event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(nextIndex)
    .focus();
}

function getWinnerId(winner: BracketMatch['winner']) {
  if (!winner) return null;
  return typeof winner === 'string' ? winner : winner._id;
}

function formatMatchSchedule(date: string | null) {
  if (!date) return 'Schedule TBC';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Schedule TBC';
  const matchDate = parsedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
  return `${matchDate} • ${formatTime(date)}`;
}

function MatchCard({ match }: { match: BracketMatch }) {
  const isCompleted = match.status === 'completed';
  const winnerId = getWinnerId(match.winner);
  const hasWinner = Boolean(winnerId);
  const homeWinner = isCompleted && winnerId === match.homeTeam?._id;
  const awayWinner = isCompleted && winnerId === match.awayTeam?._id;
  const homeName = match.homeTeam?.name || 'To be confirmed';
  const awayName = match.awayTeam?.name || 'To be confirmed';

  return (
    <article className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-3xl transition-all duration-500 hover:border-blue-500/20 hover:bg-white/[0.04]">
      <div className="mb-4 flex min-h-5 items-center justify-between gap-3 text-[7px] font-black uppercase tracking-[0.2em] text-neutral-600">
        <span className="truncate" title={match.venue || 'Venue TBC'}>{match.venue || 'Venue TBC'}</span>
        {match.status === 'live' ? (
          <span className="text-red-400" role="status">● Live</span>
        ) : match.status === 'completed' ? (
          'Final Result'
        ) : (
          formatMatchSchedule(match.date)
        )}
      </div>

      <div className="space-y-3">
        <div className={`flex min-w-0 items-center justify-between gap-3 transition-all duration-500 ${homeWinner ? 'scale-[1.02]' : isCompleted && hasWinner ? 'opacity-50' : ''}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-black text-[10px] font-black italic ${homeWinner ? 'border-blue-500/30 text-blue-500' : 'border-white/10 text-neutral-500'}`}>
              {homeName.charAt(0)}
            </div>
            <span className={`truncate text-xs font-black uppercase tracking-tighter ${homeWinner ? 'text-white' : 'text-neutral-400'}`} title={homeName}>{homeName}</span>
          </div>
          <span className={`shrink-0 text-xl font-black tracking-tighter italic ${homeWinner ? 'text-blue-500' : 'text-white'}`}>
            {isCompleted || match.status === 'live' ? match.homeScore : '-'}
          </span>
        </div>

        <div className="h-px w-full bg-white/5"></div>

        <div className={`flex min-w-0 items-center justify-between gap-3 transition-all duration-500 ${awayWinner ? 'scale-[1.02]' : isCompleted && hasWinner ? 'opacity-50' : ''}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-black text-[10px] font-black italic ${awayWinner ? 'border-blue-500/30 text-blue-500' : 'border-white/10 text-neutral-500'}`}>
              {awayName.charAt(0)}
            </div>
            <span className={`truncate text-xs font-black uppercase tracking-tighter ${awayWinner ? 'text-white' : 'text-neutral-400'}`} title={awayName}>{awayName}</span>
          </div>
          <span className={`shrink-0 text-xl font-black tracking-tighter italic ${awayWinner ? 'text-blue-500' : 'text-white'}`}>
            {isCompleted || match.status === 'live' ? match.awayScore : '-'}
          </span>
        </div>
      </div>

      {isCompleted && (match.isExtraTime || match.shootoutScore) && (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-[8px] font-black uppercase tracking-widest">
          {match.isExtraTime && (
            <div className="flex items-center gap-1.5 text-amber-500">
              <Clock aria-hidden="true" className="h-3 w-3" /> After extra time
            </div>
          )}
          {match.shootoutScore && (
            <div className="flex items-center gap-1.5 text-blue-500">
              <Zap aria-hidden="true" className="h-3 w-3" /> Pens: {match.shootoutScore.home}-{match.shootoutScore.away}
            </div>
          )}
        </div>
      )}

      {isCompleted && hasWinner && (
        <div aria-hidden="true" className="absolute -bottom-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/20 animate-in zoom-in duration-500">
          <Trophy className="h-3 w-3 text-white" />
        </div>
      )}
    </article>
  );
}

export default function KnockoutBracket({ tournamentId, filterStage, finalOnly = false }: KnockoutBracketProps) {
  const [result, setResult] = useState<BracketResult>({
    tournamentId: '',
    requestKey: -1,
    bracket: null,
    error: null,
  });
  const [requestKey, setRequestKey] = useState(0);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchBracket = async () => {
      try {
        const response = await apiClient.get<
          ApiResponse<BracketData | ManagedBracketState>,
          ApiResponse<BracketData | ManagedBracketState>
        >(`/tournaments/${tournamentId}/bracket`, { signal: controller.signal });

        if (!response.success) {
          throw new Error(response.message || 'The bracket could not be loaded.');
        }

        const bracket = response.data && typeof response.data === 'object'
          ? normalizeBracketData(response.data)
          : {};
        setResult({ tournamentId, requestKey, bracket, error: null });
        setActiveTab(getInitialStage(bracket));
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          tournamentId,
          requestKey,
          bracket: null,
          error: error instanceof Error ? error.message : 'The bracket could not be loaded.',
        });
      }
    };

    void fetchBracket();
    return () => controller.abort();
  }, [requestKey, tournamentId]);

  const isLoading = result.tournamentId !== tournamentId || result.requestKey !== requestKey;
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-[10px] font-black uppercase tracking-widest text-neutral-500" role="status" aria-live="polite">
        <span className="animate-pulse motion-reduce:animate-none">Loading bracket...</span>
      </div>
    );
  }

  if (result.error || !result.bracket) {
    return (
      <div className="rounded-[32px] border border-white/5 bg-white/[0.01] px-6 py-16 text-center sm:rounded-[40px]">
        <p className="mb-6 text-xs font-bold text-neutral-500">{result.error || 'The bracket is not available.'}</p>
        <button
          type="button"
          onClick={() => setRequestKey((key) => key + 1)}
          className="min-h-11 rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  const stages = getAvailableStages(result.bracket);
  const displayStage = filterStage || activeTab || stages[0] || '';
  const stageMatches = result.bracket[displayStage] || [];

  return (
    <div className="font-outfit">
      {!filterStage && stages.length > 0 && (
        <div className="mb-8 flex gap-2 overflow-x-auto px-1 pb-4 scrollbar-hide" role="tablist" aria-label={finalOnly ? 'Championship stage' : 'Knockout stages'}>
          {stages.map((stage) => {
            const isActive = displayStage === stage;
            return (
              <button
                key={stage}
                id={`bracket-tab-${stage}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="bracket-stage-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(stage)}
                onKeyDown={(event) => handleTabListKeyDown(event, stages, stage, setActiveTab)}
                className={`min-h-11 shrink-0 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all sm:px-6 ${
                  isActive
                    ? 'border-blue-400 bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                    : 'border-white/5 bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-white'
                }`}
              >
                {getStageLabel(stage)}
              </button>
            );
          })}
        </div>
      )}

      {stageMatches.length > 0 ? (
        <div
          id="bracket-stage-panel"
          role={filterStage ? undefined : 'tabpanel'}
          aria-labelledby={!filterStage && displayStage ? `bracket-tab-${displayStage}` : undefined}
          className="grid grid-cols-1 gap-6 animate-reveal md:grid-cols-2 xl:grid-cols-4"
        >
          {stageMatches.map((match) => <MatchCard key={match._id} match={match} />)}
        </div>
      ) : (
        <div className="rounded-[32px] border border-white/5 bg-white/[0.01] px-6 py-20 text-center sm:rounded-[40px] sm:py-24">
          <Trophy aria-hidden="true" className="mx-auto mb-6 h-12 w-12 text-neutral-800 opacity-20" />
          <p className="text-[10px] font-black uppercase leading-loose tracking-[0.25em] text-neutral-600 italic sm:tracking-[0.4em]">
            {filterStage
              ? `No official ${getStageLabel(filterStage)} fixtures have been recorded yet.`
              : finalOnly
                ? 'The official final fixture has not been recorded yet.'
                : 'Official knockout fixtures have not been recorded yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
