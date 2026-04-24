import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Confirmed() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // If Supabase processed the token and signed the user in, redirect home
  useEffect(() => {
    if (user) {
      const t = setTimeout(() => navigate('/', { replace: true }), 1500)
      return () => clearTimeout(t)
    }
  }, [user, navigate])

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center', gap: 24 }}>
        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>✅</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="login-title">Compte confirmé !</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Ton adresse email a bien été confirmée.
            {user
              ? ' Redirection en cours…'
              : ' Tu peux maintenant te connecter à Poker Manager.'}
          </p>
        </div>

        {!user && (
          <Link to="/login" className="btn btn-gold" style={{ textDecoration: 'none' }}>
            Se connecter
          </Link>
        )}
      </div>
    </div>
  )
}
