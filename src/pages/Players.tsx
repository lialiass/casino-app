import { useState, useRef } from 'react'
import { useStore } from '../store'
import { hasSupabase } from '../lib/supabase'

export default function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer, resetPlayers, uploadPlayerPhoto, games } = useStore()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [photoModal, setPhotoModal] = useState<string | null>(null) // playerId
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null) // playerId en cours de suppression
  const [resetting, setResetting] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    addPlayer(name)
    setNewName('')
  }

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

  const handleResetPlayers = async () => {
    if (!confirm('Supprimer tous les joueurs ? Cette action est irréversible.')) return
    setResetting(true)
    await resetPlayers()
    setResetting(false)
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
        {/* Add player */}
        <div className="section-title" style={{ marginTop: 8 }}>Ajouter un joueur</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            className="input"
            placeholder="Nom du joueur..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            maxLength={20}
          />
          <button
            className="btn btn-gold"
            style={{ width: 'auto', padding: '12px 18px', flexShrink: 0 }}
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            +
          </button>
        </div>

        {/* Player list */}
        <div className="section-title">Joueurs ({players.length})</div>

        {players.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <p>Aucun joueur. Ajoutez-en ci-dessus.</p>
          </div>
        ) : (
          players.map(player => (
            <div key={player.id} className="player-item">
              {/* Avatar with optional photo */}
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
                title={hasSupabase ? 'Changer la photo' : undefined}
              >
                {!player.photoUrl && getInitials(player.name)}
                {hasSupabase && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0)', fontSize: 10,
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                  >
                  </div>
                )}
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
          ))
        )}
        {/* Reset all players */}
        {players.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--red)', borderColor: '#ef444440' }}
              onClick={handleResetPlayers}
              disabled={resetting}
            >
              {resetting ? 'Suppression…' : '🗑️ Réinitialiser tous les joueurs'}
            </button>
          </div>
        )}
      </div>

      {/* Photo modal */}
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
                {/* Aperçu de la photo existante, plein cadre */}
                {players.find(p => p.id === photoModal)?.photoUrl && (
                  <div style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 4,
                    background: 'var(--bg)',
                  }}>
                    <img
                      src={players.find(p => p.id === photoModal)!.photoUrl}
                      alt="Photo du joueur"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: 'block',
                      }}
                    />
                  </div>
                )}
                <button
                  className="btn btn-gold"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📷 Prendre une photo
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => galleryInputRef.current?.click()}
                >
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
                <button className="btn btn-ghost" onClick={() => setPhotoModal(null)}>
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handlePhotoFile(e.target.files?.[0])}
        onClick={e => { (e.target as HTMLInputElement).value = '' }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handlePhotoFile(e.target.files?.[0])}
        onClick={e => { (e.target as HTMLInputElement).value = '' }}
      />
    </div>
  )
}
