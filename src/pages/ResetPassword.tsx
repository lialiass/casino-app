import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authUpdatePassword } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, signOut, isRecoverySession, loading: authLoading } = useAuth()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]     = useState(false)

  // ── Succès — vérifié EN PREMIER pour éviter le flash "lien invalide" ────────
  // signOut() déclenche SIGNED_OUT → isRecoverySession=false AVANT la navigation.
  // Si success=true est vérifié après isRecoverySession, on voit "lien invalide".
  // En le vérifiant ici, le composant reste sur l'écran succès jusqu'au navigate().
  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: 24 }}>
          <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>✅</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="login-title">Mot de passe modifié !</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Ton mot de passe a bien été mis à jour.
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Redirection vers la connexion…
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Attente de la résolution auth ─────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: '2rem' }}>🔑</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Vérification du lien…</p>
        </div>
      </div>
    )
  }

  // ── Token invalide ou expiré ──────────────────────────────────────────────
  // Si l'auth est chargée mais qu'il n'y a pas de session recovery valide,
  // le lien est expiré, déjà utilisé, ou le token est incorrect.
  if (!isRecoverySession) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: 20 }}>
          <div style={{ fontSize: '3rem', lineHeight: 1 }}>⛔</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="login-title">Lien invalide</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Ce lien de réinitialisation est expiré ou a déjà été utilisé.
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Demande un nouveau lien depuis la page de connexion.
            </p>
          </div>
          <button
            className="btn btn-gold"
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%' }}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
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

    setSubmitting(true)
    try {
      const { error: err } = await authUpdatePassword(password)
      if (err) {
        setError('Erreur : ' + err.message)
        return
      }

      // Capturer l'email AVANT signOut (user devient null après)
      const email = user?.email ?? ''

      // Nettoyer sessionStorage immédiatement
      sessionStorage.removeItem('poker_password_recovery')

      // Afficher l'écran succès — vérifié EN PREMIER dans le render,
      // donc isRecoverySession=false (déclenché par signOut) ne causera pas de flash.
      setSuccess(true)

      // signOut + navigate après 1 seconde pour que l'utilisateur voie le message
      setTimeout(async () => {
        await signOut()
        navigate('/login', { replace: true, state: { email } })
      }, 1000)
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1 className="login-title">Poker Manager</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <p className="login-forgot-title">Nouveau mot de passe</p>
          <p className="login-forgot-desc">
            Choisis un nouveau mot de passe pour ton compte{user?.email ? ` (${user.email})` : ''}.
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
          <button type="submit" className="btn btn-gold" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
          <button
            type="button"
            className="login-forgot-link"
            onClick={() => navigate('/login', { replace: true })}
          >
            ← Retour à la connexion
          </button>
        </form>
      </div>
    </div>
  )
}
