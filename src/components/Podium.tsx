import { useStore } from '../store'

const MEDALS = [
  { rank: 2, emoji: '🥈', color: '#9CA3AF', glow: 'rgba(156,163,175,0.25)', height: 52, ringAlpha: '55' },
  { rank: 1, emoji: '🥇', color: '#F59E0B', glow: 'rgba(245,158,11,0.35)', height: 72, ringAlpha: '88' },
  { rank: 3, emoji: '🥉', color: '#CD7C3A', glow: 'rgba(205,124,58,0.25)', height: 40, ringAlpha: '44' },
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
      padding: '20px 0 8px',
      borderTop: '0px solid var(--border)',
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 24,
        textAlign: 'center',
      }}>
      
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 8,
      }}>
        {ordered.map((entry, i) => {
          const medal = MEDALS[i]

          if (!entry) {
            return <div key={i} style={{ flex: 1 }} />
          }

          const isFirst = medal.rank === 1
          const avatarSize = isFirst ? 68 : 52

          return (
            <div key={entry.player.id} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}>

              {/* Avatar — clean, no overlay, no badge */}
              <div style={{
                position: 'relative',
                marginBottom: 10,
              }}>
                {/* Ambient glow */}
                <div style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${medal.glow} 0%, transparent 70%)`,
                  zIndex: 0,
                  filter: 'blur(4px)',
                }} />
                {/* Ring */}
                <div style={{
                  width: avatarSize + 8,
                  height: avatarSize + 8,
                  borderRadius: '50%',
                  border: `2px solid ${medal.color}${medal.ringAlpha}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: `0 2px 16px ${medal.glow}`,
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
                    fontSize: isFirst ? '1.3rem' : '1rem',
                    fontWeight: 800,
                    color: medal.color,
                    flexShrink: 0,
                  }}>
                    {entry.player.photoUrl ? (
                      <img
                        src={entry.player.photoUrl}
                        alt={entry.player.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                    ) : (
                      getInitials(entry.player.name)
                    )}
                  </div>
                </div>
              </div>

              {/* Glass info card — rank emoji + name + net */}
              <div style={{
                width: '100%',
                borderRadius: 10,
                padding: '8px 6px 10px',
                // background: 'rgba(255,255,255,0.04)',
                //backdropFilter: 'blur(8px)',
                //WebkitBackdropFilter: 'blur(8px)',
                // border: '1px solid rgba(255,255,255,0.08)',
                // boxShadow: '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                marginBottom: 8,
              }}>
                <div style={{ fontSize: isFirst ? '1.1rem' : '0.9rem', lineHeight: 1 }}>
                  {medal.emoji}
                </div>
                <div style={{
                  fontSize: isFirst ? '0.78rem' : '0.7rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}>
                  {entry.player.name}
                </div>
                <div style={{
                  fontSize: isFirst ? '0.82rem' : '0.72rem',
                  fontWeight: 800,
                  color: entry.netResult > 0
                    ? 'var(--green)'
                    : entry.netResult < 0
                      ? 'var(--red)'
                      : 'var(--text-muted)',
                }}>
                  {formatNet(entry.netResult)}
                </div>
              </div>

              {/* Podium step */}
              <div style={{
                width: '88%',
                height: medal.height,
                borderRadius: '6px 6px 0 0',
                background: `linear-gradient(180deg, ${medal.color}1a 0%, ${medal.color}08 100%)`,
                border: `1px solid ${medal.color}33`,
                borderBottom: 'none',
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
