import { useState } from 'react'
import Account from './Account'
import Friends from './Friends'

type Tab = 'compte' | 'amis'

export default function Profile() {
  const [tab, setTab] = useState<Tab>('compte')

  return (
    <div>
      <div className="header">
        <h1>Profil</h1>
      </div>
      <div className="page-tabs">
        <button className={`page-tab${tab === 'compte' ? ' active' : ''}`} onClick={() => setTab('compte')}>
          Compte
        </button>
        <button className={`page-tab${tab === 'amis' ? ' active' : ''}`} onClick={() => setTab('amis')}>
          Amis
        </button>
      </div>
      {tab === 'compte' ? <Account embedded /> : <Friends />}
    </div>
  )
}
