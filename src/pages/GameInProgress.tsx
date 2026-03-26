import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function GameInProgress() {
  const { id } = useParams<{ id: string }>()
  const { getGameById, getPlayerById, addRebuy, finishGame, deleteGame } = useStore()
  const navigate = useNavigate()

  const [winnerId, setWinnerId] = useState<string>('')
  const [secondId, setSecondId] = useState<string>('')
  const [showFinish, setShowFinish] = useState(false)

  const game = getGameById(id!)
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

  if (game.status === 'finished') {
    navigate(`/results/${game.id}`, { replace: true })
    return null
  }

  const pot = game.players.reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0)

  const handleFinish = () => {
    if (!winnerId || !secondId) return
    if (winnerId === secondId) return
    const result = finishGame(game.id, winnerId, secondId)
    navigate(`/results/${result.id}`, { replace: true })
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
                <div className="player-avatar">{getInitials(player.name)}</div>
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
          <button className="btn btn-gold" onClick={() => setShowFinish(true)}>
            🏁 Terminer la partie
          </button>
        ) : (
          <div className="card card-gold">
            <div className="section-title" style={{ marginTop: 0 }}>Résultats finaux</div>

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
                      net = otherLosses
                      color = 'var(--green)'
                      label = '🥇'
                    } else if (gp.playerId === secondId) {
                      net = 0
                      color = 'var(--gold)'
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
                          {net > 0 ? '+' : ''}{net.toFixed(2)}€
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

        <button className="btn btn-ghost" style={{ marginTop: 10, color: 'var(--red)' }} onClick={handleAbort}>
          🗑️ Abandonner la partie
        </button>
      </div>
    </div>
  )
}
