import { createClient } from '@supabase/supabase-js'
import type { Profile, ProfileSearchResult, Friendship, FriendshipWithProfile, Group, GroupMember, Game, GamePlayer, GameResult, GameInviteWithDetails } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = !!supabase

// --- Auth ---

export async function authSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase.auth.signInWithPassword({ email, password })
}

export async function authSignUp(email: string, password: string, pseudo: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  // La confirmation email est désactivée dans Supabase Dashboard.
  // Supabase retourne une session immédiate → onAuthStateChange → SIGNED_IN.
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo }, // transmis au trigger handle_new_user via raw_user_meta_data
    },
  })
}

export async function authResetPassword(email: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  // Supabase redirige vers /reset-password?code=xxx (PKCE).
  // Le script dans index.html transforme ce chemin en /?code=xxx#/reset-password
  // avant que React ne charge, pour que HashRouter route correctement
  // et que le SDK lise le code PKCE depuis window.location.search.
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://playpokermanager.fr/reset-password',
  })
}

export async function authUpdatePassword(newPassword: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase.auth.updateUser({ password: newPassword })
}

// --- Profiles ---

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return {
    id: data.id,
    pseudo: data.pseudo,
    email: data.email,
    createdAt: data.created_at,
    photoUrl: data.photo_url ?? undefined,
    notifFriends: data.notif_friends ?? true,
    notifGames:   data.notif_games   ?? true,
    notifResults: data.notif_results ?? true,
  }
}

export async function saveProfile(userId: string, updates: {
  pseudo?: string
  photoUrl?: string
  notifFriends?: boolean
  notifGames?: boolean
  notifResults?: boolean
}) {
  if (!supabase) return
  const row: Record<string, unknown> = {}
  if (updates.pseudo        !== undefined) row.pseudo         = updates.pseudo
  if (updates.photoUrl      !== undefined) row.photo_url      = updates.photoUrl
  if (updates.notifFriends  !== undefined) row.notif_friends  = updates.notifFriends
  if (updates.notifGames    !== undefined) row.notif_games    = updates.notifGames
  if (updates.notifResults  !== undefined) row.notif_results  = updates.notifResults
  return supabase.from('profiles').update(row).eq('id', userId)
}

// --- Suppression de compte (appelle l'Edge Function delete-account) ---

export async function deleteAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase non configuré' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Non authentifié' }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { error?: string }
      return { error: data.error ?? `Erreur serveur (${resp.status})` }
    }
    return { error: null }
  } catch (e) {
    console.error('deleteAccount fetch error:', e)
    return { error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' }
  }
}

// --- Profile photo ---

async function compressImage(file: File, maxSize = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Load failed')) }
    img.src = objectUrl
  })
}

// --- Friends ---

// --- Friend global stats (via SECURITY DEFINER RPC) ---

export interface FriendGlobalStats {
  friendId: string
  totalGames: number
  netResult: number
  wins: number
  seconds: number
  losses: number
  bestWin: number
  worstLoss: number
  winRate: number
}

export async function fetchAllFriendsStats(): Promise<FriendGlobalStats[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_all_friends_stats')
  if (error) {
    console.error('fetchAllFriendsStats error:', error)
    return []
  }
  if (!data) return []
  return (data as {
    friend_id: string
    total_games: number | string
    net_result: number | string
    wins: number | string
    seconds: number | string
    losses: number | string
    best_win: number | string
    worst_loss: number | string
    win_rate: number | string
  }[]).map(r => ({
    friendId: r.friend_id,
    totalGames: Number(r.total_games),
    netResult: Number(r.net_result),
    wins: Number(r.wins),
    seconds: Number(r.seconds),
    losses: Number(r.losses),
    bestWin: Number(r.best_win),
    worstLoss: Number(r.worst_loss),
    winRate: Number(r.win_rate),
  }))
}

export async function searchProfiles(query: string, excludeId: string): Promise<ProfileSearchResult[]> {
  if (!supabase) return []
  // Utilise une fonction SECURITY DEFINER côté Supabase pour contourner la RLS
  // restrictive sur profiles tout en n'exposant que les champs publics (pseudo, photo).
  // La lecture directe de la table est désormais restreinte aux amis / membres communs.
  const { data, error } = await supabase
    .rpc('search_profiles_public', { query_text: query, exclude_id: excludeId })
  if (error || !data) return []
  return (data as { id: string; pseudo: string; photo_url: string | null }[])
    .map(d => ({ id: d.id, pseudo: d.pseudo, photoUrl: d.photo_url ?? undefined }))
}

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (!supabase) return
  return supabase.from('friendships').insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
}

export async function acceptFriendRequest(friendshipId: string) {
  if (!supabase) return
  return supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
}

export async function rejectFriendRequest(friendshipId: string) {
  if (!supabase) return
  return supabase.from('friendships').update({ status: 'rejected' }).eq('id', friendshipId)
}

export async function removeFriendship(friendshipId: string) {
  if (!supabase) return
  return supabase.from('friendships').delete().eq('id', friendshipId)
}

export async function fetchMyFriendships(userId: string): Promise<FriendshipWithProfile[]> {
  if (!supabase) return []

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .neq('status', 'rejected')

  if (error || !rows || rows.length === 0) return []

  const otherIds = [...new Set(rows.map(r => r.requester_id === userId ? r.addressee_id : r.requester_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, pseudo, photo_url')
    .in('id', otherIds)

  const profileMap = new Map<string, ProfileSearchResult>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { id: p.id, pseudo: p.pseudo, photoUrl: p.photo_url ?? undefined })
  }

  return rows.map(r => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id
    return {
      id: r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status: r.status as Friendship['status'],
      createdAt: r.created_at,
      otherProfile: profileMap.get(otherId) ?? { id: otherId, pseudo: '?', photoUrl: undefined },
    }
  })
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string | null> {
  if (!supabase) return null
  try {
    const compressed = await compressImage(file)
    const path = `${userId}/${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('uploadProfilePhoto error:', err)
    return null
  }
}

// --- Groups ---

function dbToGroup(r: Record<string, unknown>): Group {
  return {
    id: r.id as string,
    name: r.name as string,
    ownerId: r.owner_id as string,
    photoUrl: (r.photo_url as string | null) ?? undefined,
    createdAt: r.created_at as string,
  }
}

function dbToGameLocal(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    date: row.date as string,
    buyIn: row.buy_in as number,
    status: row.status as 'in_progress' | 'finished',
    winnerId: (row.winner_id as string | null) ?? undefined,
    secondId: (row.second_id as string | null) ?? undefined,
    pot: (row.pot as number | null) ?? undefined,
    players: (row.players as GamePlayer[]) ?? [],
    results: (row.results as GameResult[] | null) ?? undefined,
    sharedWin: (row.shared_win as boolean | null) ?? undefined,
    groupId: (row.group_id as string | null) ?? undefined,
  }
}

export async function fetchMyGroups(userId: string): Promise<Group[]> {
  if (!supabase) return []
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (!memberRows || memberRows.length === 0) return []
  const groupIds = memberRows.map((r: Record<string, unknown>) => r.group_id as string)
  const { data: groupRows } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false })
  if (!groupRows) return []
  return groupRows.map(r => dbToGroup(r as Record<string, unknown>))
}

export async function fetchGroupById(groupId: string): Promise<Group | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single()
  if (error || !data) return null
  return dbToGroup(data as Record<string, unknown>)
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return []
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
  if (!memberRows || memberRows.length === 0) return []
  const userIds = memberRows.map((r: Record<string, unknown>) => r.user_id as string)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, pseudo, photo_url')
    .in('id', userIds)
  const profileMap = new Map<string, ProfileSearchResult>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { id: p.id, pseudo: p.pseudo, photoUrl: p.photo_url ?? undefined })
  }
  return memberRows.map((r: Record<string, unknown>) => ({
    groupId: r.group_id as string,
    userId: r.user_id as string,
    role: r.role as 'owner' | 'member',
    joinedAt: r.joined_at as string,
    profile: profileMap.get(r.user_id as string) ?? { id: r.user_id as string, pseudo: '?', photoUrl: undefined },
  }))
}

export async function createGroup(
  name: string,
  _ownerId: string,
  memberIds: string[],
): Promise<Group | null> {
  if (!supabase) return null

  // Retrieve the authenticated user directly from Supabase auth
  // to guarantee owner_id === auth.uid() and satisfy RLS WITH CHECK
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('createGroup: no authenticated user', authError)
    throw new Error('Utilisateur non authentifié')
  }

  const groupPayload = {
    name: name.trim(),
    owner_id: user.id,
    photo_url: null as string | null,
  }
  const { data: groupData, error } = await supabase
    .from('groups')
    .insert(groupPayload)
    .select()
    .single()
  if (error || !groupData) { console.error('createGroup groups insert error:', error); return null }

  const group = dbToGroup(groupData as Record<string, unknown>)

  const membersPayload = [
    { group_id: group.id, user_id: user.id, role: 'owner' },
    ...memberIds.filter(id => id !== user.id).map(id => ({ group_id: group.id, user_id: id, role: 'member' })),
  ]
  const { error: memberError } = await supabase.from('group_members').insert(membersPayload)
  if (memberError) console.error('createGroup group_members insert error:', memberError)

  return group
}

export async function updateGroup(groupId: string, updates: { name?: string; photoUrl?: string }): Promise<void> {
  if (!supabase) return
  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.photoUrl !== undefined) row.photo_url = updates.photoUrl
  const { error } = await supabase.from('groups').update(row).eq('id', groupId)
  if (error) console.error('updateGroup error:', error)
}

export async function deleteGroup(groupId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) console.error('deleteGroup error:', error)
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' })
  if (error) console.error('addGroupMember error:', error)
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  if (error) console.error('removeGroupMember error:', error)
}

export async function uploadGroupPhoto(ownerId: string, groupId: string, file: File): Promise<string | null> {
  if (!supabase) return null
  try {
    const compressed = await compressImage(file)
    const path = `${ownerId}/groups/${groupId}/${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('uploadGroupPhoto error:', err)
    return null
  }
}

export async function fetchGroupGames(groupId: string): Promise<Game[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false })
  if (error || !data) return []
  return data.map(r => dbToGameLocal(r as Record<string, unknown>))
}

// --- Game Invites ---

export async function sendGameInvite(
  gameId: string,
  groupId: string | undefined,
  receiverId: string,
): Promise<void> {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('game_invites').insert({
    game_id: gameId,
    group_id: groupId ?? null,
    sender_id: user.id,
    receiver_id: receiverId,
    status: 'pending',
  })
  if (error) {
    console.error('sendGameInvite error:', error)
    throw error  // propagate so callers can handle UI state correctly
  }
}

export async function fetchPendingInvites(userId: string): Promise<GameInviteWithDetails[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('game_invites')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) return []

  const senderIds = [...new Set(data.map((r: Record<string, unknown>) => r.sender_id as string))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, pseudo, photo_url')
    .in('id', senderIds)
  const profileMap = new Map<string, ProfileSearchResult>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { id: p.id, pseudo: p.pseudo, photoUrl: p.photo_url ?? undefined })
  }

  const gameIds = [...new Set(data.map((r: Record<string, unknown>) => r.game_id as string))]
  const { data: games } = await supabase
    .from('games')
    .select('id, buy_in')
    .in('id', gameIds)
  const gameMap = new Map<string, number>()
  for (const g of games ?? []) {
    gameMap.set(g.id as string, g.buy_in as number)
  }

  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    gameId: r.game_id as string,
    groupId: (r.group_id as string | null) ?? undefined,
    senderId: r.sender_id as string,
    receiverId: r.receiver_id as string,
    status: r.status as 'pending' | 'accepted' | 'declined',
    createdAt: r.created_at as string,
    senderProfile: profileMap.get(r.sender_id as string) ?? { id: r.sender_id as string, pseudo: '?', photoUrl: undefined },
    gameBuyIn: gameMap.get(r.game_id as string),
  }))
}

export async function fetchInviteById(inviteId: string): Promise<GameInviteWithDetails | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('game_invites')
    .select('*')
    .eq('id', inviteId)
    .single()
  if (error || !data) return null

  const r = data as Record<string, unknown>

  const [{ data: sp }, { data: gd }] = await Promise.all([
    supabase.from('profiles').select('id, pseudo, photo_url').eq('id', r.sender_id).single(),
    supabase.from('games').select('id, buy_in').eq('id', r.game_id).single(),
  ])

  return {
    id: r.id as string,
    gameId: r.game_id as string,
    groupId: (r.group_id as string | null) ?? undefined,
    senderId: r.sender_id as string,
    receiverId: r.receiver_id as string,
    status: r.status as 'pending' | 'accepted' | 'declined',
    createdAt: r.created_at as string,
    senderProfile: sp
      ? { id: sp.id, pseudo: sp.pseudo, photoUrl: sp.photo_url ?? undefined }
      : { id: r.sender_id as string, pseudo: '?', photoUrl: undefined },
    gameBuyIn: (gd as Record<string, unknown> | null)?.buy_in as number | undefined,
  }
}

export async function acceptGameInvite(inviteId: string, gameId: string, playerId: string): Promise<void> {
  if (!supabase) return
  // join_game RPC already sets status = 'accepted' inside the function
  const { error } = await supabase.rpc('join_game', {
    p_game_id: gameId,
    p_player_id: playerId,
  })
  if (error) {
    console.error('acceptGameInvite join_game error:', error)
    // Fallback: manually mark accepted if RPC failed
    await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', inviteId)
  }
}

export async function declineGameInvite(inviteId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
  if (error) console.error('declineGameInvite error:', error)
}

// Keep legacy alias
export { declineGameInvite as declineInvite }

export async function deleteInvite(inviteId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('game_invites')
    .delete()
    .eq('id', inviteId)
  if (error) console.error('deleteInvite error:', error)
}

export async function callJoinGame(gameId: string, playerId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('join_game', {
    p_game_id: gameId,
    p_player_id: playerId,
  })
  if (error) console.error('callJoinGame error:', error)
}

export function subscribeToInvites(
  userId: string,
  onChanged: () => void,
): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`invites-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'game_invites',
      filter: `receiver_id=eq.${userId}`,
    }, onChanged)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_invites',
      filter: `receiver_id=eq.${userId}`,
    }, onChanged)
    .subscribe()
  return () => { supabase?.removeChannel(channel) }
}
