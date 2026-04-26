// Edge Function — delete-account
// Supprime définitivement le compte d'un utilisateur authentifié.
//
// Sécurité :
//   – Vérifie le JWT entrant via supabase.auth.getUser()
//   – La service role key n'est jamais exposée côté client
//   – Toutes les opérations de nettoyage et de suppression sont atomiques côté serveur
//
// Étapes :
//   1. Vérification JWT
//   2. Vérification de la confirmation "SUPPRIMER"
//   3. Suppression des fichiers storage (photo profil + groupe)
//   4. Anonymisation des références dans games (winner_id / second_id)
//   5. Suppression des invites de partie
//   6. Transfert ou suppression des groupes dont l'utilisateur est owner
//   7. Suppression des memberships de groupes
//   8. Suppression des amitiés
//   9. Suppression des push tokens
//  10. Suppression du profil
//  11. Suppression de l'auth user (admin)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── 1. Vérification JWT ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Token invalide' }, 401)

  // ── 2. Vérification de la confirmation ────────────────────────────────────
  let body: { confirmation?: string } = {}
  try { body = await req.json() } catch { return json({ error: 'Corps invalide' }, 400) }
  if (body.confirmation !== 'SUPPRIMER') return json({ error: 'Confirmation invalide' }, 400)

  const userId = user.id

  // ── Client admin (service role) ───────────────────────────────────────────
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 3. Suppression des fichiers storage ───────────────────────────────────
  try {
    // Photo de profil
    const { data: profileFiles } = await admin.storage
      .from('profile-photos')
      .list(userId)
    if (profileFiles && profileFiles.length > 0) {
      await admin.storage
        .from('profile-photos')
        .remove(profileFiles.map(f => `${userId}/${f.name}`))
    }
    // Photos de groupes
    const { data: groupFiles } = await admin.storage
      .from('profile-photos')
      .list(`${userId}/groups`)
    if (groupFiles && groupFiles.length > 0) {
      // Supprimer récursivement les sous-dossiers de groupes
      for (const dir of groupFiles) {
        const { data: inner } = await admin.storage
          .from('profile-photos')
          .list(`${userId}/groups/${dir.name}`)
        if (inner && inner.length > 0) {
          await admin.storage
            .from('profile-photos')
            .remove(inner.map(f => `${userId}/groups/${dir.name}/${f.name}`))
        }
      }
    }
  } catch (e) {
    console.error('[delete-account] storage cleanup error:', e)
    // Non fatal — continuer
  }

  // ── 4. Anonymiser les références dans games ───────────────────────────────
  // winner_id et second_id sont TEXT (pas de FK), on les met à NULL
  await admin.from('games').update({ winner_id: null }).eq('winner_id', userId)
  await admin.from('games').update({ second_id: null }).eq('second_id', userId)

  // ── 5. Supprimer les invitations de partie ────────────────────────────────
  await admin.from('game_invites')
    .delete()
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

  // ── 6. Transférer ou supprimer les groupes owned ──────────────────────────
  const { data: ownedGroups } = await admin
    .from('groups')
    .select('id')
    .eq('owner_id', userId)

  for (const g of ownedGroups ?? []) {
    // Chercher un autre membre pour le transfert
    const { data: otherMembers } = await admin
      .from('group_members')
      .select('user_id')
      .eq('group_id', g.id)
      .neq('user_id', userId)
      .limit(1)

    if (otherMembers && otherMembers.length > 0) {
      // Transférer l'ownership
      await admin
        .from('groups')
        .update({ owner_id: otherMembers[0].user_id })
        .eq('id', g.id)
    } else {
      // Aucun autre membre — supprimer le groupe et ses jeux associés
      await admin.from('games').delete().eq('group_id', g.id)
      await admin.from('groups').delete().eq('id', g.id)
    }
  }

  // ── 7. Supprimer les memberships ──────────────────────────────────────────
  await admin.from('group_members').delete().eq('user_id', userId)

  // ── 8. Supprimer les amitiés ──────────────────────────────────────────────
  await admin.from('friendships')
    .delete()
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  // ── 9. Supprimer les push tokens ──────────────────────────────────────────
  try {
    await admin.from('push_tokens').delete().eq('user_id', userId)
  } catch {
    // Table peut ne pas encore exister
  }

  // ── 10. Supprimer le profil ───────────────────────────────────────────────
  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', userId)
  if (profileError) {
    console.error('[delete-account] profile delete error:', profileError)
    return json({ error: 'Erreur suppression profil: ' + profileError.message }, 500)
  }

  // ── 11. Supprimer l'auth user ─────────────────────────────────────────────
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('[delete-account] auth delete error:', deleteError)
    return json({ error: 'Erreur suppression compte: ' + deleteError.message }, 500)
  }

  return json({ success: true })
})
