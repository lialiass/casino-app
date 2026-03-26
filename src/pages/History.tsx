import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Game } from '../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function GameDetail({ game, onClose }: { game: Game; onClose: () => void }) {
  const { getPlayerById, deleteGame } = useStore()
  const navigate = useNavigate()

  const handleDelete = () => {
    if (confirm('Supprimer cette partie de l\'historique ?')) {
      deleteGame(game.id)
      onClose()
    }
  }

  const sortedResults = game.results ? [...game.results].sort((a, b) => b.netResult - a.netResult) : []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-gold)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 16px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div className="row" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.1rem' }}>
              Partie du {formatDate(game.date)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Mise {game.buyIn}€ · Pot {(game.pot || 0).toFixed(2)}€ · {game.players.length} joueurs
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {sortedResults.map((result, idx) => {
          const player = getPlayerById(result.playerId)
          const gp = game.players.find(p => p.playerId === result.playerId)
          const emoji = result.rank === 'winner' ? '🥇' : result.rank === 'second' ? '🥈' : '❌'

          return (
            <div key={result.playerId} className="row" style={{
              padding: '10px 12px',
              background: idx % 2 === 0 ? 'var(--bg)' : 'transparent',
              borderRadius: 6,
              marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{emoji}</span>
                <span style={{ fontWeight: 600 }}>{player?.name}</span>
                {gp && gp.rebuys > 0 && (
                  <span className="badge badge-gray">{gp.rebuys} recave{gp.rebuys > 1 ? 's' : ''}</span>
                )}
              </div>
              <span style={{
                fontWeight: 800,
                color: result.netResult > 0 ? 'var(--green)' : result.netResult < 0 ? 'var(--red)' : 'var(--gold)',
              }}>
                {result.netResult > 0 ? '+' : ''}{result.netResult.toFixed(2)}€
              </span>
            </div>
          )
        })}

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate(`/results/${game.id}`)}>
            Voir détail
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--red)', borderColor: '#ef444440' }}
            onClick={handleDelete}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const { games, getPlayerById } = useStore()
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const finishedGames = games
    .filter(g => g.status === 'finished')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>♠ Historique</h1>
      </div>

      <div className="page">
        {finishedGames.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Aucune partie terminée.</p>
          </div>
        ) : (
          finishedGames.map(game => {
            const winner = game.winnerId ? getPlayerById(game.winnerId) : null
            const totalRebuys = game.players.reduce((s, p) => s + p.rebuys, 0)

            return (
              <div
                key={game.id}
                className="history-item"
                onClick={() => setSelectedGame(game)}
              >
                <div className="row" style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{formatDate(game.date)}</div>
                  <div style={{ color: 'var(--gold)', fontWeight: 800 }}>
                    {(game.pot || 0).toFixed(2)}€
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {winner && (
                    <span className="badge badge-green">🥇 {winner.name}</span>
                  )}
                  <span className="badge badge-gray">
                    {game.players.length} joueurs
                  </span>
                  <span className="badge badge-gray">Mise {game.buyIn}€</span>
                  {totalRebuys > 0 && (
                    <span className="badge badge-gold">{totalRebuys} recave{totalRebuys > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {selectedGame && (
        <GameDetail game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  )
}
