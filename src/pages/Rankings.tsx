import { useState } from 'react'
import { useStore } from '../store'
import { PlayerStats } from '../types'

type SortKey = 'netResult' | 'wins' | 'totalGames' | 'totalRebuys'

export default function Rankings() {
  const { getPlayerStats } = useStore()
  const [sortBy, setSortBy] = useState<SortKey>('netResult')

  const stats = getPlayerStats()
    .filter(s => s.totalGames > 0)
    .sort((a, b) => {
      if (sortBy === 'netResult') return b.netResult - a.netResult
      if (sortBy === 'wins') return b.wins - a.wins
      if (sortBy === 'totalGames') return b.totalGames - a.totalGames
      if (sortBy === 'totalRebuys') return b.totalRebuys - a.totalRebuys
      return 0
    })

  const allStats = getPlayerStats()
  const noGamesPlayers = allStats.filter(s => s.totalGames === 0)

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  const rankClass = (i: number) => {
    if (i === 0) return 'rank-number rank-1'
    if (i === 1) return 'rank-number rank-2'
    if (i === 2) return 'rank-number rank-3'
    return 'rank-number rank-other'
  }

  const SortBtn = ({ label, val }: { label: string; val: SortKey }) => (
    <button
      className={`btn btn-sm ${sortBy === val ? 'btn-gold' : 'btn-ghost'}`}
      style={{ width: 'auto', fontSize: '0.75rem', padding: '6px 12px' }}
      onClick={() => setSortBy(val)}
    >
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>♠ Classement</h1>
      </div>

      <div className="page">
        {/* Sort */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
          <SortBtn label="Gains nets" val="netResult" />
          <SortBtn label="Victoires" val="wins" />
          <SortBtn label="Parties" val="totalGames" />
          <SortBtn label="Recaves" val="totalRebuys" />
        </div>

        {stats.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏆</div>
            <p>Aucune partie terminée. Jouez d'abord une partie.</p>
          </div>
        ) : (
          stats.map((s, i) => (
            <PlayerRankRow key={s.player.id} stats={s} rank={i + 1} rankClass={rankClass(i)} getInitials={getInitials} sortBy={sortBy} />
          ))
        )}

        {/* Players with no games */}
        {noGamesPlayers.length > 0 && stats.length > 0 && (
          <>
            <div className="divider" />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Sans parties jouées
            </div>
            {noGamesPlayers.map(s => (
              <div key={s.player.id} className="rank-item" style={{ opacity: 0.5 }}>
                <div className="rank-number rank-other">—</div>
                <div className="player-avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                  {getInitials(s.player.name)}
                </div>
                <span style={{ fontWeight: 600, flex: 1 }}>{s.player.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0 partie</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function PlayerRankRow({
  stats,
  rank,
  rankClass,
  getInitials,
  sortBy,
}: {
  stats: PlayerStats
  rank: number
  rankClass: string
  getInitials: (n: string) => string
  sortBy: string
}) {
  const [expanded, setExpanded] = useState(false)

  const highlight = (val: number | string, color: string) => (
    <span style={{ fontWeight: 800, color }}>{val}</span>
  )

  const netColor = stats.netResult > 0 ? 'var(--green)' : stats.netResult < 0 ? 'var(--red)' : 'var(--gold)'
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0

  return (
    <div>
      <div
        className="rank-item"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', borderColor: expanded ? 'var(--border-gold)' : undefined }}
      >
        <div className={rankClass}>{rank}</div>
        <div
          className="player-avatar"
          style={{
            width: 36,
            height: 36,
            fontSize: '0.85rem',
            borderColor: rank === 1 ? 'var(--gold)' : 'var(--border)',
          }}
        >
          {getInitials(stats.player.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{stats.player.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {stats.totalGames} partie{stats.totalGames > 1 ? 's' : ''} · {stats.wins} victoire{stats.wins > 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: netColor, fontSize: '1rem' }}>
            {stats.netResult > 0 ? '+' : ''}{stats.netResult.toFixed(2)}€
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="card"
          style={{
            marginTop: -4,
            marginBottom: 8,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderTop: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Gain net
            </div>
            {highlight(`${stats.netResult > 0 ? '+' : ''}${stats.netResult.toFixed(2)}€`, netColor)}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Taux de victoire
            </div>
            {highlight(`${winRate}%`, 'var(--gold)')}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              2e places
            </div>
            {highlight(stats.seconds, 'var(--text)')}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Total recaves
            </div>
            {highlight(stats.totalRebuys, stats.totalRebuys > 5 ? 'var(--red)' : 'var(--text)')}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Total engagé
            </div>
            {highlight(`${stats.totalEngaged.toFixed(2)}€`, 'var(--text)')}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Parties jouées
            </div>
            {highlight(stats.totalGames, 'var(--text)')}
          </div>
        </div>
      )}
    </div>
  )
}
