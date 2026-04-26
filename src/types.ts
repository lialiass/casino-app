export interface Player {
  id: string
  name: string
  createdAt: string
  photoUrl?: string
  userId?: string
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
  groupId?: string
}

export interface Group {
  id: string
  name: string
  ownerId: string
  photoUrl?: string
  createdAt: string
}

export interface GroupMember {
  groupId: string
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
  profile: ProfileSearchResult
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

export interface Profile {
  id: string
  pseudo: string
  email: string
  createdAt: string
  photoUrl?: string
  // Préférences de notifications
  notifFriends?: boolean
  notifGames?: boolean
  notifResults?: boolean
}

export interface ProfileSearchResult {
  id: string
  pseudo: string
  photoUrl?: string
}

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface FriendshipWithProfile extends Friendship {
  otherProfile: ProfileSearchResult
}

export interface GameInvite {
  id: string
  gameId: string
  groupId?: string
  senderId: string
  receiverId: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface GameInviteWithDetails extends GameInvite {
  senderProfile: ProfileSearchResult
  gameBuyIn?: number
}