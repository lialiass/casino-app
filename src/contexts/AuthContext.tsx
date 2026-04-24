import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, fetchProfile, saveProfile } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  signOut: () => Promise<void>
  updateProfile: (updates: { pseudo?: string; photoUrl?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load profile whenever user changes
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    fetchProfile(user.id).then(p => { if (p) setProfile(p) })
  }, [user])

  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  const updateProfile = async (updates: { pseudo?: string; photoUrl?: string }) => {
    if (!user) return
    await saveProfile(user.id, updates)
    setProfile(prev => (prev ? { ...prev, ...updates } : prev))
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
