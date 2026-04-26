// Edge Function — send-push
// Envoie des notifications push APNs aux utilisateurs.
//
// Déclencheurs :
//   – Database Webhooks Supabase (friendships, game_invites, games)
//   – Appel direct depuis d'autres Edge Functions
//
// Variables d'environnement requises (Supabase Edge Function Secrets) :
//   APNS_AUTH_KEY   — contenu du fichier .p8 Apple (inclure les lignes BEGIN/END)
//   APNS_KEY_ID     — 10 caractères, ex: ABCD123456
//   APNS_TEAM_ID    — 10 caractères, ex: XY1234ABCD
//   APNS_BUNDLE_ID  — ex: fr.playpokermanager.app
//   APNS_ENV        — "sandbox" (dev/TestFlight) ou "production" (App Store)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── APNs JWT ──────────────────────────────────────────────────────────────────

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function base64url(data: string | ArrayBuffer): string {
  let b64: string
  if (typeof data === 'string') {
    b64 = btoa(data)
  } else {
    const bytes = new Uint8Array(data)
    let str = ''
    for (const b of bytes) str += String.fromCharCode(b)
    b64 = btoa(str)
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let _apnsJwt: string | null = null
let _apnsJwtTs = 0

async function getAPNsJWT(): Promise<string> {
  // Le token APNs est valide 60 min — on le régénère toutes les 55 min
  const now = Math.floor(Date.now() / 1000)
  if (_apnsJwt && now - _apnsJwtTs < 55 * 60) return _apnsJwt

  const keyId  = Deno.env.get('APNS_KEY_ID')!
  const teamId = Deno.env.get('APNS_TEAM_ID')!
  const pemKey = Deno.env.get('APNS_AUTH_KEY')!

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pemKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const header  = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now }))
  const sigInput = `${header}.${payload}`
  const enc = new TextEncoder()
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(sigInput),
  )

  _apnsJwt = `${sigInput}.${base64url(sig)}`
  _apnsJwtTs = now
  return _apnsJwt
}

// ── Envoi d'une notification via APNs ────────────────────────────────────────

async function sendAPNs(deviceToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  const bundleId = Deno.env.get('APNS_BUNDLE_ID')!
  const env      = Deno.env.get('APNS_ENV') ?? 'production'
  const host     = env === 'sandbox'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com'

  const jwt = await getAPNsJWT()

  const payload = {
    aps: { alert: { title, body }, sound: 'default', badge: 1 },
    ...data,
  }

  try {
    const resp = await fetch(`${host}/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as { reason?: string }
      console.error(`[send-push] APNs error ${resp.status}:`, err.reason)
      // Token invalide — on le supprime
      if (err.reason === 'BadDeviceToken' || err.reason === 'Unregistered') {
        return false // signal au caller de supprimer ce token
      }
    }
    return resp.ok
  } catch (e) {
    console.error('[send-push] fetch APNs error:', e)
    return false
  }
}

// ── Envoi aux users (lookup token + préférences) ──────────────────────────────

type NotifType = 'friends' | 'games' | 'results'

async function notifyUser(
  admin: ReturnType<typeof createClient>,
  targetUserId: string,
  notifType: NotifType,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  // Vérifier les préférences de l'utilisateur
  const { data: prof } = await admin
    .from('profiles')
    .select('notif_friends, notif_games, notif_results')
    .eq('id', targetUserId)
    .single()

  if (!prof) return

  const prefMap: Record<NotifType, boolean> = {
    friends: prof.notif_friends ?? true,
    games:   prof.notif_games   ?? true,
    results: prof.notif_results ?? true,
  }
  if (!prefMap[notifType]) return

  // Récupérer les tokens
  const { data: tokens } = await admin
    .from('push_tokens')
    .select('id, token')
    .eq('user_id', targetUserId)

  if (!tokens || tokens.length === 0) return

  const badTokenIds: string[] = []
  for (const { id, token } of tokens as { id: string; token: string }[]) {
    const ok = await sendAPNs(token, title, body, data)
    if (!ok) badTokenIds.push(id)
  }

  // Nettoyage des tokens invalides
  if (badTokenIds.length > 0) {
    await admin.from('push_tokens').delete().in('id', badTokenIds)
  }
}

// ── Handler principal — Webhook Supabase ─────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let webhookBody: {
    type: string
    table: string
    record: Record<string, unknown>
    old_record?: Record<string, unknown>
    schema: string
  }

  try {
    webhookBody = await req.json()
  } catch {
    return new Response('invalid body', { status: 400, headers: CORS })
  }

  const { type, table, record } = webhookBody

  try {
    // ── Amitiés ────────────────────────────────────────────────────────────
    if (table === 'friendships') {
      if (type === 'INSERT' && record.status === 'pending') {
        // Nouvelle demande d'ami → notifier l'addressee
        const requesterId = record.requester_id as string
        const addresseeId = record.addressee_id as string

        const { data: requester } = await admin
          .from('profiles').select('pseudo').eq('id', requesterId).single()
        const requesterPseudo = (requester as { pseudo: string } | null)?.pseudo ?? 'Quelqu\'un'

        await notifyUser(admin, addresseeId, 'friends',
          '👤 Nouvelle demande d\'ami',
          `${requesterPseudo} veut te rejoindre sur Poker Manager.`,
          { route: '/profile', tab: 'amis' },
        )
      }

      if (type === 'UPDATE' && record.status === 'accepted') {
        // Demande acceptée → notifier le requester
        const requesterId  = record.requester_id as string
        const addresseeId  = record.addressee_id as string

        const { data: accepter } = await admin
          .from('profiles').select('pseudo').eq('id', addresseeId).single()
        const accepterPseudo = (accepter as { pseudo: string } | null)?.pseudo ?? 'Quelqu\'un'

        await notifyUser(admin, requesterId, 'friends',
          '✅ Demande acceptée',
          `${accepterPseudo} a accepté ta demande d\'ami.`,
          { route: '/profile', tab: 'amis' },
        )
      }
    }

    // ── Invitations de partie ──────────────────────────────────────────────
    if (table === 'game_invites' && type === 'INSERT') {
      const senderId    = record.sender_id   as string
      const receiverId  = record.receiver_id as string
      const gameId      = record.game_id     as string

      // Récupérer le buy-in de la partie
      const [{ data: sender }, { data: game }] = await Promise.all([
        admin.from('profiles').select('pseudo').eq('id', senderId).single(),
        admin.from('games').select('buy_in').eq('id', gameId).single(),
      ])
      const senderPseudo = (sender as { pseudo: string } | null)?.pseudo ?? 'Quelqu\'un'
      const buyIn        = (game as { buy_in: number } | null)?.buy_in

      await notifyUser(admin, receiverId, 'games',
        '🃏 Invitation à une partie',
        buyIn
          ? `${senderPseudo} t\'invite à jouer — mise : ${buyIn}€`
          : `${senderPseudo} t\'invite à jouer.`,
        { route: '/invitations' },
      )
    }

    // ── Fin de partie ──────────────────────────────────────────────────────
    if (table === 'games' && type === 'UPDATE') {
      const oldRecord = webhookBody.old_record ?? {}
      const wasFinished = oldRecord.status === 'finished'
      const isNowFinished = record.status === 'finished'

      if (!wasFinished && isNowFinished && record.winner_id) {
        const winnerId = record.winner_id as string
        const gameId   = record.id        as string

        // Pseudo du gagnant
        const { data: winner } = await admin
          .from('profiles').select('pseudo').eq('id', winnerId).single()
        const winnerPseudo = (winner as { pseudo: string } | null)?.pseudo ?? 'Quelqu\'un'

        // Notifier TOUS les joueurs de la partie (sauf le gagnant lui-même)
        const players = (record.players as { playerId: string }[] | null) ?? []
        const recipients = players
          .map(p => p.playerId)
          .filter(id => id !== winnerId)

        await Promise.all(
          recipients.map(userId =>
            notifyUser(admin, userId, 'results',
              '🏆 Fin de partie',
              `${winnerPseudo} remporte la partie !`,
              { route: `/game/${gameId}` },
            )
          )
        )
      }
    }
  } catch (e) {
    console.error('[send-push] handler error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
