import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyFriendships, fetchGroupById, fetchGroupMembers } from '../lib/supabase'
import type { ProfileSearchResult } from '../types'

function PlayerCheckbox({
  profile,
  selected,
  locked,
  onToggle,
}: {
  profile: ProfileSearchResult
  selected: boolean
  locked?: boolean
  onToggle: () => void
}) {
  const initials = profile.pseudo.slice(0, 2).toUpperCase()
  return (
    <div
      className={`player-item checkbox-player${selected ? ' selected' : ''}`}
      onClick={locked ? undefined : onToggle}
      style={{ cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.85 : 1 }}
    >
      <div
        className="player-avatar"
        style={
          profile.photoUrl
            ? { backgroundImage: `url(${profile.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {!profile.photoUrl && initials}
      </div>
      <span className="player-name">{profile.pseudo}{locked ? ' (moi)' : ''}</span>
      <div className="checkmark">{selected ? '✓' : ''}</div>
    </div>
  )
}

export default function NewGame() {
  const { ensureUserPlayer, createGame } = useStore()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group') ?? undefined

  const [participants, setParticipants] = useState<ProfileSearchResult[]>([])
  const [groupName, setGroupName] = useState<string | null>(null)
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [buyIn, setBuyIn] = useState('5')
  const [starting, setStarting] = useState(false)

  // Load either group members or friends
  useEffect(() => {
    if (!user) return
    if (groupId) {
      Promise.all([fetchGroupById(groupId), fetchGroupMembers(groupId)]).then(([group, members]) => {
        setGroupName(group?.name ?? null)
        const profiles = members
          .filter(m => m.userId !== user.id)
          .map(m => m.profile)
        setParticipants(profiles)
        // Pre-select everyone in the group
        setSelectedIds(new Set([user.id, ...members.map(m => m.userId)]))
        setLoadingParticipants(false)
      })
    } else {
      fetchMyFriendships(user.id).then(friendships => {
        const accepted = friendships.filter(f => f.status === 'accepted').map(f => f.otherProfile)
        setParticipants(accepted)
        setSelectedIds(new Set([user.id]))
        setLoadingParticipants(false)
      })
    }
  }, [user, groupId])

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStart = async () => {
    const buyInVal = parseFloat(buyIn)
    if (isNaN(buyInVal) || buyInVal <= 0) return
    if (selectedIds.size < 2) return
    setStarting(true)

    if (user && profile) {
      await ensureUserPlayer({ id: user.id, pseudo: profile.pseudo ?? 'Moi', photoUrl: profile.photoUrl })
    }
    for (const p of participants.filter(f => selectedIds.has(f.id))) {
      await ensureUserPlayer(p)
    }

    const game = await createGame(Array.from(selectedIds), buyInVal, groupId)
    navigate(`/game/${game.id}`)
  }

  const myProfile: ProfileSearchResult | null = user && profile
    ? { id: user.id, pseudo: profile.pseudo ?? 'Moi', photoUrl: profile.photoUrl }
    : null

  const buyInVal = parseFloat(buyIn) || 0
  const friendCount = selectedIds.size - 1

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        {groupId && <button className="header-back" onClick={() => navigate(`/groups/${groupId}`)}>←</button>}
        <h1>{groupName ? `♠ ${groupName}` : '♠ Nouvelle partie'}</h1>
      </div>

      <div className="page">
        {/* Buy-in */}
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Mise de départ (€)</label>
          <input
            className="input"
            type="number"
            value={buyIn}
            onChange={e => setBuyIn(e.target.value)}
            min="0.5"
            step="0.5"
            placeholder="5"
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Chaque recave coûte également {buyIn || '?'}€
          </div>
        </div>

        {/* Myself */}
        {myProfile && (
          <>
            <div className="section-title">Moi</div>
            <PlayerCheckbox profile={myProfile} selected locked onToggle={() => {}} />
          </>
        )}

        {/* Participants */}
        <div className="section-title" style={{ marginTop: 16 }}>
          {groupId ? 'Membres du groupe' : 'Mes amis'} ({friendCount} / {participants.length} sélectionnés)
        </div>

        {loadingParticipants ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px 0' }}>Chargement…</p>
        ) : participants.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 8 }}>
            <div className="icon">👥</div>
            <p>{groupId ? 'Ce groupe n\'a pas encore d\'autres membres.' : 'Aucun ami pour l\'instant.'}</p>
            {!groupId && (
              <Link
                to="/profile"
                className="btn btn-gold"
                style={{ marginTop: 12, textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '10px 20px' }}
              >
                Ajouter des amis
              </Link>
            )}
          </div>
        ) : (
          participants.map(p => (
            <PlayerCheckbox
              key={p.id}
              profile={p}
              selected={selectedIds.has(p.id)}
              onToggle={() => toggleParticipant(p.id)}
            />
          ))
        )}

        {/* Preview */}
        {selectedIds.size >= 2 && (
          <div className="card card-gold" style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Aperçu</div>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Joueurs</span>
              <span style={{ fontWeight: 700 }}>{selectedIds.size}</span>
            </div>
            <div className="row">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pot de départ</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{(selectedIds.size * buyInVal).toFixed(2)}€</span>
            </div>
          </div>
        )}

        {/* Start */}
        <div style={{ marginTop: 20 }}>
          <button
            className="btn btn-gold"
            onClick={handleStart}
            disabled={starting || selectedIds.size < 2 || !buyIn || buyInVal <= 0}
          >
            {starting ? 'Démarrage…' : '♠ Lancer la partie'}
          </button>
          {selectedIds.size < 2 && participants.length > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
              Sélectionnez au moins un participant
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
