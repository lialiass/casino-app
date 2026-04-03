export interface Player {
  id: string
  name: string
  createdAt: string
  photoUrl?: string
}

export interface GamePlayer {
  playerId: string
  rebuys: number
}

export type GameResultRank = 'winner' | 'second' | 'shared' | 'other'

export interface GameResult {
  playerId: string
  totalEngaged: number
  netResult: number
  rank: GameResultRank
}

export interface Game {
  id: string
  date: string
  buyIn: number
  players: GamePlayer[]
  status: 'in_progress' | 'finished'
  winnerId?: string
  secondId?: string
  pot?: number
  results?: GameResult[]
  sharedWin?: boolean
}

export interface PlayerStats {
  player: Player
  totalGames: number
  wins: number
  seconds: number
  netResult: number
  totalRebuys: number
  totalEngaged: number
}
