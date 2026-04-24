import { createClient } from '@supabase/supabase-js'
import type { Profile } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = !!supabase

// --- Auth ---

export async function authSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase.auth.signInWithPassword({ email, password })
}

export async function authSignUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase.auth.signUp({ email, password })
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
  }
}

export async function saveProfile(userId: string, updates: { pseudo?: string; photoUrl?: string }) {
  if (!supabase) return
  const row: Record<string, unknown> = {}
  if (updates.pseudo !== undefined) row.pseudo = updates.pseudo
  if (updates.photoUrl !== undefined) row.photo_url = updates.photoUrl
  return supabase.from('profiles').update(row).eq('id', userId)
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
