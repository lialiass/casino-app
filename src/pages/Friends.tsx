import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  searchProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
  fetchMyFriendships,
} from '../lib/supabase'
import type { FriendshipWithProfile, ProfileSearchResult } from '../types'

function MiniAvatar({ photoUrl, pseudo, size = 40 }: { photoUrl?: string; pseudo: string; size?: number }) {
  const initials = pseudo.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--bg-felt)',
        border: '2px solid var(--border-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 800,
        color: 'var(--gold)',
        flexShrink: 0,
      }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        initials
      )}
    </div>
  )
}

export default function Friends() {
  const { user } = useAuth()
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [sendError, setSendError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoadingList(true)
    const data = await fetchMyFriendships(user.id)
    setFriendships(data)
    setLoadingList(false)
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      if (!user) return
      setSearching(true)
      const results = await searchProfiles(searchQuery.trim(), user.id)
      setSearchResults(results)
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, user])

  function getRelation(otherId: string): { type: 'none' | 'sent' | 'received' | 'accepted'; friendship?: FriendshipWithProfile } {
    const f = friendships.find(fr => fr.otherProfile.id === otherId)
    if (!f) return { type: 'none' }
    if (f.status === 'accepted') return { type: 'accepted', friendship: f }
    if (f.status === 'pending' && f.requesterId === user?.id) return { type: 'sent', friendship: f }
    if (f.status === 'pending' && f.addresseeId === user?.id) return { type: 'received', friendship: f }
    return { type: 'none' }
  }

  async function handleSend(addresseeId: string) {
    if (!user) return
    setBusy(addresseeId)
    setSendError('')
    const res = await sendFriendRequest(user.id, addresseeId)
    if (res && 'error' in res && res.error) {
      setSendError('Impossible d\'envoyer la demande.')
    } else {
      await load()
    }
    setBusy(null)
  }

  async function handleAccept(friendshipId: string) {
    setBusy(friendshipId)
    await acceptFriendRequest(friendshipId)
    await load()
    setBusy(null)
  }

  async function handleReject(friendshipId: string) {
    setBusy(friendshipId)
    await rejectFriendRequest(friendshipId)
    await load()
    setBusy(null)
  }

  async function handleRemove(friendshipId: string) {
    setBusy(friendshipId)
    await removeFriendship(friendshipId)
    await load()
    setBusy(null)
  }

  const received = friendships.filter(f => f.status === 'pending' && f.addresseeId === user?.id)
  const accepted = friendships.filter(f => f.status === 'accepted')
  const sent = friendships.filter(f => f.status === 'pending' && f.requesterId === user?.id)

  return (
    <div className="page">

      {/* Search */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Rechercher un ami
        </p>
        <input
          className="friends-search-input"
          type="text"
          placeholder="Pseudo (2 caractères min.)"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSendError('') }}
        />
        {searching && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Recherche…</p>
        )}
        {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Aucun résultat.</p>
        )}
        {sendError && <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: 6 }}>{sendError}</p>}
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {searchResults.map(result => {
              const rel = getRelation(result.id)
              return (
                <div key={result.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MiniAvatar photoUrl={result.photoUrl} pseudo={result.pseudo} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{result.pseudo}</span>
                  {rel.type === 'none' && (
                    <button className="btn btn-gold btn-sm" disabled={busy === result.id} onClick={() => handleSend(result.id)}>
                      {busy === result.id ? '…' : 'Ajouter'}
                    </button>
                  )}
                  {rel.type === 'sent' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demande envoyée</span>
                  )}
                  {rel.type === 'received' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-gold btn-sm" disabled={busy === rel.friendship!.id} onClick={() => handleAccept(rel.friendship!.id)}>
                        {busy === rel.friendship!.id ? '…' : 'Accepter'}
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={busy === rel.friendship!.id} onClick={() => handleReject(rel.friendship!.id)}>
                        Refuser
                      </button>
                    </div>
                  )}
                  {rel.type === 'accepted' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ami ✓</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Received requests */}
      {received.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Demandes reçues <span className="friends-badge">{received.length}</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {received.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MiniAvatar photoUrl={f.otherProfile.photoUrl} pseudo={f.otherProfile.pseudo} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{f.otherProfile.pseudo}</span>
                <button className="btn btn-gold btn-sm" disabled={busy === f.id} onClick={() => handleAccept(f.id)}>
                  {busy === f.id ? '…' : 'Accepter'}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={busy === f.id} onClick={() => handleReject(f.id)}>
                  Refuser
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Mes amis {accepted.length > 0 && <span className="friends-badge">{accepted.length}</span>}
        </p>
        {loadingList && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chargement…</p>}
        {!loadingList && accepted.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucun ami pour l'instant.</p>
        )}
        {accepted.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {accepted.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MiniAvatar photoUrl={f.otherProfile.photoUrl} pseudo={f.otherProfile.pseudo} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{f.otherProfile.pseudo}</span>
                <button className="btn btn-ghost btn-sm" disabled={busy === f.id} onClick={() => handleRemove(f.id)}>
                  {busy === f.id ? '…' : 'Retirer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent requests */}
      {sent.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Demandes envoyées
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sent.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MiniAvatar photoUrl={f.otherProfile.photoUrl} pseudo={f.otherProfile.pseudo} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{f.otherProfile.pseudo}</span>
                <button className="btn btn-ghost btn-sm" disabled={busy === f.id} onClick={() => handleRemove(f.id)}>
                  {busy === f.id ? '…' : 'Annuler'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
