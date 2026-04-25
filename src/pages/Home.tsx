import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Podium from '../components/Podium'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyFriendships } from '../lib/supabase'

export default function Home() {
  const { games } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [friendCount, setFriendCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchMyFriendships(user.id).then(friendships => {
      setFriendCount(friendships.filter(f => f.status === 'accepted').length)
    })
  }, [user])

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
              <div className="value">{friendCount}</div>
              <div className="label">Amis</div>
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

        {friendCount === 0 && (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            Ajoutez des amis pour pouvoir démarrer une partie.
          </div>
        )}

        <Podium />
      </div>
    </div>
  )
}
