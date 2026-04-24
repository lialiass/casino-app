import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchGroupById,
  fetchGroupMembers,
  fetchMyFriendships,
  addGroupMember,
  removeGroupMember,
  updateGroup,
  deleteGroup,
  uploadGroupPhoto,
} from '../lib/supabase'
import type { Group, GroupMember, ProfileSearchResult, Game } from '../types'

type Tab = 'apercu' | 'parties' | 'membres'

function GroupAvatar({ photoUrl, name, size = 72 }: { photoUrl?: string; name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 16,
        background: 'var(--bg-felt)', border: '2px solid var(--border-gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.28, fontWeight: 800, color: 'var(--gold)',
        flexShrink: 0, overflow: 'hidden',
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

function MiniAvatar({ photoUrl, pseudo, size = 36 }: { photoUrl?: string; pseudo: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--bg-felt)', border: '2px solid var(--border-gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: 'var(--gold)',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {photoUrl ? (
        <img src={photoUrl} alt={pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        pseudo.slice(0, 2).toUpperCase()
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ── Add member sheet ──────────────────────────────────────────────────────
function AddMemberSheet({
  groupId,
  existingUserIds,
  onClose,
  onAdded,
}: {
  groupId: string
  existingUserIds: Set<string>
  onClose: () => void
  onAdded: () => void
}) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<ProfileSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchMyFriendships(user.id).then(fs => {
      const available = fs
        .filter(f => f.status === 'accepted' && !existingUserIds.has(f.otherProfile.id))
        .map(f => f.otherProfile)
      setFriends(available)
      setLoading(false)
    })
  }, [user, existingUserIds])

  const handleAdd = async (friendId: string) => {
    setBusy(friendId)
    await addGroupMember(groupId, friendId)
    onAdded()
    setBusy(null)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderTop: '1px solid var(--border-gold)',
        borderRadius: '16px 16px 0 0', padding: '20px 16px 40px',
        width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 800 }}>Ajouter un membre</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 'auto' }}>✕</button>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement…</p>
        ) : friends.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Tous tes amis sont déjà dans ce groupe.
          </p>
        ) : (
          friends.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MiniAvatar photoUrl={f.photoUrl} pseudo={f.pseudo} />
              <span style={{ flex: 1, fontWeight: 600 }}>{f.pseudo}</span>
              <button
                className="btn btn-gold btn-sm"
                disabled={busy === f.id}
                onClick={() => handleAdd(f.id)}
              >
                {busy === f.id ? '…' : 'Ajouter'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Edit group sheet ──────────────────────────────────────────────────────
function EditGroupSheet({
  group,
  onClose,
  onSaved,
}: {
  group: Group
  onClose: () => void
  onSaved: (updated: Group) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState(group.name)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(group.photoUrl ?? null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!name.trim() || !user) return
    setSaving(true)
    let photoUrl = group.photoUrl
    if (photoFile) {
      const uploaded = await uploadGroupPhoto(user.id, group.id, photoFile)
      if (uploaded) photoUrl = uploaded
    }
    await updateGroup(group.id, { name: name.trim(), photoUrl })
    onSaved({ ...group, name: name.trim(), photoUrl })
    setSaving(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderTop: '1px solid var(--border-gold)',
        borderRadius: '16px 16px 0 0', padding: '20px 16px 40px',
        width: '100%', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 800 }}>Modifier le groupe</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 'auto' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-felt)', border: '2px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>📷</span>
            )}
          </div>
          <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} style={{ flex: 1 }} autoFocus />
        </div>
        <input
          ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
            e.target.value = ''
          }}
        />
        <button className="btn btn-gold" onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { games, getPlayerById } = useStore()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('apercu')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isOwner = group?.ownerId === user?.id

  const load = useCallback(async () => {
    if (!id) return
    const [groupData, membersData] = await Promise.all([
      fetchGroupById(id),
      fetchGroupMembers(id),
    ])
    setGroup(groupData)
    setMembers(membersData)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Group games from store (filtered)
  const groupGames = games.filter(g => g.groupId === id)
  const finishedGames = [...groupGames.filter(g => g.status === 'finished')]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const activeGroupGame = groupGames.find(g => g.status === 'in_progress')

  // Profile map for quick lookup
  const profileMap = new Map<string, ProfileSearchResult>()
  for (const m of members) profileMap.set(m.userId, m.profile)

  // Stats per member
  const memberStats = members.map(member => {
    const mGames = finishedGames.filter(g => g.players.some(p => p.playerId === member.userId))
    let netResult = 0, wins = 0
    for (const game of mGames) {
      const result = game.results?.find(r => r.playerId === member.userId)
      if (result) {
        netResult += result.netResult
        if (result.rank === 'winner' || result.rank === 'shared') wins++
      }
    }
    return { ...member, netResult, wins, totalGames: mGames.length }
  }).sort((a, b) => b.netResult - a.netResult)

  const totalPot = finishedGames.reduce((sum, g) => sum + (g.pot ?? 0), 0)
  const lastGame = finishedGames[0]
  const lastWinnerId = lastGame?.winnerId
  const lastWinnerName = lastWinnerId
    ? (profileMap.get(lastWinnerId)?.pseudo ?? getPlayerById(lastWinnerId)?.name ?? '?')
    : lastGame?.sharedWin ? 'Partage' : null

  const handleRemoveMember = async (userId: string) => {
    if (!id || !confirm('Retirer ce membre du groupe ?')) return
    setRemovingId(userId)
    await removeGroupMember(id, userId)
    await load()
    setRemovingId(null)
  }

  const handleDeleteGroup = async () => {
    if (!id || !confirm(`Supprimer le groupe "${group?.name}" ? Cette action est irréversible.`)) return
    setDeleting(true)
    await deleteGroup(id)
    navigate('/groups', { replace: true })
  }

  const rankColor = (i: number) => i === 0 ? 'var(--gold)' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text-muted)'
  const netColor = (n: number) => n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--gold)'

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: 32 }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Chargement…</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="page" style={{ paddingTop: 32 }}>
        <div className="empty-state">
          <div className="icon">❌</div>
          <p>Groupe introuvable.</p>
          <button className="btn btn-outline" style={{ marginTop: 16, width: 'auto' }} onClick={() => navigate('/groups')}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div className="header">
        <button className="header-back" onClick={() => navigate('/groups')}>←</button>
        <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</h1>
        {isOwner && (
          <button className="header-action-btn" onClick={() => setShowEdit(true)} aria-label="Modifier">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
        )}
      </div>

      {/* Group identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0', maxWidth: 480, margin: '0 auto' }}>
        <GroupAvatar photoUrl={group.photoUrl} name={group.name} size={80} />
        <h2 style={{ marginTop: 12, fontSize: '1.3rem', fontWeight: 800, textAlign: 'center' }}>{group.name}</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {members.length} membre{members.length > 1 ? 's' : ''} · {finishedGames.length} partie{finishedGames.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="page-tabs" style={{ marginTop: 16 }}>
        <button className={`page-tab${tab === 'apercu' ? ' active' : ''}`} onClick={() => setTab('apercu')}>Aperçu</button>
        <button className={`page-tab${tab === 'parties' ? ' active' : ''}`} onClick={() => setTab('parties')}>
          Parties {finishedGames.length > 0 && <span className="friends-badge">{finishedGames.length}</span>}
        </button>
        <button className={`page-tab${tab === 'membres' ? ' active' : ''}`} onClick={() => setTab('membres')}>
          Membres {members.length > 0 && <span className="friends-badge">{members.length}</span>}
        </button>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* ── TAB APERÇU ─────────────────────────────────────── */}
        {tab === 'apercu' && (
          <>
            {/* CTA nouvelle partie */}
            <button
              className={`btn ${activeGroupGame ? 'btn-outline' : 'btn-gold'}`}
              style={{ marginBottom: 20 }}
              onClick={() => activeGroupGame
                ? navigate(`/game/${activeGroupGame.id}`)
                : navigate(`/new-game?group=${id}`)
              }
            >
              {activeGroupGame ? '▶ Continuer la partie en cours' : '♠ Nouvelle partie'}
            </button>

            {/* Summary stats */}
            {finishedGames.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg)', borderRadius: 8 }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{finishedGames.length}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Parties</p>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg)', borderRadius: 8 }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{totalPot.toFixed(0)}€</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Pot total</p>
                  </div>
                  {lastGame && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg)', borderRadius: 8 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{formatDateShort(lastGame.date)}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Dernière</p>
                    </div>
                  )}
                </div>
                {lastWinnerName && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dernier gagnant</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)' }}>🥇 {lastWinnerName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Rankings */}
            {memberStats.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Classement du groupe
                </p>
                {memberStats.map((ms, i) => (
                  <div key={ms.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ width: 20, fontWeight: 800, fontSize: '0.85rem', color: rankColor(i), textAlign: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <MiniAvatar photoUrl={ms.profile.photoUrl} pseudo={ms.profile.pseudo} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ms.profile.pseudo}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {ms.totalGames} partie{ms.totalGames > 1 ? 's' : ''} · {ms.wins} victoire{ms.wins > 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: netColor(ms.netResult), flexShrink: 0 }}>
                      {ms.netResult > 0 ? '+' : ''}{ms.netResult.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            )}

            {finishedGames.length === 0 && (
              <div className="empty-state" style={{ marginTop: 8 }}>
                <div className="icon">🎲</div>
                <p>Aucune partie jouée dans ce groupe.</p>
              </div>
            )}
          </>
        )}

        {/* ── TAB PARTIES ────────────────────────────────────── */}
        {tab === 'parties' && (
          <>
            {finishedGames.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <p>Aucune partie terminée.</p>
              </div>
            ) : (
              finishedGames.map(game => {
                const winnerProfile = game.winnerId
                  ? (profileMap.get(game.winnerId) ?? { pseudo: getPlayerById(game.winnerId)?.name ?? '?', photoUrl: undefined })
                  : null
                const totalRebuys = game.players.reduce((s, p) => s + p.rebuys, 0)
                return (
                  <div
                    key={game.id}
                    className="history-item"
                    onClick={() => navigate(`/results/${game.id}`)}
                  >
                    <div className="row" style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{formatDate(game.date)}</div>
                      <div style={{ color: 'var(--gold)', fontWeight: 800 }}>{(game.pot ?? 0).toFixed(2)}€</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {game.sharedWin ? (
                        <span className="badge badge-green">🤝 Partage</span>
                      ) : winnerProfile ? (
                        <span className="badge badge-green">🥇 {winnerProfile.pseudo}</span>
                      ) : null}
                      <span className="badge badge-gray">{game.players.length} joueurs</span>
                      <span className="badge badge-gray">Mise {game.buyIn}€</span>
                      {totalRebuys > 0 && (
                        <span className="badge badge-gold">{totalRebuys} recave{totalRebuys > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ── TAB MEMBRES ────────────────────────────────────── */}
        {tab === 'membres' && (
          <>
            {members.map(member => (
              <div key={member.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <MiniAvatar photoUrl={member.profile.photoUrl} pseudo={member.profile.pseudo} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.profile.pseudo}
                    {member.userId === user?.id && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}> (moi)</span>}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: member.role === 'owner' ? 'var(--gold)' : 'var(--bg)',
                  color: member.role === 'owner' ? '#080c14' : 'var(--text-muted)',
                  border: member.role === 'owner' ? 'none' : '1px solid var(--border)',
                  flexShrink: 0,
                }}>
                  {member.role === 'owner' ? '👑 Propriétaire' : 'Membre'}
                </span>
                {isOwner && member.userId !== user?.id && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: '#ef444440', flexShrink: 0 }}
                    disabled={removingId === member.userId}
                    onClick={() => handleRemoveMember(member.userId)}
                  >
                    {removingId === member.userId ? '…' : 'Retirer'}
                  </button>
                )}
              </div>
            ))}

            {isOwner && (
              <button
                className="btn btn-outline"
                style={{ marginTop: 12 }}
                onClick={() => setShowAddMember(true)}
              >
                + Ajouter un membre
              </button>
            )}

            {isOwner && (
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--red)', borderColor: '#ef444440' }}
                  onClick={handleDeleteGroup}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression…' : '🗑️ Supprimer le groupe'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showAddMember && id && (
        <AddMemberSheet
          groupId={id}
          existingUserIds={new Set(members.map(m => m.userId))}
          onClose={() => setShowAddMember(false)}
          onAdded={async () => { await load(); setShowAddMember(false) }}
        />
      )}

      {showEdit && (
        <EditGroupSheet
          group={group}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { setGroup(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}
