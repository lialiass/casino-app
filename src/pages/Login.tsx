import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authSignIn, authSignUp, authResetPassword } from '../lib/supabase'

type Tab = 'login' | 'register' | 'forgot'

export default function Login() {
  const { user, isRecoverySession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Préremplir email + message si redirigé depuis ResetPassword
  const locationState = location.state as { email?: string; message?: string } | null
  const prefillEmail   = locationState?.email   ?? ''
  const prefillMessage = locationState?.message ?? ''

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState(prefillEmail)
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Ne jamais rediriger une session recovery vers l'app —
    // RequireAuth s'en charge et renvoie vers /reset-password.
    if (user && !isRecoverySession) navigate('/', { replace: true })
  }, [user, isRecoverySession, navigate])

  function resetForm() {
    setError('')
    setInfo('')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    resetForm()
    if (!email.trim()) {
      setError('Entre ton adresse email.')
      return
    }
    setLoading(true)
    try {
      await authResetPassword(email.trim())
      setInfo('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.')
    } catch {
      setError('Erreur lors de l\'envoi. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    resetForm()
    setLoading(true)
    try {
      const { error } = await authSignIn(email, password)
      if (error) setError(error.message)
    } catch {
      setError('Erreur de connexion. Vérifie ta configuration Supabase.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    resetForm()
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (pseudo.trim().length < 2) {
      setError('Le pseudo doit contenir au moins 2 caractères.')
      return
    }
    setLoading(true)
    try {
      const { error } = await authSignUp(email, password, pseudo.trim())
      if (error) {
        setError(error.message)
      }
      // Succès : Supabase retourne une session immédiate (confirmation email désactivée).
      // onAuthStateChange → SIGNED_IN → user défini → useEffect navigue vers '/'.
    } catch {
      setError('Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🃏</div>
        <h1 className="login-title">Poker Manager</h1>

        {tab !== 'forgot' && (
          <div className="login-tabs">
            <button
              type="button"
              className={tab === 'login' ? 'active' : ''}
              onClick={() => { setTab('login'); resetForm() }}
            >
              Connexion
            </button>
            <button
              type="button"
              className={tab === 'register' ? 'active' : ''}
              onClick={() => { setTab('register'); resetForm() }}
            >
              Inscription
            </button>
          </div>
        )}

        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {prefillMessage && <p className="login-info">{prefillMessage}</p>}
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => { setTab('forgot'); resetForm() }}
            >
              Mot de passe oublié ?
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form className="login-form" onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="text"
              placeholder="Pseudo"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              required
              maxLength={30}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Mot de passe (6 caractères min.)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Création…' : 'Créer un compte'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form className="login-form" onSubmit={handleForgot}>
            <p className="login-forgot-title">Réinitialiser le mot de passe</p>
            <p className="login-forgot-desc">
              Entre ton adresse email. Tu recevras un lien pour créer un nouveau mot de passe.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            {info && <p className="login-info">{info}</p>}
            {!info && (
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            )}
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => { setTab('login'); resetForm() }}
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
