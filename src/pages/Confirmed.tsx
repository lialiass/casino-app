import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Confirmed() {
  const { user } = useAuth()
  const navigate = useNavigate()

  function handleConnect() {
    if (user) {
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center', gap: 24 }}>
        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>✅</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="login-title">Compte confirmé !</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Ton adresse email a bien été vérifiée.
          </p>
        </div>

        <button
          className="btn btn-gold"
          onClick={handleConnect}
          style={{ width: '100%' }}
        >
          Me connecter
        </button>
      </div>
    </div>
  )
}
