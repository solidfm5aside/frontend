import { Team } from './team';

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface MatchEvent {
  _id: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
  minute: number;
  playerId: { _id: string; name: string };
  assistPlayerId?: { _id: string; name: string };
  teamId: string;
}

export interface Match {
  _id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  stage: string;
  date: string;
  venue?: string;
  isExtraTime?: boolean;
  winner?: string | { _id: string; name: string };
  shootoutScore?: { home: number; away: number };
  events: MatchEvent[];
}
