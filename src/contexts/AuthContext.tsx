import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, fetchProfile, saveProfile } from '../lib/supabase'
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
  updateProfile: (updates: { pseudo?: string; photoUrl?: string }) => Promise<void>
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

    // ── Listener principal ────────────────────────────────────────────────────
    // Source de vérité pour tous les événements auth (INITIAL_SESSION, SIGNED_IN,
    // PASSWORD_RECOVERY, SIGNED_OUT, ...). setLoading(false) à chaque event reçu.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        setRecovery(false)
      }
      // SIGNED_IN déclenché par setSession ci-dessous ne remet PAS isRecovery à false.

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // ── Double hash (HashRouter + Supabase implicit flow) ─────────────────────
    // index.html convertit /reset-password#access_token=xxx en :
    //   /#/reset-password#access_token=xxx&refresh_token=yyy&type=recovery
    // Le SDK Supabase ne parse pas le 2ème hash — on le fait manuellement.
    const fullHash = window.location.hash          // "#/reset-password#access_token=..."
    const secondHashIdx = fullHash.indexOf('#', 1) // position du 2ème '#'

    if (secondHashIdx !== -1) {
      const tokenFragment = fullHash.slice(secondHashIdx + 1) // "access_token=xxx&..."
      const params = new URLSearchParams(tokenFragment)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type         = params.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        // 1. Nettoyer l'URL — supprimer les tokens exposés dans la barre d'adresse
        window.history.replaceState(null, '', '/#/reset-password')
        // 2. Marquer comme session recovery AVANT que setLoading(false) soit appelé
        setRecovery(true)
        // 3. Restaurer la session Supabase à partir des tokens
        //    → déclenche SIGNED_IN dans le listener ci-dessus → setLoading(false)
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              // Token expiré ou invalide — INITIAL_SESSION aura déjà appelé setLoading(false)
              console.warn('[Auth] setSession failed:', error.message)
              setRecovery(false)
            }
          })
      }
    }

    return () => subscription.unsubscribe()
  }, [])

  // Chargement du profil dès que l'utilisateur change
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    fetchProfile(user.id).then(p => { if (p) setProfile(p) })
  }, [user])

  const signOut = async () => {
    await supabase?.auth.signOut()
    // isRecovery sera remis à false via l'event SIGNED_OUT ci-dessus
  }

  const updateProfile = async (updates: { pseudo?: string; photoUrl?: string }) => {
    if (!user) return
    await saveProfile(user.id, updates)
    setProfile(prev => (prev ? { ...prev, ...updates } : prev))
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, profile, isRecoverySession, signOut, updateProfile,
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
