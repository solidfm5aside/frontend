export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

export interface TournamentSummary {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  status: TournamentStatus;
  formatVersion?: 1 | 2;
  format?: 'legacy_league' | 'two_group_knockout';
}

function startTime(tournament: TournamentSummary) {
  const value = new Date(tournament.startDate).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function preferredForStatus(tournaments: TournamentSummary[], status: TournamentStatus) {
  const candidates = tournaments.filter((tournament) => tournament.status === status);
  if (status === 'upcoming') {
    return candidates.sort((left, right) => startTime(left) - startTime(right))[0] ?? null;
  }
  return candidates.sort((left, right) => startTime(right) - startTime(left))[0] ?? null;
}

export function chooseTournament(
  tournaments: TournamentSummary[],
  fallbackOrder: readonly [
    Exclude<TournamentStatus, 'ongoing'>,
    Exclude<TournamentStatus, 'ongoing'>,
  ],
) {
  return preferredForStatus(tournaments, 'ongoing')
    ?? preferredForStatus(tournaments, fallbackOrder[0])
    ?? preferredForStatus(tournaments, fallbackOrder[1]);
}

export function tournamentLabel(tournament: TournamentSummary) {
  return `${tournament.name} — Season ${tournament.season} (${tournament.status})`;
}
