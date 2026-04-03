import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function Home() {
  const { players, games } = useStore()
  const navigate = useNavigate()

  const finishedGames = games.filter(g => g.status === 'finished')
  const totalPot = finishedGames.reduce((sum, g) => sum + (g.pot || 0), 0)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="page">
        <div className="home-logo">
          <div className="suits">♠ ♥ ♣ ♦</div>
          <h1>POKER MANAGER</h1>
          <p>Gérez vos parties entre amis</p>
        </div>

        <div className="stats-grid">
          <div className="card" style={{ padding: 12 }}>
            <div className="quick-stat">
              <div className="value">{players.length}</div>
              <div className="label">Joueurs</div>
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="quick-stat">
              <div className="value">{finishedGames.length}</div>
              <div className="label">Parties</div>
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="quick-stat">
              <div className="value">{totalPot}€</div>
              <div className="label">Joué</div>
            </div>
          </div>
        </div>



        <div className="home-actions">
          <button
            className="btn btn-gold"
            onClick={() => navigate('/new-game')}
            disabled={players.length < 2}
          >
            ♠ Nouvelle partie
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => navigate('/players')}>
              Joueurs
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/history')}>
              Historique
            </button>
          </div>

          <button className="btn btn-ghost" onClick={() => navigate('/rankings')}>
            🏆 Classement
          </button>
        </div>

        {players.length < 2 && (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            Ajoutez au moins 2 joueurs pour démarrer une partie.
          </div>
        )}
      </div>
    </div>
  )
}
