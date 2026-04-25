import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authUpdatePassword } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await authUpdatePassword(password)
      if (err) {
        setError('Erreur : ' + err.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1 className="login-title">Poker Manager</h1>

        {success ? (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>
              Mot de passe mis à jour !
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              Tu peux maintenant te connecter avec ton nouveau mot de passe.
            </p>
            <button
              className="btn btn-gold"
              onClick={() => navigate('/login', { replace: true })}
              style={{ width: '100%' }}
            >
              Se connecter
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <p className="login-forgot-title">Nouveau mot de passe</p>
            <p className="login-forgot-desc">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
            <input
              type="password"
              placeholder="Nouveau mot de passe (6 caractères min.)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => navigate('/login', { replace: true })}
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
