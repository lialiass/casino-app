import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvites } from '../contexts/InvitesContext'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchMyFriendships,
  acceptFriendRequest,
  rejectFriendRequest,
} from '../lib/supabase'
import type { GameInviteWithDetails, FriendshipWithProfile } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'amis' | 'parties'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ photoUrl, pseudo, size = 48 }: { photoUrl?: string; pseudo: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'var(--bg-felt)', border: '2px solid var(--border-gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, fontWeight: 800, color: 'var(--gold)', flexShrink: 0,
      }}
    >
      {photoUrl
        ? <img src={photoUrl} alt={pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : pseudo.slice(0, 2).toUpperCase()
      }
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

// ─── Carte invitation de partie ───────────────────────────────────────────────

function GameInviteCard({
  invite, onAccept, onDecline, accepting, declining,
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
        <button className="btn btn-gold btn-sm" onClick={onAccept} disabled={accepting || declining} style={{ flex: 1 }}>
          {accepting ? '⏳ Rejoindre…' : '✓ Rejoindre'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onDecline} disabled={accepting || declining} style={{ flex: 1 }}>
          {declining ? '…' : '✕ Refuser'}
        </button>
      </div>
    </div>
  )
}

// ─── Carte demande d'ami ──────────────────────────────────────────────────────

function FriendRequestCard({
  friendship, onAccept, onReject, busy,
}: {
  friendship: FriendshipWithProfile
  onAccept: () => void
  onReject: () => void
  busy: boolean
}) {
  return (
    <div className="invite-card">
      <div className="invite-card-header">
        <Avatar photoUrl={friendship.otherProfile.photoUrl} pseudo={friendship.otherProfile.pseudo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>
            <strong>{friendship.otherProfile.pseudo}</strong>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> veut devenir ton ami</span>
          </p>
          <span className="invite-chip invite-chip-time" style={{ marginTop: 6, display: 'inline-block' }}>
            {timeAgo(friendship.createdAt)}
          </span>
        </div>
      </div>
      <div className="invite-actions">
        <button className="btn btn-gold btn-sm" onClick={onAccept} disabled={busy} style={{ flex: 1 }}>
          {busy ? '…' : '✓ Accepter'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onReject} disabled={busy} style={{ flex: 1 }}>
          {busy ? '…' : '✕ Refuser'}
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Invitations() {
  const navigate = useNavigate()
  const { invites, loading, refresh, accept, decline, pendingFriendCount, refreshFriendCount } = useInvites()
  const { ensureUserPlayer } = useStore()
  const { user, profile } = useAuth()

  // ── Onglets ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('amis')

  // ── Demandes d'amis reçues ────────────────────────────────────────────────
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null)

  const loadFriends = useCallback(async () => {
    if (!user) return
    setLoadingFriends(true)
    const data = await fetchMyFriendships(user.id)
    setFriendships(data)
    setLoadingFriends(false)
  }, [user])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const receivedRequests = friendships.filter(
    f => f.status === 'pending' && f.addresseeId === user?.id
  )

  // ── Handlers parties ──────────────────────────────────────────────────────
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAcceptGame(invite: GameInviteWithDetails) {
    if (!user || !profile) return
    setAcceptingId(invite.id)
    try {
      await ensureUserPlayer({ id: user.id, pseudo: profile.pseudo ?? 'Moi', photoUrl: profile.photoUrl })
      await accept(invite, user.id)
      showToast('Tu as rejoint la partie !')
      setAcceptingId(null)
      setTimeout(() => navigate(`/game/${invite.gameId}`), 900)
    } catch (err) {
      console.error('handleAcceptGame error:', err)
      showToast('Impossible de rejoindre la partie.', false)
      setAcceptingId(null)
    }
  }

  async function handleDeclineGame(invite: GameInviteWithDetails) {
    setDecliningId(invite.id)
    try {
      await decline(invite.id)
      showToast('Invitation refusée.', true)
    } catch (err) {
      console.error('handleDeclineGame error:', err)
    } finally {
      setDecliningId(null)
    }
  }

  // ── Handlers amis ─────────────────────────────────────────────────────────

  async function handleAcceptFriend(friendshipId: string) {
    setBusyFriendId(friendshipId)
    try {
      await acceptFriendRequest(friendshipId)
      showToast('Ami ajouté !')
      await loadFriends()
      await refreshFriendCount()
    } catch (err) {
      console.error('handleAcceptFriend error:', err)
      showToast("Impossible d'accepter.", false)
    } finally {
      setBusyFriendId(null)
    }
  }

  async function handleRejectFriend(friendshipId: string) {
    setBusyFriendId(friendshipId)
    try {
      await rejectFriendRequest(friendshipId)
      showToast('Demande refusée.')
      await loadFriends()
      await refreshFriendCount()
    } catch (err) {
      console.error('handleRejectFriend error:', err)
    } finally {
      setBusyFriendId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
          onClick={() => { refresh(); loadFriends() }}
          aria-label="Actualiser"
          style={{ opacity: (loading || loadingFriends) ? 0.4 : 1, pointerEvents: (loading || loadingFriends) ? 'none' : 'auto' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>

      {/* Onglets */}
      <div className="page-tabs">
        <button
          className={`page-tab${tab === 'amis' ? ' active' : ''}`}
          onClick={() => setTab('amis')}
        >
          Amis
          {pendingFriendCount > 0 && (
            <span className="friends-badge" style={{ marginLeft: 6 }}>
              {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
            </span>
          )}
        </button>
        <button
          className={`page-tab${tab === 'parties' ? ' active' : ''}`}
          onClick={() => setTab('parties')}
        >
          Parties
          {invites.length > 0 && (
            <span className="friends-badge" style={{ marginLeft: 6 }}>
              {invites.length > 9 ? '9+' : invites.length}
            </span>
          )}
        </button>
      </div>

      <div className="page">

        {/* ══ TAB : AMIS ════════════════════════════════════════════════════ */}
        {tab === 'amis' && (
          <>
            {loadingFriends && receivedRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👥</div>
                <p style={{ fontSize: '0.9rem' }}>Chargement…</p>
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Aucune demande d'ami en attente
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Quand quelqu'un t'envoie une demande, elle apparaît ici.
                </p>
              </div>
            ) : (
              <>
                <p style={{
                  fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14,
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {receivedRequests.length} demande{receivedRequests.length > 1 ? 's' : ''} reçue{receivedRequests.length > 1 ? 's' : ''}
                </p>
                {receivedRequests.map(f => (
                  <FriendRequestCard
                    key={f.id}
                    friendship={f}
                    onAccept={() => handleAcceptFriend(f.id)}
                    onReject={() => handleRejectFriend(f.id)}
                    busy={busyFriendId === f.id}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ══ TAB : PARTIES ════════════════════════════════════════════════ */}
        {tab === 'parties' && (
          <>
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
                  fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14,
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {invites.length} invitation{invites.length > 1 ? 's' : ''} en attente
                </p>
                {invites.map(invite => (
                  <GameInviteCard
                    key={invite.id}
                    invite={invite}
                    onAccept={() => handleAcceptGame(invite)}
                    onDecline={() => handleDeclineGame(invite)}
                    accepting={acceptingId === invite.id}
                    declining={decliningId === invite.id}
                  />
                ))}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
