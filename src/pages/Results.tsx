import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { GameResult } from '../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function computeSettlements(results: GameResult[], getPlayerById: (id: string) => any) {
  // Who owes whom
  // Winners have positive net, losers have negative net
  // The winner gets paid by losers, second place breaks even
  const settlements: { from: string; to: string; amount: number }[] = []

  const debtors = results
    .filter(r => r.netResult < 0)
    .map(r => ({ playerId: r.playerId, amount: Math.abs(r.netResult) }))

  const creditors = results
    .filter(r => r.netResult > 0)
    .map(r => ({ playerId: r.playerId, amount: r.netResult }))

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]
    const amount = Math.min(d.amount, c.amount)

    if (amount > 0.01) {
      settlements.push({ from: d.playerId, to: c.playerId, amount })
    }

    d.amount -= amount
    c.amount -= amount

    if (d.amount < 0.01) i++
    if (c.amount < 0.01) j++
  }

  return settlements
}

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const { getGameById, getPlayerById } = useStore()
  const navigate = useNavigate()

  const game = getGameById(id!)

  if (!game || game.status !== 'finished' || !game.results) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">❌</div>
          <p>Résultats introuvables.</p>
          <button className="btn btn-outline" style={{ marginTop: 16, width: 'auto' }} onClick={() => navigate('/')}>
            Accueil
          </button>
        </div>
      </div>
    )
  }

  const sortedResults = [...game.results].sort((a, b) => b.netResult - a.netResult)
  const settlements = computeSettlements(game.results, getPlayerById)

  const rankEmoji = (rank: GameResult['rank']) => {
    if (rank === 'winner') return '🥇'
    if (rank === 'second') return '🥈'
    return '❌'
  }

  const rankClass = (rank: GameResult['rank']) => {
    if (rank === 'winner') return 'result-card winner'
    if (rank === 'second') return 'result-card second'
    return 'result-card other'
  }

  const amountClass = (net: number) => {
    if (net > 0) return 'result-amount positive'
    if (net === 0) return 'result-amount zero'
    return 'result-amount negative'
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 20 }}>
      <div className="header">
        <button className="header-back" onClick={() => navigate('/')}>←</button>
        <h1>Résultats</h1>
      </div>

      <div className="page">
        {/* Summary */}
        <div className="pot-display">
          <div className="pot-label">🏆 Partie terminée</div>
          <div className="pot-amount">{(game.pot || 0).toFixed(2)}€</div>
          <div className="pot-sub">{formatDate(game.date)} · {game.players.length} joueurs · Mise {game.buyIn}€</div>
        </div>

        {/* Results */}
        <div className="section-title">Résultats</div>
        {sortedResults.map(result => {
          const player = getPlayerById(result.playerId)
          if (!player) return null

          return (
            <div key={result.playerId} className={rankClass(result.rank)}>
              <div className="result-rank">{rankEmoji(result.rank)}</div>
              <div className="result-name">{player.name}</div>
              <div className={amountClass(result.netResult)}>
                {result.netResult > 0 ? '+' : ''}{result.netResult.toFixed(2)}€
              </div>
              <div className="result-detail">
                Engagé : {result.totalEngaged.toFixed(2)}€
                {result.rank === 'second' && ' · Récupère sa mise'}
              </div>
            </div>
          )
        })}

        {/* Settlements */}
        {settlements.length > 0 && (
          <>
            <div className="section-title">Règlement entre joueurs</div>
            {settlements.map((s, i) => {
              const from = getPlayerById(s.from)
              const to = getPlayerById(s.to)
              return (
                <div key={i} className="settlement-item">
                  <span style={{ fontWeight: 700, flex: 1 }}>{from?.name}</span>
                  <span className="arrow">→</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
                    {s.amount.toFixed(2)}€
                  </span>
                  <span className="arrow">→</span>
                  <span style={{ fontWeight: 700, flex: 1, textAlign: 'right' }}>{to?.name}</span>
                </div>
              )
            })}
          </>
        )}

        <div className="divider" />

        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button className="btn btn-gold" onClick={() => navigate('/new-game')}>
            ♠ Nouvelle partie
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Accueil
          </button>
        </div>
      </div>
    </div>
  )
}
