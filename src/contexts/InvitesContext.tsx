import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  fetchPendingInvites,
  acceptGameInvite,
  declineGameInvite,
  subscribeToInvites,
  fetchMyFriendships,
} from '../lib/supabase'
import type { GameInviteWithDetails } from '../types'

interface InvitesContextType {
  invites: GameInviteWithDetails[]
  /** Total : invitations parties + demandes d'amis reçues */
  pendingCount: number
  /** Demandes d'amis reçues uniquement (pour le badge de l'onglet Amis) */
  pendingFriendCount: number
  loading: boolean
  refresh: () => Promise<void>
  refreshFriendCount: () => Promise<void>
  accept: (invite: GameInviteWithDetails, playerId: string) => Promise<void>
  decline: (inviteId: string) => Promise<void>
}

const InvitesContext = createContext<InvitesContextType | null>(null)

export function InvitesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [invites, setInvites] = useState<GameInviteWithDetails[]>([])
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const userIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid) return
    setLoading(true)
    try {
      const data = await fetchPendingInvites(uid)
      setInvites(data)
    } catch (err) {
      console.error('InvitesContext refresh error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshFriendCount = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid) return
    try {
      const friendships = await fetchMyFriendships(uid)
      const count = friendships.filter(
        f => f.status === 'pending' && f.addresseeId === uid
      ).length
      setPendingFriendCount(count)
    } catch (err) {
      console.error('InvitesContext refreshFriendCount error:', err)
    }
  }, [])

  useEffect(() => {
    userIdRef.current = user?.id ?? null

    if (!user) {
      setInvites([])
      setPendingFriendCount(0)
      return
    }

    // Chargement initial des deux types d'invitations
    refresh()
    refreshFriendCount()

    // Realtime pour les invitations de parties
    const unsubscribe = subscribeToInvites(user.id, () => {
      refresh()
    })

    return unsubscribe
  }, [user, refresh, refreshFriendCount])

  const accept = useCallback(async (invite: GameInviteWithDetails, playerId: string) => {
    await acceptGameInvite(invite.id, invite.gameId, playerId)
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }, [])

  const decline = useCallback(async (inviteId: string) => {
    await declineGameInvite(inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }, [])

  return (
    <InvitesContext.Provider
      value={{
        invites,
        pendingCount: invites.length + pendingFriendCount,
        pendingFriendCount,
        loading,
        refresh,
        refreshFriendCount,
        accept,
        decline,
      }}
    >
      {children}
    </InvitesContext.Provider>
  )
}

export function useInvites(): InvitesContextType {
  const ctx = useContext(InvitesContext)
  if (!ctx) throw new Error('useInvites must be used within InvitesProvider')
  return ctx
}
