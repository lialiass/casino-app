import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyFriendships, sendGameInvite } from '../lib/supabase'
import type { ProfileSearchResult } from '../types'

// ─── Invite sheet ─────────────────────────────────────────────────────────────

function InviteSheet({
  gameId,
  groupId,
  alreadyInGame,
  onClose,
}: {
  gameId: string
  groupId?: string
  alreadyInGame: Set<string>
  onClose: () => void
}) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<ProfileSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [errored, setErrored] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    fetchMyFriendships(user.id).then(fs => {
      const accepted = fs.filter(f => f.status === 'accepted').map(f => f.otherProfile)
      setFriends(accepted)
      setLoading(false)
    })
  }, [user])

  async function handleInvite(friend: ProfileSearchResult) {
    if (!user) return
    setSending(prev => new Set(prev).add(friend.id))
    setErrored(prev => { const n = new Set(prev); n.delete(friend.id); return n })
    try {
      await sendGameInvite(gameId, groupId, friend.id)
      setSent(prev => new Set(prev).add(friend.id))
    } catch (err) {
      console.error('sendGameInvite error:', err)
      setErrored(prev => new Set(prev).add(friend.id))
    } finally {
      setSending(prev => { const n = new Set(prev); n.delete(friend.id); return n })
    }
  }

  const initials = (pseudo: string) => pseudo.slice(0, 2).toUpperCase()

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        zIndex: 101,
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
            Inviter des amis
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              Chargement…
            </p>
          ) : friends.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              Aucun ami à inviter.
            </p>
          ) : (
            friends.map(friend => {
              const inGame = alreadyInGame.has(friend.id)
              const isSent = sent.has(friend.id)
              const isSending = sending.has(friend.id)
              const isErrored = errored.has(friend.id)

              return (
                <div
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    opacity: inGame ? 0.5 : 1,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--bg-felt)', border: '2px solid var(--border-gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold)',
                    overflow: 'hidden',
                  }}>
                    {friend.photoUrl
                      ? <img src={friend.photoUrl} alt={friend.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : initials(friend.pseudo)
                    }
                  </div>

                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                    {friend.pseudo}
                  </span>

                  {inGame ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Déjà dans la partie
                    </span>
                  ) : isSent ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 700 }}>
                      ✓ Invité
                    </span>
                  ) : isErrored ? (
                    <button
                      className="btn btn-sm"
                      onClick={() => handleInvite(friend)}
                      style={{ flexShrink: 0, padding: '6px 12px', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ↺ Réessayer
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleInvite(friend)}
                      disabled={isSending}
                      style={{ flexShrink: 0, padding: '6px 14px' }}
                    >
                      {isSending ? '…' : 'Inviter'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameInProgress() {
  const { id } = useParams<{ id: string }>()
  const { getGameById, getPlayerById, addRebuy, finishGame, deleteGame } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [winnerId, setWinnerId] = useState<string>('')
  const [secondId, setSecondId] = useState<string>('')
  const [showFinish, setShowFinish] = useState(false)
  const [shareGains, setShareGains] = useState(false)
  const [showInviteSheet, setShowInviteSheet] = useState(false)
  // When arriving via invite, the store may not have the game yet — wait up to 5s for realtime sync
  const [waitingForGame, setWaitingForGame] = useState(true)

  const game = getGameById(id!)

  useEffect(() => {
    if (game) {
      setWaitingForGame(false)
      return
    }
    // Game not found yet — give realtime subscription time to deliver the update
    const timer = setTimeout(() => setWaitingForGame(false), 5000)
    return () => clearTimeout(timer)
  }, [game])

  useEffect(() => {
    if (game && game.status === 'finished') {
      navigate(`/results/${game.id}`, { replace: true })
    }
  }, [game, navigate])

  // Still waiting for the game to arrive via realtime after invite accept
  if (!game && waitingForGame) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 12 }}>
        <div style={{ fontSize: '2.5rem' }}>🃏</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chargement de la partie…</p>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">❌</div>
          <p>Partie introuvable.</p>
          <button className="btn btn-outline" style={{ marginTop: 16, width: 'auto' }} onClick={() => navigate('/')}>
            Accueil
          </button>
        </div>
      </div>
    )
  }

  if (game.status === 'finished') return null

  const pot = game.players.reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0)
  const alreadyInGame = new Set(game.players.map(p => p.playerId))
  // Always show invite button for any authenticated user viewing an in-progress game
  // canInvite was previously gated on alreadyInGame.has(user.id) which fails
  // for legacy games whose player IDs are short alphanumeric strings, not UUIDs
  const canInvite = !!user

  const handleFinish = async () => {
    if (!winnerId || !secondId) return
    if (winnerId === secondId) return
    await finishGame(game.id, winnerId, secondId, shareGains)
    navigate(`/results/${game.id}`, { replace: true })
  }

  const handleFinishShared = async () => {
    if (!winnerId || !secondId) return
    if (winnerId === secondId) return
    await finishGame(game.id, winnerId, secondId, true)
    navigate(`/results/${game.id}`, { replace: true })
  }

  const handleAbort = () => {
    if (confirm('Abandonner et supprimer cette partie ?')) {
      deleteGame(game.id)
      navigate('/', { replace: true })
    }
  }

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 20 }}>
      <div className="header">
        <button className="header-back" onClick={handleAbort} title="Abandonner">✕</button>
        <h1>Partie en cours</h1>
        {canInvite && (
          <button
            onClick={() => setShowInviteSheet(true)}
            aria-label="Inviter des amis"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--bg-felt)',
              border: '1px solid var(--border-gold)',
              borderRadius: 20,
              padding: '5px 12px',
              color: 'var(--gold)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Inviter
          </button>
        )}
      </div>

      {showInviteSheet && (
        <InviteSheet
          gameId={game.id}
          groupId={game.groupId}
          alreadyInGame={alreadyInGame}
          onClose={() => setShowInviteSheet(false)}
        />
      )}

      <div className="page">
        {/* Pot */}
        <div className="pot-display">
          <div className="pot-label">🃏 Pot total</div>
          <div className="pot-amount">{pot.toFixed(2)}€</div>
          <div className="pot-sub">
            {game.players.length} joueurs · Mise {game.buyIn}€
          </div>
        </div>

        {/* Players */}
        <div className="section-title">Joueurs</div>
        {game.players.map(gp => {
          const player = getPlayerById(gp.playerId)
          if (!player) return null
          const totalEngaged = game.buyIn * (1 + gp.rebuys)

          return (
            <div key={gp.playerId} className="game-player-card">
              <div className="game-player-header">
                <div
                  className="player-avatar"
                  style={player.photoUrl ? {
                    backgroundImage: `url(${player.photoUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {!player.photoUrl && getInitials(player.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="player-name">{player.name}</div>
                  <div className="game-player-stats">
                    <div className="stat-chip">
                      Recaves : <span>{gp.rebuys}</span>
                    </div>
                    <div className="stat-chip">
                      Engagé : <span style={{ color: 'var(--gold)' }}>{totalEngaged}€</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => addRebuy(game.id, gp.playerId)}
                  style={{ flexShrink: 0 }}
                >
                  + Recave
                </button>
              </div>
            </div>
          )
        })}

        <div className="divider" />

        {/* Finish game */}
        {!showFinish ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-gold" onClick={() => { setShowFinish(true); setShareGains(false) }}>
              🏁 Terminer la partie
            </button>
            <button className="btn btn-outline" onClick={() => { setShowFinish(true); setShareGains(true) }}>
              🤝 Partager les gains
            </button>
          </div>
        ) : (
          <div className="card card-gold">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="section-title" style={{ marginTop: 0, marginBottom: 0, flex: 1 }}>
                {shareGains ? '🤝 Partager les gains' : 'Résultats finaux'}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: 'auto', fontSize: '0.7rem' }}
                onClick={() => setShareGains(g => !g)}
              >
                {shareGains ? '↩ Mode normal' : '🤝 Partager'}
              </button>
            </div>

            {shareGains ? (
              <div>
                <div className="form-group">
                  <label className="form-label">🤝 Finaliste 1</label>
                  <select
                    className="input"
                    value={winnerId}
                    onChange={e => {
                      setWinnerId(e.target.value)
                      if (secondId === e.target.value) setSecondId('')
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {game.players.map(gp => {
                      const p = getPlayerById(gp.playerId)
                      return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">🤝 Finaliste 2</label>
                  <select
                    className="input"
                    value={secondId}
                    onChange={e => setSecondId(e.target.value)}
                  >
                    <option value="">— Sélectionner —</option>
                    {game.players
                      .filter(gp => gp.playerId !== winnerId)
                      .map(gp => {
                        const p = getPlayerById(gp.playerId)
                        return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                      })}
                  </select>
                </div>

                {winnerId && secondId && (() => {
                  const gp1 = game.players.find(gp => gp.playerId === winnerId)
                  const gp2 = game.players.find(gp => gp.playerId === secondId)
                  if (!gp1 || !gp2) return null
                  const s1 = game.buyIn * (1 + gp1.rebuys)
                  const s2 = game.buyIn * (1 + gp2.rebuys)
                  const othersLost = game.players
                    .filter(gp => gp.playerId !== winnerId && gp.playerId !== secondId)
                    .reduce((sum, gp) => sum + game.buyIn * (1 + gp.rebuys), 0)
                  const shareEach = othersLost / 2
                  const finalists = [{ gp: gp1, engaged: s1 }, { gp: gp2, engaged: s2 }]
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div className="section-title">Aperçu</div>
                      {game.players
                        .filter(gp => gp.playerId !== winnerId && gp.playerId !== secondId)
                        .map(gp => {
                          const p = getPlayerById(gp.playerId)
                          if (!p) return null
                          const te = game.buyIn * (1 + gp.rebuys)
                          return (
                            <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: '0.9rem' }}>❌ {p.name}</span>
                              <span style={{ fontWeight: 800, color: 'var(--red)' }}>-{te.toFixed(2)}€</span>
                            </div>
                          )
                        })}
                      {finalists.map(({ gp, engaged }) => {
                        const p = getPlayerById(gp.playerId)
                        if (!p) return null
                        const net = shareEach
                        return (
                          <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                            <span style={{ fontSize: '0.9rem' }}>🤝 {p.name}</span>
                            <span style={{ fontWeight: 800, color: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : 'var(--gold)' }}>
                              {net > 0 ? '+' : net < 0 ? '-' : ''}{Math.abs(net).toFixed(2)}€
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                                (récupère {(engaged + net).toFixed(2)}€)
                              </span>
                            </span>
                          </div>
                        )
                      })}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 0 }}>
                        Chaque finaliste récupère sa mise + la moitié des pertes des autres joueurs.
                      </p>
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-green"
                    onClick={handleFinishShared}
                    disabled={!winnerId || !secondId || winnerId === secondId}
                  >
                    ✓ Confirmer le partage
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowFinish(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">🥇 Gagnant (1er)</label>
                  <select
                    className="input"
                    value={winnerId}
                    onChange={e => {
                      setWinnerId(e.target.value)
                      if (secondId === e.target.value) setSecondId('')
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {game.players.map(gp => {
                      const p = getPlayerById(gp.playerId)
                      return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">🥈 Deuxième (récupère sa mise)</label>
                  <select
                    className="input"
                    value={secondId}
                    onChange={e => setSecondId(e.target.value)}
                  >
                    <option value="">— Sélectionner —</option>
                    {game.players
                      .filter(gp => gp.playerId !== winnerId)
                      .map(gp => {
                        const p = getPlayerById(gp.playerId)
                        return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                      })}
                  </select>
                </div>

                {winnerId && secondId && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="section-title">Aperçu</div>
                    {(() => {
                      const secondGp = game.players.find(gp2 => gp2.playerId === secondId)
                      const secondRebuyCost = secondGp ? game.buyIn * secondGp.rebuys : 0
                      const otherLosses = game.players
                        .filter(gp2 => gp2.playerId !== winnerId && gp2.playerId !== secondId)
                        .reduce((sum, gp2) => sum + game.buyIn * (1 + gp2.rebuys), 0)
                      return game.players.map(gp => {
                        const p = getPlayerById(gp.playerId)
                        if (!p) return null
                        const te = game.buyIn * (1 + gp.rebuys)
                        let net: number, color: string, label: string
                        if (gp.playerId === winnerId) {
                          net = otherLosses + secondRebuyCost; color = 'var(--green)'; label = '🥇'
                        } else if (gp.playerId === secondId) {
                          net = -secondRebuyCost; color = secondRebuyCost > 0 ? 'var(--red)' : 'var(--gold)'; label = '🥈'
                        } else {
                          net = -te; color = 'var(--red)'; label = '❌'
                        }
                        return (
                          <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                            <span style={{ fontSize: '0.9rem' }}>{label} {p.name}</span>
                            <span style={{ fontWeight: 800, color }}>
                              {net > 0 ? '+' : net < 0 ? '-' : ''}{Math.abs(net).toFixed(2)}€
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-green"
                    onClick={handleFinish}
                    disabled={!winnerId || !secondId || winnerId === secondId}
                  >
                    ✓ Valider
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowFinish(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-ghost" style={{ marginTop: 10, color: 'var(--red)' }} onClick={handleAbort}>
          🗑️ Abandonner la partie
        </button>
      </div>
    </div>
  )
}
