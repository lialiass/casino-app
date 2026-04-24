import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './store'
import { InvitesProvider } from './contexts/InvitesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <InvitesProvider>
          <App />
        </InvitesProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
)
