export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';
export type CompetitionDivision = 'men' | 'women';
export type TournamentFormat = 'legacy_league' | 'two_group_knockout' | 'single_table_final';
type TournamentFallbackOrder = readonly [
  Exclude<TournamentStatus, 'ongoing'>,
  Exclude<TournamentStatus, 'ongoing'>,
];

export interface TournamentSummary {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: TournamentStatus;
  formatVersion?: 1 | 2 | 3;
  format?: TournamentFormat;
  division?: CompetitionDivision;
}

function startTime(tournament: TournamentSummary) {
  const value = new Date(tournament.startDate).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function preferredForStatus(tournaments: TournamentSummary[], status: TournamentStatus) {
  const candidates = tournaments.filter((tournament) => tournament.status === status);
  const byDivisionThenStart = (left: TournamentSummary, right: TournamentSummary) => {
    const leftDivision = tournamentDivision(left);
    const rightDivision = tournamentDivision(right);
    if (leftDivision !== rightDivision) return leftDivision === 'men' ? -1 : 1;
    return status === 'upcoming'
      ? startTime(left) - startTime(right)
      : startTime(right) - startTime(left);
  };
  const sorted = [...candidates].sort(byDivisionThenStart);
  if (status === 'upcoming') {
    return sorted[0] ?? null;
  }
  return sorted[0] ?? null;
}

export function tournamentDivision(tournament: Pick<TournamentSummary, 'division'>): CompetitionDivision {
  return tournament.division === 'women' ? 'women' : 'men';
}

export function isMensGroupTournament(tournament: TournamentSummary | null | undefined) {
  return tournament?.formatVersion === 2 && tournament.format === 'two_group_knockout';
}

export function isWomensTableTournament(tournament: TournamentSummary | null | undefined) {
  return tournament?.formatVersion === 3 &&
    tournament.format === 'single_table_final' &&
    tournament.division === 'women';
}

export function chooseTournament(
  tournaments: TournamentSummary[],
  fallbackOrder: TournamentFallbackOrder,
) {
  const chooseFrom = (candidates: TournamentSummary[]) => preferredForStatus(candidates, 'ongoing')
    ?? preferredForStatus(candidates, fallbackOrder[0])
    ?? preferredForStatus(candidates, fallbackOrder[1]);
  const mensTournaments = tournaments.filter((tournament) => tournamentDivision(tournament) === 'men');
  return chooseFrom(mensTournaments) ?? chooseFrom(tournaments);
}

export function orderPublicTournaments<Tournament extends TournamentSummary>(
  tournaments: Tournament[],
  fallbackOrder: TournamentFallbackOrder,
) {
  const statusOrder: Record<TournamentStatus, number> = {
    ongoing: 0,
    [fallbackOrder[0]]: 1,
    [fallbackOrder[1]]: 2,
  } as Record<TournamentStatus, number>;

  return [...tournaments].sort((left, right) => {
    const divisionDifference = (tournamentDivision(left) === 'men' ? 0 : 1) -
      (tournamentDivision(right) === 'men' ? 0 : 1);
    if (divisionDifference !== 0) return divisionDifference;

    const statusDifference = statusOrder[left.status] - statusOrder[right.status];
    if (statusDifference !== 0) return statusDifference;

    const dateDifference = left.status === 'upcoming'
      ? startTime(left) - startTime(right)
      : startTime(right) - startTime(left);
    if (dateDifference !== 0) return dateDifference;

    const nameDifference = left.name.localeCompare(right.name);
    return nameDifference !== 0 ? nameDifference : left._id.localeCompare(right._id);
  });
}

export function tournamentLabel(tournament: TournamentSummary) {
  const division = tournamentDivision(tournament) === 'women' ? 'Women' : 'Men';
  return `${tournament.name} — Season ${tournament.season} • ${division} (${tournament.status})`;
}

const PUBLIC_TOURNAMENT_STORAGE_KEY = 'solidfm:public-tournament:v2';

interface RetainedPublicTournament {
  schemaVersion: 2;
  tournamentId: string;
  selectedBy: 'user';
}

function readRetainedPublicTournament(): string | null {
  try {
    const storedValue = window.localStorage.getItem(PUBLIC_TOURNAMENT_STORAGE_KEY);
    if (!storedValue) return null;
    const parsed: unknown = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== 'object') return null;
    const retained = parsed as Partial<RetainedPublicTournament>;
    return retained.schemaVersion === 2 &&
      retained.selectedBy === 'user' &&
      typeof retained.tournamentId === 'string' &&
      retained.tournamentId
      ? retained.tournamentId
      : null;
  } catch {
    return null;
  }
}

function storeRetainedPublicTournament(tournamentId: string) {
  try {
    const retained: RetainedPublicTournament = {
      schemaVersion: 2,
      tournamentId,
      selectedBy: 'user',
    };
    window.localStorage.setItem(PUBLIC_TOURNAMENT_STORAGE_KEY, JSON.stringify(retained));
  } catch {
    // The URL choice and deterministic men's default still work without storage.
  }
}

export function resolvePublicTournament(
  tournaments: TournamentSummary[],
  fallbackOrder: TournamentFallbackOrder,
) {
  if (typeof window !== 'undefined') {
    const queryId = new URL(window.location.href).searchParams.get('tournament');
    const querySelection = tournaments.find((tournament) => tournament._id === queryId);
    if (querySelection) {
      storeRetainedPublicTournament(querySelection._id);
      return querySelection;
    }

    const storedId = readRetainedPublicTournament();
    const storedSelection = tournaments.find((tournament) => tournament._id === storedId);
    if (storedSelection) return storedSelection;
  }
  return chooseTournament(tournaments, fallbackOrder);
}

export function retainPublicTournament(tournamentId: string) {
  if (typeof window === 'undefined' || !tournamentId) return;
  storeRetainedPublicTournament(tournamentId);
  const url = new URL(window.location.href);
  url.searchParams.set('tournament', tournamentId);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
