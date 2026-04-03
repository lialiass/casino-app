import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Players from './pages/Players'
import NewGame from './pages/NewGame'
import GameInProgress from './pages/GameInProgress'
import Results from './pages/Results'
import History from './pages/History'
import Rankings from './pages/Rankings'

function NavBar() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/game/') || location.pathname.startsWith('/results/')

  if (hideNav) return null

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        Accueil
      </NavLink>
      <NavLink to="/players" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        Joueurs
      </NavLink>
      <NavLink to="/new-game" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        Partie
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
        Historique
      </NavLink>
      <NavLink to="/rankings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>
        Classement
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/new-game" element={<NewGame />} />
        <Route path="/game/:id" element={<GameInProgress />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/rankings" element={<Rankings />} />
      </Routes>
      <NavBar />
    </HashRouter>
  )
}
