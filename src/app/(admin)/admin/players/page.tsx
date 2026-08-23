'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pencil, RefreshCw, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { PageSpinner } from '@/components/ui/Spinner';

interface Player {
  _id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  nationality: string;
  teamId: {
    _id: string;
    name: string;
    division?: 'men' | 'women';
  } | null;
}

interface PlayerPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface PlayersResponse {
  success: boolean;
  data: Player[];
  pagination: PlayerPagination;
  message?: string;
}

const DIRECTORY_PAGE_SIZE = 100;
const POSITION_FILTERS = ['all', 'GK', 'DF', 'MF', 'FW'] as const;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function loadCompletePlayerDirectory() {
  const firstPage = await apiClient.get<PlayersResponse, PlayersResponse>(
    `/players/admin?page=1&limit=${DIRECTORY_PAGE_SIZE}`,
  );
  if (!firstPage.success) throw new Error(firstPage.message || 'Player directory could not be loaded');

  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.pagination.pages - 1) },
    (_, index) => index + 2,
  );
  const remainingResponses = await Promise.all(
    remainingPages.map((page) => apiClient.get<PlayersResponse, PlayersResponse>(
      `/players/admin?page=${page}&limit=${DIRECTORY_PAGE_SIZE}`,
    )),
  );
  const responses = [firstPage, ...remainingResponses];
  if (responses.some((response) => !response.success)) {
    throw new Error('One or more player-directory pages could not be loaded');
  }

  const reportedTotals = new Set(responses.map((response) => response.pagination.total));
  const playersById = new Map(
    responses.flatMap((response) => response.data).map((player) => [player._id, player]),
  );
  const expectedTotal = firstPage.pagination.total;
  if (reportedTotals.size !== 1 || playersById.size !== expectedTotal) {
    throw new Error('The player directory changed while loading. Refresh to load a complete list.');
  }

  return {
    players: [...playersById.values()].sort((left, right) => left.name.localeCompare(right.name)),
    total: expectedTotal,
  };
}

export default function PlayersDirectoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const requestSequence = useRef(0);

  const fetchPlayers = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);

    try {
      const result = await loadCompletePlayerDirectory();
      if (requestId !== requestSequence.current) return;
      setPlayers(result.players);
      setDirectoryTotal(result.total);
    } catch (error: unknown) {
      if (requestId !== requestSequence.current) return;
      const message = getErrorMessage(error, 'Failed to fetch player directory');
      setLoadError(message);
      if (silent) toast.error(message);
    } finally {
      if (requestId !== requestSequence.current) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlayers();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchPlayers]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return players.filter((player) => {
      const matchesSearch = !normalizedSearch ||
        player.name.toLocaleLowerCase().includes(normalizedSearch) ||
        player.teamId?.name.toLocaleLowerCase().includes(normalizedSearch);
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    });
  }, [players, positionFilter, searchTerm]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-8 animate-reveal md:space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white sm:text-4xl">Players.</h1>
          <p className="mt-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-500">Global Talent Directory</p>
          <p aria-live="polite" className="mt-3 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
            {directoryTotal === players.length
              ? `All ${directoryTotal} registered ${directoryTotal === 1 ? 'player' : 'players'} loaded`
              : `${players.length} of ${directoryTotal} players loaded`}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="group relative">
            <label htmlFor="player-directory-search" className="sr-only">Search players or teams</label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-blue-500" />
            <input id="player-directory-search" type="search" placeholder="Search players or teams..." className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-6 text-base text-white outline-none transition-all focus:border-blue-500/50 sm:w-64 [@media(pointer:fine)]:text-sm" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>

          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 scrollbar-hide" aria-label="Filter players by position">
            {POSITION_FILTERS.map((filter) => (
              <button key={filter} type="button" aria-pressed={positionFilter === filter} onClick={() => setPositionFilter(filter)} className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-4 text-[10px] font-black uppercase tracking-widest transition-all ${positionFilter === filter ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-white'}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col gap-4 rounded-[28px] border border-red-500/20 bg-red-500/5 p-6 text-center sm:items-center">
          <p className="text-sm font-bold text-red-300">{loadError}</p>
          <button type="button" onClick={() => void fetchPlayers()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" /> Load complete directory</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-3xl">
          <div className="flex flex-col gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-neutral-600 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <span>{filteredPlayers.length} {filteredPlayers.length === 1 ? 'player' : 'players'} match the current view</span>
            <button type="button" onClick={() => void fetchPlayers(true)} disabled={isRefreshing} className="inline-flex min-h-11 w-fit items-center gap-2 text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh all pages</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th scope="col" className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Player Details</th>
                  <th scope="col" className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Current Club</th>
                  <th scope="col" className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Pos</th>
                  <th scope="col" className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPlayers.map((player) => (
                  <tr key={player._id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-5 md:px-6 md:py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-neutral-900 text-xl font-black text-neutral-700 transition-all group-hover:border-blue-500/30 group-hover:text-blue-500">{player.jerseyNumber}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold uppercase tracking-tight text-white transition-colors group-hover:text-blue-500">{player.name}</p>
                          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-neutral-600">{player.nationality}</p>
                          {player.teamId ? (
                            <Link href={`/admin/teams/${player.teamId._id}/squad`} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-[9px] font-black uppercase tracking-widest text-blue-400 md:hidden">
                              <Pencil className="h-3.5 w-3.5" /> Edit in squad
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 md:px-6 md:py-6">
                      {player.teamId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/admin/teams/${player.teamId._id}/squad`} className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-neutral-300 transition-colors hover:text-blue-400"><span>{player.teamId.name}</span><ExternalLink className="h-3.5 w-3.5" /></Link>
                          <span className="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-neutral-500">{player.teamId.division === 'women' ? 'Women' : 'Men'}</span>
                        </div>
                      ) : <span className="text-sm font-bold uppercase text-neutral-600">Unassigned</span>}
                    </td>
                    <td className="px-4 py-5 text-center text-[10px] font-black md:px-6 md:py-6"><span className="rounded-lg bg-white/5 px-2 py-1 text-neutral-500 transition-colors group-hover:text-white">{player.position}</span></td>
                    <td className="px-4 py-5 text-right md:px-6 md:py-6">
                      {player.teamId ? <Link href={`/admin/teams/${player.teamId._id}/squad`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 text-[9px] font-black uppercase tracking-widest text-blue-400 transition-colors hover:bg-blue-600 hover:text-white"><Pencil className="h-3.5 w-3.5" /> Manage squad</Link> : <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">No squad</span>}
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-32 text-center"><Users className="mx-auto mb-6 h-12 w-12 text-neutral-800" /><p className="text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-600">No players match this search or position</p></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
