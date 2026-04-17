import { Team } from './team';

export interface Player {
  _id: string;
  name: string;
}

export interface PlayerStats {
  playerId: Player;
  teamId: Team;
  goals: number;
  assists: number;
}
