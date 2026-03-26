import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function Home() {
  const { players, games, getActiveGame } = useStore()
  const navigate = useNavigate()
  const activeGame = getActiveGame()

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

        {activeGame && (
          <div
            className="card"
            style={{
              borderColor: '#22c55e60',
              background: 'linear-gradient(135deg, #0d2b1a, #0f1623)',
              marginBottom: 16,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/game/${activeGame.id}`)}
          >
            <div className="row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#22c55e', fontSize: '0.6rem' }}>●</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Partie en cours
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {activeGame.players.length} joueurs · Mise {activeGame.buyIn}€
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Pot actuel :{' '}
                  <strong style={{ color: 'var(--gold)' }}>
                    {activeGame.players.reduce((sum, p) => sum + activeGame.buyIn * (1 + p.rebuys), 0)}€
                  </strong>
                </div>
              </div>
              <span style={{ fontSize: '1.5rem', color: 'var(--gold)' }}>→</span>
            </div>
          </div>
        )}

        <div className="home-actions">
          {activeGame ? (
            <button className="btn btn-green" onClick={() => navigate(`/game/${activeGame.id}`)}>
              ▶ Reprendre la partie
            </button>
          ) : (
            <button
              className="btn btn-gold"
              onClick={() => navigate('/new-game')}
              disabled={players.length < 2}
            >
              ♠ Nouvelle partie
            </button>
          )}

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
