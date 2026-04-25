import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useInvites } from './contexts/InvitesContext'
import Login from './pages/Login'
import Confirmed from './pages/Confirmed'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Players from './pages/Players'
import NewGame from './pages/NewGame'
import GameInProgress from './pages/GameInProgress'
import Results from './pages/Results'
import History from './pages/History'
import Rankings from './pages/Rankings'
import Account from './pages/Account'
import Profile from './pages/Profile'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Invitations from './pages/Invitations'
import InviteDeepLink from './pages/InviteDeepLink'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecoverySession } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>Chargement…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Session de recovery (reset password) : forcer vers /reset-password,
  // jamais vers l'app connectée.
  if (isRecoverySession) {
    return <Navigate to="/reset-password" replace />
  }

  return <>{children}</>
}

function NavBar() {
  const location = useLocation()
  const { pendingCount } = useInvites()
  const hideNav = location.pathname.startsWith('/game/') || location.pathname.startsWith('/results/')

  if (hideNav) return null

  return (
    <nav className="bottom-nav">
      {/* Home */}
      <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        Accueil
      </NavLink>

      {/* Groupes */}
      <NavLink to="/groups" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        Groupes
      </NavLink>

      {/* Nouvelle partie */}
      <NavLink to="/new-game" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        Partie
      </NavLink>

      {/* Invitations — avec badge */}
      <NavLink to="/invitations" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          {pendingCount > 0 && (
            <span className="nav-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
          )}
        </div>
        Invitations
      </NavLink>

      {/* Profil */}
      <NavLink to="/profile" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        Profil
      </NavLink>
    </nav>
  )
}

function AuthenticatedApp() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/new-game" element={<NewGame />} />
        <Route path="/game/:id" element={<GameInProgress />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/invite/:id" element={<InviteDeepLink />} />
      </Routes>
      <NavBar />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/confirmed" element={<Confirmed />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        />
      </Routes>
    </HashRouter>
  )
}
