'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import apiClient from '@/lib/api-client';
import KnockoutBracket from '@/components/KnockoutBracket';
import { PageSpinner } from '@/components/ui/Spinner';

interface Tournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  currentStage: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
  formatVersion?: 1 | 2;
  format?: 'legacy_league' | 'two_group_knockout';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TournamentResult {
  requestKey: number;
  tournaments: Tournament[];
  error: string | null;
}

function formatStageName(stage: string) {
  return stage.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function chooseBracketTournament(tournaments: Tournament[]) {
  const newest = (status: Tournament['status']) => tournaments
    .filter((tournament) => tournament.status === status)
    .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime())[0];

  return newest('ongoing') ?? newest('completed') ?? newest('upcoming') ?? tournaments[0];
}

export default function BracketPage() {
  const [selectedId, setSelectedId] = useState('');
  const [requestKey, setRequestKey] = useState(0);
  const [result, setResult] = useState<TournamentResult>({
    requestKey: -1,
    tournaments: [],
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchTournaments = async () => {
      try {
        const response = await apiClient.get('/tournaments', {
          signal: controller.signal,
        }) as unknown as ApiResponse<Tournament[]>;

        if (!response.success) {
          throw new Error(response.message || 'The tournaments could not be loaded.');
        }

        const tournaments = Array.isArray(response.data) ? response.data : [];
        setResult({ requestKey, tournaments, error: null });
        setSelectedId((currentId) => {
          if (tournaments.some((tournament) => tournament._id === currentId)) return currentId;
          return chooseBracketTournament(tournaments)?._id ?? '';
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          tournaments: [],
          error: error instanceof Error ? error.message : 'The tournaments could not be loaded.',
        });
      }
    };

    void fetchTournaments();
    return () => controller.abort();
  }, [requestKey]);

  if (result.requestKey !== requestKey) return <PageSpinner />;

  if (result.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-32">
        <Trophy aria-hidden="true" className="mx-auto mb-6 h-12 w-12 text-neutral-800" />
        <h1 className="mb-3 text-2xl font-black uppercase tracking-tight text-white italic">Bracket unavailable</h1>
        <p className="mb-8 text-sm text-neutral-500">{result.error}</p>
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

  const selectedTournament = result.tournaments.find((tournament) => tournament._id === selectedId);
  const isFixedCompetition = selectedTournament?.formatVersion === 2 &&
    selectedTournament.format === 'two_group_knockout';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 font-outfit animate-reveal sm:px-6 md:py-20">
      <div className="mb-12 flex flex-col justify-between gap-8 border-b border-white/5 pb-10 md:mb-16 md:flex-row md:items-end md:pb-12">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div aria-hidden="true" className="h-1 w-12 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Live Bracket</span>
          </div>
          <h1 className="text-4xl font-black uppercase leading-none tracking-tighter text-white italic sm:text-5xl md:text-7xl">
            Knockout <br /> <span className="text-blue-600">Roadmap.</span>
          </h1>
        </div>

        {result.tournaments.length > 0 && (
          <div className="group relative w-full shrink-0 sm:w-auto">
            <label htmlFor="bracket-tournament" className="sr-only">Choose tournament</label>
            <select
              id="bracket-tournament"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="min-h-14 w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 pr-12 text-xs font-black uppercase tracking-widest text-white transition-all focus:border-blue-500 focus:outline-none sm:min-w-[280px] sm:px-8 sm:py-5 sm:pr-14"
            >
              {result.tournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id} className="bg-black text-white">
                  {tournament.name} (S{tournament.season})
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors group-hover:text-blue-500 sm:right-6" />
          </div>
        )}
      </div>

      {selectedId ? (
        <KnockoutBracket tournamentId={selectedId} />
      ) : (
        <div className="rounded-[32px] border border-white/5 bg-white/[0.01] px-6 py-20 text-center sm:rounded-[40px]">
          <Trophy aria-hidden="true" className="mx-auto mb-6 h-12 w-12 text-neutral-800 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600 italic sm:tracking-[0.4em]">No tournament is available yet.</p>
        </div>
      )}

      <div className="relative mt-14 overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-br from-blue-600/5 to-transparent p-6 sm:mt-20 sm:rounded-[40px] sm:p-8">
        <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="mb-2 text-xl font-black uppercase tracking-tighter text-white italic">Tournament Rules</h2>
            <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wider text-neutral-500">
              {selectedTournament && !isFixedCompetition
                ? 'This legacy edition follows its originally published knockout stages and pairings.'
                : 'The confirmed format has two seven-team groups. The top four in each group qualify for fixed quarter-finals A1–B4, A2–B3, B1–A4, and B2–A3, followed by the semi-finals and final. No third-place match is played.'}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-5 sm:w-auto sm:flex-nowrap sm:gap-6">
            <div className="min-w-0 text-center">
              <div className="truncate text-xl font-black text-white italic sm:text-2xl">{selectedTournament?.season ?? '—'}</div>
              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Season</div>
            </div>
            <div aria-hidden="true" className="h-8 w-px bg-white/5"></div>
            <div className="min-w-0 text-center">
              <div className="max-w-28 truncate text-sm font-black text-white italic sm:text-base" title={selectedTournament?.currentStage ? formatStageName(selectedTournament.currentStage) : undefined}>
                {selectedTournament?.currentStage ? formatStageName(selectedTournament.currentStage) : 'Pending'}
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Current Stage</div>
            </div>
            <div className="ml-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-2xl shadow-blue-600/30 sm:ml-4">
              <Trophy aria-hidden="true" className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-blue-600/5 blur-[100px]"></div>
      </div>
    </div>
  );
}
