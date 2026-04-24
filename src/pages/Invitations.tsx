import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvites } from '../contexts/InvitesContext'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import type { GameInviteWithDetails } from '../types'

function Avatar({
  photoUrl,
  pseudo,
  size = 48,
}: {
  photoUrl?: string
  pseudo: string
  size?: number
}) {
  const initials = pseudo.slice(0, 2).toUpperCase()
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
        fontSize: size * 0.32,
        fontWeight: 800,
        color: 'var(--gold)',
        flexShrink: 0,
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={pseudo}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initials
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return `Il y a ${Math.floor(hrs / 24)}j`
}

function InviteCard({
  invite,
  onAccept,
  onDecline,
  accepting,
  declining,
}: {
  invite: GameInviteWithDetails
  onAccept: () => void
  onDecline: () => void
  accepting: boolean
  declining: boolean
}) {
  return (
    <div className="invite-card">
      <div className="invite-card-header">
        <Avatar photoUrl={invite.senderProfile.photoUrl} pseudo={invite.senderProfile.pseudo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>
            <strong>{invite.senderProfile.pseudo}</strong>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> t'invite à jouer</span>
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            {invite.gameBuyIn !== undefined && (
              <span className="invite-chip">♠ Mise {invite.gameBuyIn}€</span>
            )}
            <span className="invite-chip invite-chip-time">{timeAgo(invite.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="invite-actions">
        <button
          className="btn btn-gold btn-sm"
          onClick={onAccept}
          disabled={accepting || declining}
          style={{ flex: 1 }}
        >
          {accepting ? '⏳ Rejoindre…' : '✓ Rejoindre'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onDecline}
          disabled={accepting || declining}
          style={{ flex: 1 }}
        >
          {declining ? '…' : '✕ Refuser'}
        </button>
      </div>
    </div>
  )
}

export default function Invitations() {
  const navigate = useNavigate()
  const { invites, loading, refresh, accept, decline } = useInvites()
  const { ensureUserPlayer } = useStore()
  const { user, profile } = useAuth()

  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAccept(invite: GameInviteWithDetails) {
    if (!user || !profile) return
    setAcceptingId(invite.id)
    try {
      await ensureUserPlayer({
        id: user.id,
        pseudo: profile.pseudo ?? 'Moi',
        photoUrl: profile.photoUrl,
      })
      await accept(invite, user.id)
      showToast('Tu as rejoint la partie !')
      // Reset immediately — the invite card will disappear via optimistic update
      setAcceptingId(null)
      setTimeout(() => navigate(`/game/${invite.gameId}`), 900)
    } catch (err) {
      console.error('handleAccept error:', err)
      showToast('Impossible de rejoindre la partie.', false)
      setAcceptingId(null)
    }
  }

  async function handleDecline(invite: GameInviteWithDetails) {
    setDecliningId(invite.id)
    try {
      await decline(invite.id)
      showToast('Invitation refusée.', true)
    } catch (err) {
      console.error('handleDecline error:', err)
    } finally {
      setDecliningId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {toast && (
        <div className={`invite-toast${toast.ok ? '' : ' invite-toast-error'}`}>
          {toast.msg}
        </div>
      )}

      <div className="header">
        <h1>Invitations</h1>
        <button
          className="header-action-btn"
          onClick={refresh}
          aria-label="Actualiser"
          style={{ opacity: loading ? 0.4 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>

      <div className="page">
        {loading && invites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎴</div>
            <p style={{ fontSize: '0.9rem' }}>Chargement des invitations…</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎴</div>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Aucune invitation en attente
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Quand un ami t'invite à rejoindre une partie, ça apparaît ici en temps réel.
            </p>
          </div>
        ) : (
          <>
            <p style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginBottom: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {invites.length} invitation{invites.length > 1 ? 's' : ''} en attente
            </p>
            {invites.map(invite => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onAccept={() => handleAccept(invite)}
                onDecline={() => handleDecline(invite)}
                accepting={acceptingId === invite.id}
                declining={decliningId === invite.id}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
