import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { uploadProfilePhoto } from '../lib/supabase'
import { useStore } from '../store'

function Avatar({ photoUrl, pseudo, size = 80 }: { photoUrl?: string; pseudo?: string; size?: number }) {
  const initials = pseudo ? pseudo.slice(0, 2).toUpperCase() : '?'
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--bg-felt)',
        border: '2px solid var(--border-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.3,
        fontWeight: 800,
        color: 'var(--gold)',
        flexShrink: 0,
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={pseudo}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        />
      ) : (
        initials
      )}
    </div>
  )
}

export default function Account() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { games } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingPseudo, setEditingPseudo] = useState(false)
  const [pseudoValue, setPseudoValue] = useState('')
  const [savingPseudo, setSavingPseudo] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pseudoError, setPseudoError] = useState('')

  useEffect(() => {
    setPseudoValue(profile?.pseudo ?? '')
  }, [profile?.pseudo])

  const finishedGames = games.filter(
    g => g.status === 'finished' && g.players.some(p => p.playerId === user?.id || true)
  ).length

  async function handleSavePseudo() {
    if (!pseudoValue.trim()) {
      setPseudoError('Le pseudo ne peut pas être vide.')
      return
    }
    setPseudoError('')
    setSavingPseudo(true)
    await updateProfile({ pseudo: pseudoValue.trim() })
    setSavingPseudo(false)
    setEditingPseudo(false)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)
    const url = await uploadProfilePhoto(user.id, file)
    if (url) await updateProfile({ photoUrl: url })
    setUploadingPhoto(false)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleCopy() {
    const appUrl = window.location.origin
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="header">
        <h1>Mon compte</h1>
      </div>

      <div className="page">

        {/* Profile card */}
        <div className="card card-gold" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <Avatar photoUrl={profile?.photoUrl} pseudo={profile?.pseudo} size={72} />
              <button
                className="account-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label="Modifier la photo"
              >
                {uploadingPhoto ? '…' : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Pseudo</p>
              {editingPseudo ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="account-input"
                    value={pseudoValue}
                    onChange={e => setPseudoValue(e.target.value)}
                    maxLength={30}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSavePseudo(); if (e.key === 'Escape') setEditingPseudo(false) }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.pseudo ?? '—'}
                </p>
              )}
            </div>

            {!editingPseudo && (
              <button className="account-icon-btn" onClick={() => setEditingPseudo(true)} aria-label="Modifier le pseudo">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            )}
          </div>

          {editingPseudo && (
            <div style={{ display: 'flex', gap: 8, marginBottom: pseudoError ? 4 : 0 }}>
              <button className="btn btn-gold btn-sm" onClick={handleSavePseudo} disabled={savingPseudo} style={{ flex: 1 }}>
                {savingPseudo ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPseudo(false); setPseudoValue(profile?.pseudo ?? ''); setPseudoError('') }} style={{ flex: 1 }}>
                Annuler
              </button>
            </div>
          )}
          {pseudoError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4 }}>{pseudoError}</p>}

          {/* Email row */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Email</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email ?? '—'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Statistiques
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg)', borderRadius: 8 }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{finishedGames}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Parties jouées</p>
            </div>
          </div>
        </div>

        {/* Share */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Inviter des amis
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.4 }}>
            Partage le lien de l'application à tes amis pour qu'ils rejoignent Poker Manager.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
            <p style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.location.origin}
            </p>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleCopy}
              style={{ flexShrink: 0, padding: '6px 12px' }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button className="btn btn-ghost" onClick={signOut} style={{ marginTop: 8 }}>
          Déconnexion
        </button>

      </div>
    </div>
  )
}
