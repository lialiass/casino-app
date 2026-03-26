export interface Player {
  id: string;
  name: string;
  createdAt: string;
  photoUrl?: string;
}

export interface GamePlayer {
  playerId: string;
  rebuys: number;
}

export interface GameResult {
  playerId: string;
  totalEngaged: number;
  netResult: number;
  rank: 'winner' | 'second' | 'other';
}

export interface Game {
  id: string;
  date: string;
  buyIn: number;
  players: GamePlayer[];
  status: 'in_progress' | 'finished';
  winnerId?: string;
  secondId?: string;
  results?: GameResult[];
  pot?: number;
}

export interface PlayerStats {
  player: Player;
  totalGames: number;
  wins: number;
  seconds: number;
  netResult: number;
  totalRebuys: number;
  totalEngaged: number;
}
