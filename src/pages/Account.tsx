import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { uploadProfilePhoto } from '../lib/supabase'
import { useStore } from '../store'
import {
  isPushSupported,
  getPermissionStatus,
  requestAndRegister,
  type NotifPermission,
} from '../lib/notifications'

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

// ── Toggle switch premium iOS ─────────────────────────────────────────────────
function Toggle({ value, onChange, disabled = false }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? 'var(--green)' : 'var(--border)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 20 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

export default function Account({ embedded = false }: { embedded?: boolean }) {
  const { user, profile, signOut, updateProfile, deleteAccount } = useAuth()
  const { games, ensureUserPlayer } = useStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingPseudo, setEditingPseudo] = useState(false)
  const [pseudoValue, setPseudoValue]     = useState('')
  const [savingPseudo, setSavingPseudo]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [copied, setCopied]               = useState(false)
  const [pseudoError, setPseudoError]     = useState('')

  // ── Suppression de compte ─────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm]     = useState('')
  const [deleting, setDeleting]               = useState(false)
  const [deleteError, setDeleteError]         = useState('')

  // ── Notifications ─────────────────────────────────────────────────────────
  const [pushPermission, setPushPermission]   = useState<NotifPermission>('prompt')
  const [requestingPush, setRequestingPush]   = useState(false)
  const [savingNotif, setSavingNotif]         = useState(false)

  useEffect(() => {
    setPseudoValue(profile?.pseudo ?? '')
  }, [profile?.pseudo])

  // Vérifier la permission push au montage (iOS Capacitor uniquement)
  useEffect(() => {
    if (!isPushSupported()) return
    getPermissionStatus().then(setPushPermission)
  }, [])

  // ── Statistiques personnelles ─────────────────────────────────────────────
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

  // ── Handlers — profil ─────────────────────────────────────────────────────
  async function handleSavePseudo() {
    if (!pseudoValue.trim()) { setPseudoError('Le pseudo ne peut pas être vide.'); return }
    setPseudoError('')
    setSavingPseudo(true)
    const newPseudo = pseudoValue.trim()
    await updateProfile({ pseudo: newPseudo })
    // Sync le player dans le store pour que Home/Podium et Classement soient à jour immédiatement
    if (user) await ensureUserPlayer({ id: user.id, pseudo: newPseudo, photoUrl: profile?.photoUrl })
    setSavingPseudo(false)
    setEditingPseudo(false)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)
    const url = await uploadProfilePhoto(user.id, file)
    if (url) {
      await updateProfile({ photoUrl: url })
      // Sync le player dans le store pour que Home/Podium et Classement soient à jour immédiatement
      await ensureUserPlayer({ id: user.id, pseudo: profile?.pseudo ?? 'Moi', photoUrl: url })
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function handleShare() {
    const appUrl = 'https://playpokermanager.fr'
    if (navigator.share) {
      try { await navigator.share({ title: 'Poker Manager', text: 'Rejoins-moi sur Poker Manager pour gérer nos parties entre amis.', url: appUrl }) }
      catch { /* annulé */ }
    } else {
      try { await navigator.clipboard.writeText(appUrl) }
      catch {
        const el = document.createElement('textarea')
        el.value = appUrl
        el.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // ── Handler — suppression de compte ──────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER') return
    setDeleting(true)
    setDeleteError('')
    const { error } = await deleteAccount()
    if (error) {
      setDeleteError(error)
      setDeleting(false)
      return
    }
    // La suppression est réussie — signOut puis redirection
    await signOut()
    navigate('/login', { replace: true })
  }

  // ── Handler — notifications ───────────────────────────────────────────────
  async function handleEnablePush() {
    setRequestingPush(true)
    const granted = await requestAndRegister(user?.id ?? '')
    setPushPermission(granted ? 'granted' : 'denied')
    setRequestingPush(false)
  }

  async function handleToggleNotif(key: 'notifFriends' | 'notifGames' | 'notifResults', value: boolean) {
    setSavingNotif(true)
    await updateProfile({ [key]: value })
    setSavingNotif(false)
  }

  const notifFriends  = profile?.notifFriends  ?? true
  const notifGames    = profile?.notifGames    ?? true
  const notifResults  = profile?.notifResults  ?? true
  const pushEnabled   = pushPermission === 'granted'

  return (
    <div>
      {!embedded && (
        <div className="header">
          <h1>Mon compte</h1>
        </div>
      )}

      <div className="page">

        {/* ── Carte profil ──────────────────────────────────────────────── */}
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
              <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Pseudo</p>
              {editingPseudo ? (
                <input
                  className="account-input"
                  value={pseudoValue}
                  onChange={e => setPseudoValue(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSavePseudo(); if (e.key === 'Escape') setEditingPseudo(false) }}
                />
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

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Email</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email ?? '—'}
            </p>
          </div>
        </div>

        {/* ── Statistiques ─────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="section-label">Mes statistiques</p>

          {!myStats || myStats.totalGames === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Aucune partie terminée pour l'instant.
            </p>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '14px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: myStats.netResult > 0 ? 'var(--green)' : myStats.netResult < 0 ? 'var(--red)' : 'var(--gold)' }}>
                  {myStats.netResult > 0 ? '+' : ''}{myStats.netResult.toFixed(2)}€
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Gains nets cumulés
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Parties',   value: myStats.totalGames, color: 'var(--gold)' },
                  { label: 'Victoires', value: myStats.wins,       color: 'var(--green)' },
                  { label: '2e places', value: myStats.seconds,    color: 'var(--text)' },
                  { label: 'Défaites',  value: myStats.losses,     color: myStats.losses > 5 ? 'var(--red)' : 'var(--text)' },
                  { label: 'Win rate',  value: `${myStats.winRate}%`, color: myStats.winRate >= 40 ? 'var(--green)' : 'var(--text)' },
                  { label: 'Top 2',     value: `${myStats.secondRate + myStats.winRate}%`, color: 'var(--text)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { label: 'Meilleur résultat', value: `${myStats.bestWin > 0 ? '+' : ''}${myStats.bestWin.toFixed(2)}€`, color: myStats.bestWin > 0 ? 'var(--green)' : 'var(--text-muted)' },
                  { label: 'Pire résultat',     value: `${myStats.worstLoss.toFixed(2)}€`,                                  color: myStats.worstLoss < 0 ? 'var(--red)' : 'var(--text-muted)' },
                  { label: 'Gain moyen',        value: `${myStats.avgGain > 0 ? '+' : ''}${myStats.avgGain.toFixed(2)}€`, color: myStats.avgGain > 0 ? 'var(--green)' : myStats.avgGain < 0 ? 'var(--red)' : 'var(--text-muted)' },
                  { label: 'Total engagé',      value: `${myStats.totalEngaged.toFixed(2)}€`,                              color: 'var(--text)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Activité & Notifications ─────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="section-label">Activité &amp; Notifications</p>

          {/* Statut permission iOS */}
          {isPushSupported() ? (
            <>
              {pushPermission === 'denied' ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--red)', fontWeight: 600, marginBottom: 4 }}>
                    Notifications désactivées
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Pour les activer : Réglages iPhone → Notifications → Poker Manager → Autoriser.
                  </p>
                </div>
              ) : pushPermission === 'prompt' ? (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleEnablePush}
                  disabled={requestingPush}
                  style={{ marginBottom: 12, width: '100%' }}
                >
                  {requestingPush ? 'Demande en cours…' : '🔔 Activer les notifications'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 0' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--green)', fontWeight: 600 }}>● Notifications activées</span>
                </div>
              )}

              {/* Toggles — visibles seulement si accès accordé */}
              {pushEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { key: 'notifFriends'  as const, label: 'Demandes et amis',  desc: 'Nouvelles demandes, acceptations',           value: notifFriends  },
                    { key: 'notifGames'    as const, label: 'Parties',            desc: 'Invitations, début et fin de partie',        value: notifGames    },
                    { key: 'notifResults'  as const, label: 'Résultats',          desc: 'Annonce du gagnant en fin de partie',        value: notifResults  },
                  ].map(({ key, label, desc, value }, i, arr) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        gap: 12,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{desc}</p>
                      </div>
                      <Toggle value={value} onChange={v => handleToggleNotif(key, v)} disabled={savingNotif} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Les notifications sont disponibles uniquement sur iPhone.
            </p>
          )}
        </div>

        {/* ── Partager ─────────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="section-label">Inviter des amis</p>
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

        {/* ── Lien joueurs historiques ──────────────────────────────────── */}
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

        {/* ── Déconnexion ───────────────────────────────────────────────── */}
        <button className="btn btn-ghost" onClick={signOut} style={{ marginTop: 8 }}>
          Déconnexion
        </button>

        {/* ── Supprimer le compte ───────────────────────────────────────── */}
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteError('') }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--red)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '10px 0',
            marginTop: 4,
            width: '100%',
            textAlign: 'center',
            opacity: 0.75,
          }}
        >
          Supprimer mon compte
        </button>

      </div>

      {/* ── Modal suppression de compte ──────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="delete-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false) }}
        >
          <div className="delete-modal-sheet">
            {/* Handle iOS */}
            <div className="delete-modal-handle" />

            {/* Icône danger */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
              }}>
                🗑️
              </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
              Supprimer le compte ?
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 20 }}>
              Cette action est <strong style={{ color: 'var(--red)' }}>définitive</strong>.<br />
              Vos données personnelles seront supprimées.
            </p>

            {/* Champ de confirmation */}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tapez SUPPRIMER pour confirmer
            </p>
            <input
              className="input"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={deleting}
              style={{ marginBottom: 8, borderColor: deleteConfirm === 'SUPPRIMER' ? 'var(--red)' : undefined }}
            />

            {deleteError && (
              <p style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: 8, textAlign: 'center' }}>
                {deleteError}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-red"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
                style={{ opacity: deleteConfirm !== 'SUPPRIMER' ? 0.4 : 1 }}
              >
                {deleting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="btn-spinner" />
                    Suppression en cours…
                  </span>
                ) : (
                  'Supprimer définitivement'
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
