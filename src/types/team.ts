export interface Team {
  _id: string;
  name: string;
  logo?: string;
}

export interface TeamStanding {
  teamId: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}
