import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyFriendships, fetchAllFriendsStats } from '../lib/supabase'
import type { FriendGlobalStats } from '../lib/supabase'
import type { PlayerStats, ProfileSearchResult } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab     = 'parties' | 'amis'
type SortKey     = 'netResult' | 'wins' | 'totalGames' | 'totalRebuys'
type FriendSort  = 'netResult' | 'wins' | 'totalGames'

interface FriendRow {
  profile: ProfileSearchResult
  stats: FriendGlobalStats
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

const rankClass = (i: number) => {
  if (i === 0) return 'rank-number rank-1'
  if (i === 1) return 'rank-number rank-2'
  if (i === 2) return 'rank-number rank-3'
  return 'rank-number rank-other'
}

// ─── PlayerRankRow (Mes parties) ─────────────────────────────────────────────

function PlayerRankRow({
  stats, rank, rankCls, sortBy,
}: {
  stats: PlayerStats
  rank: number
  rankCls: string
  sortBy: SortKey
}) {
  const [expanded, setExpanded] = useState(false)
  const netColor = stats.netResult > 0 ? 'var(--green)' : stats.netResult < 0 ? 'var(--red)' : 'var(--gold)'
  const winRate  = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0

  const hi = (val: number | string, color: string) => (
    <span style={{ fontWeight: 800, color }}>{val}</span>
  )

  return (
    <div>
      <div
        className="rank-item"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', borderColor: expanded ? 'var(--border-gold)' : undefined }}
      >
        <div className={rankCls}>{rank}</div>
        <div
          className="player-avatar"
          style={{
            width: 36, height: 36, fontSize: '0.85rem',
            borderColor: rank === 1 ? 'var(--gold)' : 'var(--border)',
            backgroundImage: stats.player.photoUrl ? `url(${stats.player.photoUrl})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        >
          {!stats.player.photoUrl && getInitials(stats.player.name)}
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
        <div className="card" style={{
          marginTop: -4, marginBottom: 8,
          borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
        }}>
          {[
            ['Gain net',       `${stats.netResult > 0 ? '+' : ''}${stats.netResult.toFixed(2)}€`, netColor],
            ['Taux victoire',  `${winRate}%`,                                                      'var(--gold)'],
            ['2e places',      stats.seconds,                                                      'var(--text)'],
            ['Total recaves',  stats.totalRebuys, stats.totalRebuys > 5 ? 'var(--red)' : 'var(--text)'],
            ['Total engagé',   `${stats.totalEngaged.toFixed(2)}€`,                               'var(--text)'],
            ['Parties jouées', stats.totalGames,                                                   'var(--text)'],
          ].map(([label, value, color]) => (
            <div key={String(label)}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {label}
              </div>
              {hi(value as string | number, color as string)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FriendRankRow (Mes amis) ─────────────────────────────────────────────────

function FriendRankRow({
  row, rank, rankCls,
}: {
  row: FriendRow
  rank: number
  rankCls: string
}) {
  const [expanded, setExpanded] = useState(false)
  const { profile, stats } = row
  const netColor = stats.netResult > 0 ? 'var(--green)' : stats.netResult < 0 ? 'var(--red)' : 'var(--gold)'

  return (
    <div>
      <div
        className="rank-item"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', borderColor: expanded ? 'var(--border-gold)' : undefined }}
      >
        <div className={rankCls}>{rank}</div>
        <div
          className="player-avatar"
          style={{
            width: 36, height: 36, fontSize: '0.85rem',
            borderColor: rank === 1 ? 'var(--gold)' : 'var(--border)',
            backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        >
          {!profile.photoUrl && getInitials(profile.pseudo)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{profile.pseudo}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {stats.totalGames} partie{stats.totalGames > 1 ? 's' : ''} · {stats.wins} victoire{stats.wins > 1 ? 's' : ''} · {stats.winRate}%
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: netColor, fontSize: '1rem' }}>
            {stats.netResult > 0 ? '+' : ''}{stats.netResult.toFixed(2)}€
          </div>
        </div>
      </div>

      {expanded && (
        <div className="card" style={{
          marginTop: -4, marginBottom: 8,
          borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
        }}>
          {[
            ['Gain net',        `${stats.netResult > 0 ? '+' : ''}${stats.netResult.toFixed(2)}€`, netColor],
            ['Taux victoire',   `${stats.winRate}%`,                                                'var(--gold)'],
            ['Victoires',       stats.wins,                                                         'var(--text)'],
            ['2e places',       stats.seconds,                                                      'var(--text)'],
            ['Défaites',        stats.losses,                                                       stats.losses > 5 ? 'var(--red)' : 'var(--text)'],
            ['Parties jouées',  stats.totalGames,                                                   'var(--text)'],
            ['Meilleur résultat', stats.bestWin > 0 ? `+${stats.bestWin.toFixed(2)}€` : `${stats.bestWin.toFixed(2)}€`,
              stats.bestWin > 0 ? 'var(--green)' : 'var(--text-muted)'],
            ['Pire résultat',   `${stats.worstLoss.toFixed(2)}€`,
              stats.worstLoss < 0 ? 'var(--red)' : 'var(--text-muted)'],
          ].map(([label, value, color]) => (
            <div key={String(label)}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {label}
              </div>
              <span style={{ fontWeight: 800, color: color as string }}>{value as string | number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Rankings() {
  const { getPlayerStats } = useStore()
  const { user } = useAuth()

  // ── Onglet actif ────────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>('parties')

  // ── Mes parties ─────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>('netResult')

  const myStats = getPlayerStats()
    .filter(s => s.totalGames > 0)
    .sort((a, b) => {
      if (sortBy === 'netResult')   return b.netResult   - a.netResult
      if (sortBy === 'wins')        return b.wins        - a.wins
      if (sortBy === 'totalGames')  return b.totalGames  - a.totalGames
      if (sortBy === 'totalRebuys') return b.totalRebuys - a.totalRebuys
      return 0
    })

  const noGamesPlayers = getPlayerStats().filter(s => s.totalGames === 0)

  // ── Mes amis ─────────────────────────────────────────────────────────────────
  const [friendRows,  setFriendRows]  = useState<FriendRow[]>([])
  const [friendLoaded, setFriendLoaded] = useState(false)
  const [friendLoading, setFriendLoading] = useState(false)
  const [friendSort, setFriendSort] = useState<FriendSort>('netResult')

  useEffect(() => {
    if (mainTab !== 'amis' || !user || friendLoaded) return
    setFriendLoading(true)
    Promise.all([
      fetchMyFriendships(user.id),
      fetchAllFriendsStats(),
    ]).then(([friendships, allStats]) => {
      const accepted = friendships.filter(f => f.status === 'accepted')
      const statsMap  = new Map(allStats.map(s => [s.friendId, s]))
      const rows: FriendRow[] = accepted
        .flatMap(f => {
          const stats = statsMap.get(f.otherProfile.id)
          return stats ? [{ profile: f.otherProfile, stats }] : []
        })
      setFriendRows(rows)
      setFriendLoaded(true)
      setFriendLoading(false)
    }).catch(() => setFriendLoading(false))
  }, [mainTab, user, friendLoaded])

  const sortedFriends = [...friendRows].sort((a, b) => {
    if (friendSort === 'netResult')  return b.stats.netResult  - a.stats.netResult
    if (friendSort === 'wins')       return b.stats.wins       - a.stats.wins
    if (friendSort === 'totalGames') return b.stats.totalGames - a.stats.totalGames
    return 0
  })

  // ── Boutons de tri ───────────────────────────────────────────────────────────
  const SortBtn = ({ label, val }: { label: string; val: SortKey }) => (
    <button
      className={`btn btn-sm ${sortBy === val ? 'btn-gold' : 'btn-ghost'}`}
      style={{ width: 'auto', fontSize: '0.75rem', padding: '6px 12px' }}
      onClick={() => setSortBy(val)}
    >
      {label}
    </button>
  )

  const FriendSortBtn = ({ label, val }: { label: string; val: FriendSort }) => (
    <button
      className={`btn btn-sm ${friendSort === val ? 'btn-gold' : 'btn-ghost'}`}
      style={{ width: 'auto', fontSize: '0.75rem', padding: '6px 12px' }}
      onClick={() => setFriendSort(val)}
    >
      {label}
    </button>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="header">
        <h1>♠ Classement</h1>
      </div>

      {/* ── Onglets principaux ─────────────────────────────────────────────── */}
      <div className="page-tabs">
        <button
          className={`page-tab${mainTab === 'parties' ? ' active' : ''}`}
          onClick={() => setMainTab('parties')}
        >
          Mes parties
        </button>
        <button
          className={`page-tab${mainTab === 'amis' ? ' active' : ''}`}
          onClick={() => setMainTab('amis')}
        >
          Mes amis
        </button>
      </div>

      <div className="page">

        {/* ══ TAB : MES PARTIES ═════════════════════════════════════════════ */}
        {mainTab === 'parties' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
              <SortBtn label="Gains nets"  val="netResult"   />
              <SortBtn label="Victoires"   val="wins"        />
              <SortBtn label="Parties"     val="totalGames"  />
              <SortBtn label="Recaves"     val="totalRebuys" />
            </div>

            {myStats.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🏆</div>
                <p>Aucune partie terminée. Jouez d'abord une partie.</p>
              </div>
            ) : (
              myStats.map((s, i) => (
                <PlayerRankRow
                  key={s.player.id}
                  stats={s}
                  rank={i + 1}
                  rankCls={rankClass(i)}
                  sortBy={sortBy}
                />
              ))
            )}

            {noGamesPlayers.length > 0 && myStats.length > 0 && (
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
          </>
        )}

        {/* ══ TAB : MES AMIS ════════════════════════════════════════════════ */}
        {mainTab === 'amis' && (
          <>
            {friendLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                Chargement des stats…
              </div>
            ) : sortedFriends.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 24 }}>
                <div className="icon">👥</div>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>
                  {friendLoaded ? 'Aucun ami n\'a encore joué de partie.' : 'Aucun ami pour l\'instant.'}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Les statistiques globales de tes amis apparaîtront ici.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
                  <FriendSortBtn label="Gains nets" val="netResult"  />
                  <FriendSortBtn label="Victoires"  val="wins"       />
                  <FriendSortBtn label="Parties"    val="totalGames" />
                </div>

                <div
                  className="alert"
                  style={{
                    marginBottom: 16, fontSize: '0.75rem', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 12px',
                  }}
                >
                  Stats globales de tes amis acceptés — toutes leurs parties confondues.
                </div>

                {sortedFriends.map((row, i) => (
                  <FriendRankRow
                    key={row.profile.id}
                    row={row}
                    rank={i + 1}
                    rankCls={rankClass(i)}
                  />
                ))}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
