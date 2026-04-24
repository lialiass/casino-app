import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  fetchPendingInvites,
  acceptGameInvite,
  declineGameInvite,
  subscribeToInvites,
} from '../lib/supabase'
import type { GameInviteWithDetails } from '../types'

interface InvitesContextType {
  invites: GameInviteWithDetails[]
  pendingCount: number
  loading: boolean
  refresh: () => Promise<void>
  accept: (invite: GameInviteWithDetails, playerId: string) => Promise<void>
  decline: (inviteId: string) => Promise<void>
}

const InvitesContext = createContext<InvitesContextType | null>(null)

export function InvitesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [invites, setInvites] = useState<GameInviteWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  // Prevent stale closure in subscribeToInvites callback
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

  useEffect(() => {
    userIdRef.current = user?.id ?? null

    if (!user) {
      setInvites([])
      return
    }

    // Initial load
    refresh()

    // Realtime subscription
    const unsubscribe = subscribeToInvites(user.id, () => {
      refresh()
    })

    return unsubscribe
  }, [user, refresh])

  const accept = useCallback(async (invite: GameInviteWithDetails, playerId: string) => {
    await acceptGameInvite(invite.id, invite.gameId, playerId)
    // Optimistically remove from pending list
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
        pendingCount: invites.length,
        loading,
        refresh,
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
