import { useState, useEffect, type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchInviteById, acceptGameInvite, declineGameInvite } from '../lib/supabase'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import type { GameInviteWithDetails } from '../types'

function Avatar({ photoUrl, pseudo, size = 72 }: { photoUrl?: string; pseudo: string; size?: number }) {
  const initials = pseudo.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'var(--bg-felt)',
      border: '3px solid var(--border-gold)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.32,
      fontWeight: 800,
      color: 'var(--gold)',
      flexShrink: 0,
      margin: '0 auto',
    }}>
      {photoUrl
        ? <img src={photoUrl} alt={pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : initials
      }
    </div>
  )
}

type PageState = 'loading' | 'ready' | 'not-found' | 'already-handled' | 'success' | 'declined' | 'error'

export default function InviteDeepLink() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { ensureUserPlayer } = useStore()
  const { user, profile } = useAuth()

  const [invite, setInvite] = useState<GameInviteWithDetails | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!id) { setPageState('not-found'); return }
    fetchInviteById(id).then(data => {
      if (!data) { setPageState('not-found'); return }
      if (data.status !== 'pending') { setPageState('already-handled'); return }
      setInvite(data)
      setPageState('ready')
    })
  }, [id])

  async function handleAccept() {
    if (!invite || !user || !profile) return
    setWorking(true)
    try {
      await ensureUserPlayer({
        id: user.id,
        pseudo: profile.pseudo ?? 'Moi',
        photoUrl: profile.photoUrl,
      })
      await acceptGameInvite(invite.id, invite.gameId, user.id)
      setPageState('success')
      setTimeout(() => navigate(`/game/${invite.gameId}`, { replace: true }), 1200)
    } catch (err) {
      console.error('InviteDeepLink accept error:', err)
      setPageState('error')
    } finally {
      setWorking(false)
    }
  }

  async function handleDecline() {
    if (!invite) return
    setWorking(true)
    try {
      await declineGameInvite(invite.id)
      setPageState('declined')
    } catch (err) {
      console.error('InviteDeepLink decline error:', err)
    } finally {
      setWorking(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎴</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chargement de l'invitation…</p>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (pageState === 'not-found') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
        <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Invitation introuvable</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Ce lien n'est peut-être plus valide.
        </p>
        <button className="btn btn-gold" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/')}>
          Accueil
        </button>
      </div>
    )
  }

  // ── Already handled ──────────────────────────────────────────────────────
  if (pageState === 'already-handled') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
        <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Invitation déjà traitée</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Tu as déjà accepté ou refusé cette invitation.
        </p>
        <button className="btn btn-gold" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/')}>
          Accueil
        </button>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
        <p style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.2rem' }}>Bienvenue à la table !</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>Redirection en cours…</p>
      </div>
    )
  }

  // ── Declined ─────────────────────────────────────────────────────────────
  if (pageState === 'declined') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>👋</div>
        <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Invitation refusée</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Peut-être à la prochaine !
        </p>
        <button className="btn btn-ghost" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/')}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div style={centeredPage}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Une erreur est survenue</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Impossible de rejoindre la partie. Réessaie depuis la page Invitations.
        </p>
        <button className="btn btn-gold" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/invitations')}>
          Mes invitations
        </button>
      </div>
    )
  }

  // ── Ready — main invite view ─────────────────────────────────────────────
  if (!invite) return null

  const isMyInvite = user?.id === invite.receiverId

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', paddingBottom: 48 }}>
      {/* Card */}
      <div className="card card-gold" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: '32px 24px' }}>
        {/* Sender avatar */}
        <Avatar photoUrl={invite.senderProfile.photoUrl} pseudo={invite.senderProfile.pseudo} size={80} />

        <div style={{ marginTop: 16, marginBottom: 20 }}>
          <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            {invite.senderProfile.pseudo}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            t'invite à rejoindre une partie de poker
          </p>
        </div>

        {/* Game info pill */}
        {invite.gameBuyIn !== undefined && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border-gold)',
            borderRadius: 20,
            padding: '6px 16px',
            marginBottom: 24,
          }}>
            <span style={{ fontSize: '1rem' }}>♠</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)' }}>
              Mise {invite.gameBuyIn}€
            </span>
          </div>
        )}

        {/* Actions */}
        {isMyInvite ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-gold"
              onClick={handleAccept}
              disabled={working}
            >
              {working ? '⏳ Rejoindre…' : '🃏 Rejoindre la partie'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleDecline}
              disabled={working}
            >
              Refuser
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Cette invitation ne t'est pas destinée.
            </p>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Accueil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const centeredPage: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
  textAlign: 'center',
}
