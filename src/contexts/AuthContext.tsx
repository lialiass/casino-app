import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, fetchProfile, saveProfile, deleteAccount as deleteAccountApi } from '../lib/supabase'
import { initPushListeners, removePushListeners } from '../lib/notifications'
import type { Profile } from '../types'

const RECOVERY_KEY = 'poker_password_recovery'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  /** true uniquement quand la session courante est une session de recovery (reset password).
   *  Bloque toute navigation automatique vers l'app. */
  isRecoverySession: boolean
  signOut: () => Promise<void>
  updateProfile: (updates: {
    pseudo?: string
    photoUrl?: string
    notifFriends?: boolean
    notifGames?: boolean
    notifResults?: boolean
  }) => Promise<void>
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                       = useState<User | null>(null)
  const [session, setSession]                 = useState<Session | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [profile, setProfile]                 = useState<Profile | null>(null)

  // Initialiser depuis sessionStorage pour survivre aux rechargements de page
  const [isRecoverySession, setIsRecovery]    = useState(
    () => sessionStorage.getItem(RECOVERY_KEY) === 'true'
  )

  function setRecovery(value: boolean) {
    setIsRecovery(value)
    if (value) {
      sessionStorage.setItem(RECOVERY_KEY, 'true')
    } else {
      sessionStorage.removeItem(RECOVERY_KEY)
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // true si l'URL contient des tokens de recovery au moment du boot.
    // Empêche INITIAL_SESSION(null) de court-circuiter PASSWORD_RECOVERY.
    // Réinitialisé à false dès qu'un événement résout l'attente (dans un sens ou l'autre).
    let waitingForRecovery = window.location.hash.includes('type=recovery')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
        waitingForRecovery = false
      } else if (event === 'SIGNED_OUT') {
        setRecovery(false)
        waitingForRecovery = false
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (waitingForRecovery) {
        if (event === 'INITIAL_SESSION' && !session && window.location.hash.includes('type=recovery')) {
          // Le SDK n'a pas encore traité les tokens — rester en loading, attendre PASSWORD_RECOVERY.
          return
        }
        // Tout autre événement (token expiré → hash remplacé par #error=..., ou session valide)
        // lève l'attente et laisse setLoading(false) s'exécuter normalement.
        waitingForRecovery = false
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Chargement du profil + init push listeners dès que l'utilisateur change
  useEffect(() => {
    if (!user) {
      setProfile(null)
      removePushListeners()
      return
    }
    fetchProfile(user.id).then(p => { if (p) setProfile(p) })
    // Enregistrer les listeners push en arrière-plan (non bloquant)
    initPushListeners(user.id)
  }, [user])

  const signOut = async () => {
    await supabase?.auth.signOut()
    // isRecovery sera remis à false via l'event SIGNED_OUT ci-dessus
  }

  const updateProfile = async (updates: {
    pseudo?: string
    photoUrl?: string
    notifFriends?: boolean
    notifGames?: boolean
    notifResults?: boolean
  }) => {
    if (!user) return
    await saveProfile(user.id, updates)
    setProfile(prev => (prev ? { ...prev, ...updates } : prev))
  }

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    return deleteAccountApi()
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, profile, isRecoverySession, signOut, updateProfile, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
