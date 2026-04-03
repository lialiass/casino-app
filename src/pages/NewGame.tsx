import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function NewGame() {
  const { players, createGame } = useStore()
  const navigate = useNavigate()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [buyIn, setBuyIn] = useState('5')

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStart = () => {
    const buyInVal = parseFloat(buyIn)
    if (isNaN(buyInVal) || buyInVal <= 0) return
    if (selectedIds.size < 2) return

    const game = createGame(Array.from(selectedIds), buyInVal)
    navigate(`/game/${game.id}`)
  }

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>♠ Nouvelle partie</h1>
      </div>

      <div className="page">
        {/* Buy-in */}
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Mise de départ (€)</label>
          <input
            className="input"
            type="number"
            value={buyIn}
            onChange={e => setBuyIn(e.target.value)}
            min="0.5"
            step="0.5"
            placeholder="5"
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Chaque recave coûte également {buyIn || '?'}€
          </div>
        </div>

        {/* Players */}
        <div className="section-title">
          Sélectionner les joueurs ({selectedIds.size} sélectionnés)
        </div>

        {players.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <p>Aucun joueur. Créez-en d'abord dans l'onglet Joueurs.</p>
          </div>
        ) : (
          players.map(player => {
            const isSelected = selectedIds.has(player.id)
            return (
              <div
                key={player.id}
                className={`player-item checkbox-player${isSelected ? ' selected' : ''}`}
                onClick={() => togglePlayer(player.id)}
              >
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
                <span className="player-name">{player.name}</span>
                <div className="checkmark">{isSelected ? '✓' : ''}</div>
              </div>
            )
          })
        )}

        {/* Preview */}
        {selectedIds.size >= 2 && (
          <div className="card card-gold" style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Aperçu</div>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Joueurs</span>
              <span style={{ fontWeight: 700 }}>{selectedIds.size}</span>
            </div>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pot de départ</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)' }}>
                {(selectedIds.size * parseFloat(buyIn || '0')).toFixed(2)}€
              </span>
            </div>
          </div>
        )}

        {/* Start */}
        <div style={{ marginTop: 20 }}>
          <button
            className="btn btn-gold"
            onClick={handleStart}
            disabled={selectedIds.size < 2 || !buyIn || parseFloat(buyIn) <= 0}
          >
            ♠ Lancer la partie
          </button>
          {selectedIds.size < 2 && players.length >= 2 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
              Sélectionnez au moins 2 joueurs
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
