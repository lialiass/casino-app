import { useState, useRef } from 'react'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import { hasSupabase } from '../lib/supabase'

export default function Players() {
  const { players, updatePlayer, deletePlayer, uploadPlayerPhoto, games } = useStore()
  const { user } = useAuth()
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const legacyPlayers = players.filter(p => !p.userId)
  const userPlayers = players.filter(p => !!p.userId)

  const handleEdit = (id: string, currentName: string) => {
    setEditId(id)
    setEditName(currentName)
  }

  const handleSaveEdit = () => {
    if (!editId || !editName.trim()) return
    updatePlayer(editId, editName.trim())
    setEditId(null)
    setEditName('')
  }

  const handleDelete = async (id: string) => {
    const isInGame = games.some(
      g => g.status === 'in_progress' && g.players.some(p => p.playerId === id)
    )
    if (isInGame) {
      alert('Ce joueur est dans une partie en cours.')
      return
    }
    const player = players.find(p => p.id === id)
    if (!confirm(`Supprimer ${player?.name ?? 'ce joueur'} ? Cette action est irréversible.`)) return
    setDeleting(id)
    await deletePlayer(id)
    setDeleting(null)
  }

  const handlePhotoFile = async (file: File | null | undefined) => {
    if (!file || !photoModal) return
    setUploading(true)
    try {
      const url = await uploadPlayerPhoto(photoModal, file)
      if (!url) alert('Erreur lors de l\'upload de la photo.')
    } finally {
      setUploading(false)
      setPhotoModal(null)
    }
  }

  const handleRemovePhoto = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return
    updatePlayer(playerId, player.name, '')
    setPhotoModal(null)
  }

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>♠ Joueurs</h1>
      </div>

      <div className="page">

        {/* Real user players */}
        {userPlayers.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 8 }}>Joueurs réels</div>
            {userPlayers.map(player => (
              <div key={player.id} className="player-item">
                <div
                  className="player-avatar"
                  style={{
                    backgroundImage: player.photoUrl ? `url(${player.photoUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }}
                >
                  {!player.photoUrl && getInitials(player.name)}
                </div>
                <span className="player-name">{player.name}</span>
                <span
                  className="badge"
                  style={{
                    background: player.userId === user?.id ? 'var(--gold)' : 'var(--bg-felt)',
                    color: player.userId === user?.id ? '#080c14' : 'var(--text-muted)',
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {player.userId === user?.id ? 'Moi' : 'Compte'}
                </span>
              </div>
            ))}
          </>
        )}

        {/* Legacy manual players */}
        {legacyPlayers.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: userPlayers.length > 0 ? 24 : 8 }}>
              Joueurs historiques
              <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                (anciennes parties)
              </span>
            </div>
            {legacyPlayers.map(player => (
              <div key={player.id} className="player-item">
                <div
                  className="player-avatar"
                  style={{
                    backgroundImage: player.photoUrl ? `url(${player.photoUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: hasSupabase ? 'pointer' : 'default',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                  onClick={() => hasSupabase && setPhotoModal(player.id)}
                >
                  {!player.photoUrl && getInitials(player.name)}
                </div>

                {editId === player.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') setEditId(null)
                    }}
                    autoFocus
                    maxLength={20}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <span className="player-name">{player.name}</span>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  {editId === player.id ? (
                    <>
                      <button className="btn btn-green btn-sm" onClick={handleSaveEdit}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleEdit(player.id, player.name)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ borderColor: '#ef444440', color: 'var(--red)' }}
                        onClick={() => handleDelete(player.id)}
                        disabled={deleting === player.id}
                      >
                        {deleting === player.id ? '…' : '🗑️'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {players.length === 0 && (
          <div className="empty-state" style={{ marginTop: 8 }}>
            <div className="icon">👤</div>
            <p>Aucun joueur pour l'instant.<br />Crée une partie avec tes amis pour commencer.</p>
          </div>
        )}

      </div>

      {/* Photo modal — legacy players only */}
      {photoModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000, padding: '0 16px 32px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setPhotoModal(null) }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 400,
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>
              Photo du joueur
            </div>
            {uploading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Upload en cours...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {players.find(p => p.id === photoModal)?.photoUrl && (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', marginBottom: 4, background: 'var(--bg)' }}>
                    <img
                      src={players.find(p => p.id === photoModal)!.photoUrl}
                      alt="Photo du joueur"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}
                <button className="btn btn-gold" onClick={() => cameraInputRef.current?.click()}>
                  📷 Prendre une photo
                </button>
                <button className="btn btn-outline" onClick={() => galleryInputRef.current?.click()}>
                  🖼️ Choisir dans la galerie
                </button>
                {players.find(p => p.id === photoModal)?.photoUrl && (
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--red)', borderColor: '#ef444440' }}
                    onClick={() => handleRemovePhoto(photoModal)}
                  >
                    🗑️ Supprimer la photo
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => setPhotoModal(null)}>Annuler</button>
              </div>
            )}
          </div>
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => handlePhotoFile(e.target.files?.[0])} onClick={e => { (e.target as HTMLInputElement).value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handlePhotoFile(e.target.files?.[0])} onClick={e => { (e.target as HTMLInputElement).value = '' }} />
    </div>
  )
}
