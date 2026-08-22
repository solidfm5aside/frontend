export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';
export type CompetitionDivision = 'men' | 'women';
export type TournamentFormat = 'legacy_league' | 'two_group_knockout' | 'single_table_final';

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
  fallbackOrder: readonly [
    Exclude<TournamentStatus, 'ongoing'>,
    Exclude<TournamentStatus, 'ongoing'>,
  ],
) {
  const chooseFrom = (candidates: TournamentSummary[]) => preferredForStatus(candidates, 'ongoing')
    ?? preferredForStatus(candidates, fallbackOrder[0])
    ?? preferredForStatus(candidates, fallbackOrder[1]);
  const mensTournaments = tournaments.filter((tournament) => tournamentDivision(tournament) === 'men');
  return chooseFrom(mensTournaments) ?? chooseFrom(tournaments);
}

export function tournamentLabel(tournament: TournamentSummary) {
  const division = tournamentDivision(tournament) === 'women' ? 'Women' : 'Men';
  return `${tournament.name} — Season ${tournament.season} • ${division} (${tournament.status})`;
}

const PUBLIC_TOURNAMENT_STORAGE_KEY = 'solidfm:public-tournament:v1';

export function resolvePublicTournament(
  tournaments: TournamentSummary[],
  fallbackOrder: readonly [Exclude<TournamentStatus, 'ongoing'>, Exclude<TournamentStatus, 'ongoing'>],
) {
  if (typeof window !== 'undefined') {
    const queryId = new URL(window.location.href).searchParams.get('tournament');
    let storedId: string | null = null;
    try {
      storedId = window.localStorage.getItem(PUBLIC_TOURNAMENT_STORAGE_KEY);
    } catch {
      // Query selection and the deterministic fallback still work without storage.
    }
    const retained = tournaments.find((tournament) => tournament._id === queryId)
      ?? tournaments.find((tournament) => tournament._id === storedId);
    if (retained) return retained;
  }
  return chooseTournament(tournaments, fallbackOrder);
}

export function retainPublicTournament(tournamentId: string) {
  if (typeof window === 'undefined' || !tournamentId) return;
  try {
    window.localStorage.setItem(PUBLIC_TOURNAMENT_STORAGE_KEY, tournamentId);
  } catch {
    // Selection still works for this page when storage is unavailable.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('tournament', tournamentId);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
