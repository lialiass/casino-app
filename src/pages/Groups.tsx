import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchMyGroups,
  fetchMyFriendships,
  createGroup as createGroupDB,
  uploadGroupPhoto,
  updateGroup,
} from '../lib/supabase'
import type { Group, ProfileSearchResult } from '../types'

function GroupAvatar({ photoUrl, name, size = 48 }: { photoUrl?: string; name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: 'var(--bg-felt)',
        border: '2px solid var(--border-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.3,
        fontWeight: 800,
        color: 'var(--gold)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        initials
      )}
    </div>
  )
}

function CreateGroupSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (g: Group) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [friends, setFriends] = useState<ProfileSearchResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [creating, setCreating] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetchMyFriendships(user.id).then(fs => {
      setFriends(fs.filter(f => f.status === 'accepted').map(f => f.otherProfile))
      setLoadingFriends(false)
    })
  }, [user])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleCreate = async () => {
    if (!name.trim() || !user) return
    setCreating(true)
    const group = await createGroupDB(name.trim(), user.id, Array.from(selectedIds))
    if (group) {
      if (photoFile) {
        const photoUrl = await uploadGroupPhoto(user.id, group.id, photoFile)
        if (photoUrl) {
          await updateGroup(group.id, { photoUrl })
          group.photoUrl = photoUrl
        }
      }
      onCreated(group)
    }
    setCreating(false)
  }

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)', borderTop: '1px solid var(--border-gold)',
          borderRadius: '16px 16px 0 0', padding: '20px 16px 40px',
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 800 }}>Nouveau groupe</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 'auto' }}>✕</button>
        </div>

        {/* Name + Photo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 60, height: 60, borderRadius: 12, overflow: 'hidden',
              background: 'var(--bg-felt)', border: '2px solid var(--border-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>📷</span>
            )}
          </div>
          <input
            className="input"
            placeholder="Nom du groupe"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
            style={{ flex: 1 }}
          />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

        {/* Friends */}
        <div className="section-title">Membres à ajouter</div>
        {loadingFriends ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '8px 0' }}>Chargement…</p>
        ) : friends.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '8px 0' }}>
            Aucun ami disponible. Ajoute des amis dans Profil.
          </p>
        ) : (
          friends.map(friend => {
            const selected = selectedIds.has(friend.id)
            return (
              <div
                key={friend.id}
                className={`player-item checkbox-player${selected ? ' selected' : ''}`}
                onClick={() => toggle(friend.id)}
              >
                <div
                  className="player-avatar"
                  style={friend.photoUrl ? { backgroundImage: `url(${friend.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!friend.photoUrl && friend.pseudo.slice(0, 2).toUpperCase()}
                </div>
                <span className="player-name">{friend.pseudo}</span>
                <div className="checkmark">{selected ? '✓' : ''}</div>
              </div>
            )
          })
        )}

        <button
          className="btn btn-gold"
          style={{ marginTop: 20 }}
          onClick={handleCreate}
          disabled={!name.trim() || creating}
        >
          {creating ? 'Création…' : '♠ Créer le groupe'}
        </button>
      </div>
    </div>
  )
}

export default function Groups() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const data = await fetchMyGroups(user.id)
    setGroups(data)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>Mes groupes</h1>
        <button
          className="header-action-btn"
          onClick={() => setShowCreate(true)}
          aria-label="Créer un groupe"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
        </button>
      </div>

      <div className="page">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingTop: 16 }}>Chargement…</p>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>Aucun groupe pour l'instant.</p>
            <button
              className="btn btn-gold"
              style={{ marginTop: 12, width: 'auto', padding: '10px 24px' }}
              onClick={() => setShowCreate(true)}
            >
              Créer un groupe
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map(group => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <GroupAvatar photoUrl={group.photoUrl} name={group.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Créé le {new Date(group.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupSheet
          onClose={() => setShowCreate(false)}
          onCreated={group => {
            setGroups(prev => [group, ...prev])
            setShowCreate(false)
            navigate(`/groups/${group.id}`)
          }}
        />
      )}
    </div>
  )
}
