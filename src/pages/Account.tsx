import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
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

export default function Account({ embedded = false }: { embedded?: boolean }) {
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

  // ── Calcul des statistiques personnelles ──────────────────────────────────
  // Source : uniquement les parties du store (filtrées par RLS = mes parties visibles).
  // On ne lit que les résultats où playerId === mon propre user.id.
  const myStats = (() => {
    const myId = user?.id
    if (!myId) return null

    let totalGames = 0, wins = 0, seconds = 0, losses = 0
    let netResult = 0, totalEngaged = 0
    let bestWin = 0, worstLoss = 0, hasResult = false

    for (const game of games) {
      if (game.status !== 'finished' || !game.results) continue
      const result = game.results.find(r => r.playerId === myId)
      if (!result) continue
      totalGames++
      netResult    += result.netResult
      totalEngaged += result.totalEngaged
      if (result.rank === 'winner' || result.rank === 'shared') wins++
      else if (result.rank === 'second') seconds++
      else losses++
      if (!hasResult || result.netResult > bestWin)   bestWin   = result.netResult
      if (!hasResult || result.netResult < worstLoss) worstLoss = result.netResult
      hasResult = true
    }

    const winRate    = totalGames > 0 ? Math.round(wins    / totalGames * 100) : 0
    const secondRate = totalGames > 0 ? Math.round(seconds / totalGames * 100) : 0
    const avgGain    = totalGames > 0 ? netResult / totalGames : 0

    return { totalGames, wins, seconds, losses, netResult, totalEngaged, bestWin, worstLoss, winRate, secondRate, avgGain }
  })()

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

  async function handleShare() {
    const appUrl = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Poker Manager',
          text: 'Rejoins-moi sur Poker Manager pour gérer nos parties entre amis.',
          url: appUrl,
        })
      } catch {
        // L'utilisateur a annulé ou le partage a échoué — pas d'action requise
      }
    } else {
      // Fallback desktop : copie dans le presse-papiers
      navigator.clipboard.writeText(appUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }

  return (
    <div>
      {!embedded && (
        <div className="header">
          <h1>Mon compte</h1>
        </div>
      )}

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

        {/* Mes statistiques */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
            Mes statistiques
          </p>

          {!myStats || myStats.totalGames === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Aucune partie terminée pour l'instant.
            </p>
          ) : (
            <>
              {/* Ligne 1 : résultat net en vedette */}
              <div style={{
                textAlign: 'center', padding: '14px 0 16px',
                borderBottom: '1px solid var(--border)', marginBottom: 14,
              }}>
                <div style={{
                  fontSize: '2rem', fontWeight: 800, lineHeight: 1,
                  color: myStats.netResult > 0 ? 'var(--green)' : myStats.netResult < 0 ? 'var(--red)' : 'var(--gold)',
                }}>
                  {myStats.netResult > 0 ? '+' : ''}{myStats.netResult.toFixed(2)}€
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Gains nets cumulés
                </div>
              </div>

              {/* Grille 3×2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Parties', value: myStats.totalGames, color: 'var(--gold)' },
                  { label: 'Victoires', value: myStats.wins, color: 'var(--green)' },
                  { label: '2e places', value: myStats.seconds, color: 'var(--text)' },
                  { label: 'Défaites', value: myStats.losses, color: myStats.losses > 5 ? 'var(--red)' : 'var(--text)' },
                  { label: 'Win rate', value: `${myStats.winRate}%`, color: myStats.winRate >= 40 ? 'var(--green)' : 'var(--text)' },
                  { label: 'Top 2 rate', value: `${myStats.secondRate + myStats.winRate}%`, color: 'var(--text)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Grille 2×2 — détails financiers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  {
                    label: 'Meilleur résultat',
                    value: `${myStats.bestWin > 0 ? '+' : ''}${myStats.bestWin.toFixed(2)}€`,
                    color: myStats.bestWin > 0 ? 'var(--green)' : 'var(--text-muted)',
                  },
                  {
                    label: 'Pire résultat',
                    value: `${myStats.worstLoss.toFixed(2)}€`,
                    color: myStats.worstLoss < 0 ? 'var(--red)' : 'var(--text-muted)',
                  },
                  {
                    label: 'Gain moyen / partie',
                    value: `${myStats.avgGain > 0 ? '+' : ''}${myStats.avgGain.toFixed(2)}€`,
                    color: myStats.avgGain > 0 ? 'var(--green)' : myStats.avgGain < 0 ? 'var(--red)' : 'var(--text-muted)',
                  },
                  {
                    label: 'Total engagé',
                    value: `${myStats.totalEngaged.toFixed(2)}€`,
                    color: 'var(--text)',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Share */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Inviter des amis
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.4 }}>
            Partage l'application à tes amis pour qu'ils rejoignent Poker Manager.
          </p>
          <button
            className="btn btn-gold"
            onClick={handleShare}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            {copied ? '✓ Lien copié !' : 'Partager l\'application'}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            {window.location.origin}
          </p>
        </div>

        {/* Players history link */}
        {embedded && (
          <Link
            to="/players"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', color: 'var(--text-dim)', fontSize: '0.85rem', textDecoration: 'none', borderTop: '1px solid var(--border)', marginTop: 8 }}
          >
            <span>Joueurs historiques</span>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: 'var(--text-muted)' }}>
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </Link>
        )}

        {/* Sign out */}
        <button className="btn btn-ghost" onClick={signOut} style={{ marginTop: 8 }}>
          Déconnexion
        </button>

      </div>
    </div>
  )
}
