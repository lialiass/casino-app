import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function GameInProgress() {
  const { id } = useParams<{ id: string }>()
  const { getGameById, getPlayerById, addRebuy, finishGame, deleteGame } = useStore()
  const navigate = useNavigate()

  const [winnerId, setWinnerId] = useState<string>('')
  const [secondId, setSecondId] = useState<string>('')
  const [showFinish, setShowFinish] = useState(false)
  const [shareGains, setShareGains] = useState(false)

  const game = getGameById(id!)

  useEffect(() => {
    if (game && game.status === 'finished') {
      navigate(`/results/${game.id}`, { replace: true })
    }
  }, [game, navigate])

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

  const handleFinish = () => {
    if (!winnerId || !secondId) return
    if (winnerId === secondId) return
    finishGame(game.id, winnerId, secondId, shareGains)
    navigate(`/results/${game.id}`, { replace: true })
  }

  // FIX: ne bloque plus sur players.length === 2
  // Utilise winnerId et secondId (les 2 finalistes sélectionnés) au lieu des 2 premiers joueurs
  const handleFinishShared = () => {
    if (!winnerId || !secondId) return
    if (winnerId === secondId) return
    finishGame(game.id, winnerId, secondId, true)
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
      </div>

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
            {/* FIX: suppression de la condition game.players.length === 2
                Le bouton est toujours visible, peu importe le nombre de joueurs */}
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
              {/* FIX: suppression de la condition game.players.length === 2
                  Le toggle partage/normal est toujours disponible */}
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: 'auto', fontSize: '0.7rem' }}
                onClick={() => setShareGains(g => !g)}
              >
                {shareGains ? '↩ Mode normal' : '🤝 Partager'}
              </button>
            </div>

            {shareGains ? (
              /* ---- MODE PARTAGE ---- */
              <div>
                {/* Sélection des 2 finalistes */}
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

                {/* FIX: aperçu du partage basé sur winnerId/secondId (les 2 finalistes)
                    et non plus sur game.players entier */}
                {winnerId && secondId && (() => {
                  const gp1 = game.players.find(gp => gp.playerId === winnerId)
                  const gp2 = game.players.find(gp => gp.playerId === secondId)
                  if (!gp1 || !gp2) return null

                  const s1 = game.buyIn * (1 + gp1.rebuys)
                  const s2 = game.buyIn * (1 + gp2.rebuys)
                  // Les autres joueurs ont tout perdu : leur mise va dans le pot
                  const othersLost = game.players
                    .filter(gp => gp.playerId !== winnerId && gp.playerId !== secondId)
                    .reduce((sum, gp) => sum + game.buyIn * (1 + gp.rebuys), 0)
                  // Bénéfice net partagé = ce que les autres ont perdu, divisé en 2
                  const shareEach = othersLost / 2

                  const finalists = [
                    { gp: gp1, engaged: s1 },
                    { gp: gp2, engaged: s2 },
                  ]

                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div className="section-title">Aperçu</div>
                      {/* Autres joueurs (perdants) */}
                      {game.players
                        .filter(gp => gp.playerId !== winnerId && gp.playerId !== secondId)
                        .map(gp => {
                          const p = getPlayerById(gp.playerId)
                          if (!p) return null
                          const te = game.buyIn * (1 + gp.rebuys)
                          return (
                            <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: '0.9rem' }}>❌ {p.name}</span>
                              <span style={{ fontWeight: 800, color: 'var(--red)' }}>
                                -{te.toFixed(2)}€
                              </span>
                            </div>
                          )
                        })}
                      {/* Finalistes */}
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
              /* ---- MODE NORMAL ---- */
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

            {/* Preview results */}
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
                    let net: number
                    let color: string
                    let label: string

                    if (gp.playerId === winnerId) {
                      net = otherLosses + secondRebuyCost
                      color = 'var(--green)'
                      label = '🥇'
                    } else if (gp.playerId === secondId) {
                      net = -secondRebuyCost
                      color = secondRebuyCost > 0 ? 'var(--red)' : 'var(--gold)'
                      label = '🥈'
                    } else {
                      net = -te
                      color = 'var(--red)'
                      label = '❌'
                    }

                    return (
                      <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: '0.9rem' }}>
                          {label} {p.name}
                        </span>
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
