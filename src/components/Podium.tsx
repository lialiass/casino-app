import { useStore } from '../store'

const MEDALS = [
  { rank: 2, label: '2', color: '#9CA3AF', glow: 'rgba(156,163,175,0.35)', height: 52 },
  { rank: 1, label: '1', color: '#F59E0B', glow: 'rgba(245,158,11,0.45)', height: 72 },
  { rank: 3, label: '3', color: '#CD7C3A', glow: 'rgba(205,124,58,0.35)', height: 40 },
]

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function formatNet(n: number) {
  if (n === 0) return '±0€'
  return (n > 0 ? '+' : '') + n.toFixed(0) + '€'
}

export default function Podium() {
  const { getPlayerStats } = useStore()
  const stats = getPlayerStats()
    .filter(s => s.totalGames > 0)
    .sort((a, b) => b.netResult - a.netResult)
    .slice(0, 3)

  if (stats.length === 0) return null

  // Order: 2nd left, 1st center, 3rd right
  const ordered = [
    stats[1] ?? null,
    stats[0] ?? null,
    stats[2] ?? null,
  ]

  return (
    <div style={{
      marginTop: 28,
      padding: '20px 0 4px',
      borderTop: '0px solid var(--border)', // Normal si tu veux la ligne met 1
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 20,
        textAlign: 'center', // si tu veux ecire un truc ecrit avant div
      }}>
        
      </div>  

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 0,
      }}>
        {ordered.map((entry, i) => {
          const medal = MEDALS[i]
          if (!entry) {
            // Empty slot
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }} />
            )
          }

          const isFirst = medal.rank === 1
          const avatarSize = isFirst ? 64 : 50

          return (
            <div key={entry.player.id} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}>
              {/* Avatar */}
              <div style={{
                position: 'relative',
                marginBottom: 2,
              }}>
                {/* Glow ring */}
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${medal.glow} 0%, transparent 70%)`,
                  zIndex: 0,
                }} />
                {/* Border ring */}
                <div style={{
                  width: avatarSize + 6,
                  height: avatarSize + 6,
                  borderRadius: '50%',
                  border: `2px solid ${medal.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card)',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: `0 0 12px ${medal.glow}`,
                }}>
                  <div style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--bg-felt)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isFirst ? '1.2rem' : '0.95rem',
                    fontWeight: 800,
                    color: medal.color,
                    flexShrink: 0,
                  }}>
                    {entry.player.photoUrl ? (
                      <img
                        src={entry.player.photoUrl}
                        alt={entry.player.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                      />
                    ) : (
                      getInitials(entry.player.name)
                    )}
                  </div>
                </div>

                {/* Rank badge */}
                <div style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: medal.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 900,
                  color: '#000',
                  zIndex: 2,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}>
                  {medal.rank}
                </div>
              </div>

              {/* Name */}
              <div style={{
                fontSize: isFirst ? '0.8rem' : '0.72rem',
                fontWeight: 700,
                color: 'var(--text)',
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}>
                {entry.player.name}
              </div>

              {/* Net result */}
              <div style={{
                fontSize: isFirst ? '0.85rem' : '0.75rem',
                fontWeight: 800,
                color: entry.netResult > 0 ? 'var(--green)' : entry.netResult < 0 ? 'var(--red)' : 'var(--text-muted)',
              }}>
                {formatNet(entry.netResult)}
              </div>

              {/* Podium block */}
              <div style={{
                width: '80%',
                height: medal.height,
                borderRadius: '6px 6px 0 0',
                background: `linear-gradient(180deg, ${medal.color}22 0%, ${medal.color}11 100%)`,
                border: `1px solid ${medal.color}44`,
                borderBottom: 'none',
                marginTop: 4,
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
