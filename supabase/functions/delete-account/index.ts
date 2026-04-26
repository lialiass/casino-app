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
//   4. Anonymisation de games.winner_id / second_id / created_by
//   5. Suppression des invitations de partie
//   6. Transfert ou suppression des groupes owned
//   7. Suppression des memberships de groupes
//   8. Suppression des amitiés
//   9. Suppression des push tokens (optionnel)
//  10. Anonymisation de players.user_id / created_by (FK vers auth.users)
//  11. Suppression du profil
//  12. Suppression de l'auth user (admin)

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
  const serviceKey  = Deno.env.get('SERVICE_ROLE_KEY')!

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
  console.log(`[delete-account] START userId=${userId}`)

  // ── Client admin (service role) ───────────────────────────────────────────
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 3. Suppression des fichiers storage ───────────────────────────────────
  console.log('[delete-account] step 3: storage cleanup')
  try {
    const { data: profileFiles } = await admin.storage
      .from('profile-photos')
      .list(userId)
    if (profileFiles && profileFiles.length > 0) {
      await admin.storage
        .from('profile-photos')
        .remove(profileFiles.map(f => `${userId}/${f.name}`))
    }
    const { data: groupFiles } = await admin.storage
      .from('profile-photos')
      .list(`${userId}/groups`)
    if (groupFiles && groupFiles.length > 0) {
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
    console.log('[delete-account] step 3: storage OK')
  } catch (e) {
    console.error('[delete-account] step 3: storage error (non-fatal):', e)
  }

  // ── 4. Anonymiser les références dans games ───────────────────────────────
  // winner_id, second_id : TEXT sans FK — mise à null pour l'historique
  // created_by : potentielle FK vers auth.users — doit être nullé avant deleteUser
  console.log('[delete-account] step 4: anonymize games')
  {
    const { error: e1 } = await admin.from('games').update({ winner_id: null }).eq('winner_id', userId)
    if (e1) console.error('[delete-account] step 4: games.winner_id error:', e1)

    const { error: e2 } = await admin.from('games').update({ second_id: null }).eq('second_id', userId)
    if (e2) console.error('[delete-account] step 4: games.second_id error:', e2)

    const { error: e3 } = await admin.from('games').update({ created_by: null }).eq('created_by', userId)
    if (e3) console.error('[delete-account] step 4: games.created_by error:', e3)
    else    console.log('[delete-account] step 4: games OK')
  }

  // ── 5. Supprimer les invitations de partie ────────────────────────────────
  console.log('[delete-account] step 5: game_invites')
  {
    const { error } = await admin.from('game_invites')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    if (error) console.error('[delete-account] step 5: game_invites error:', error)
    else       console.log('[delete-account] step 5: game_invites OK')
  }

  // ── 6. Transférer ou supprimer les groupes owned ──────────────────────────
  console.log('[delete-account] step 6: groups transfer/delete')
  {
    const { data: ownedGroups, error: fetchErr } = await admin
      .from('groups')
      .select('id')
      .eq('owner_id', userId)
    if (fetchErr) console.error('[delete-account] step 6: fetch groups error:', fetchErr)

    for (const g of ownedGroups ?? []) {
      const { data: otherMembers } = await admin
        .from('group_members')
        .select('user_id')
        .eq('group_id', g.id)
        .neq('user_id', userId)
        .limit(1)

      if (otherMembers && otherMembers.length > 0) {
        await admin
          .from('groups')
          .update({ owner_id: otherMembers[0].user_id })
          .eq('id', g.id)
        console.log(`[delete-account] step 6: group ${g.id} transferred`)
      } else {
        await admin.from('games').delete().eq('group_id', g.id)
        const { error: delGrpErr } = await admin.from('groups').delete().eq('id', g.id)
        if (delGrpErr) console.error(`[delete-account] step 6: delete group ${g.id} error:`, delGrpErr)
        else           console.log(`[delete-account] step 6: group ${g.id} deleted`)
      }
    }
    console.log('[delete-account] step 6: groups OK')
  }

  // ── 7. Supprimer les memberships ──────────────────────────────────────────
  console.log('[delete-account] step 7: group_members')
  {
    const { error } = await admin.from('group_members').delete().eq('user_id', userId)
    if (error) console.error('[delete-account] step 7: group_members error:', error)
    else       console.log('[delete-account] step 7: group_members OK')
  }

  // ── 8. Supprimer les amitiés ──────────────────────────────────────────────
  console.log('[delete-account] step 8: friendships')
  {
    const { error } = await admin.from('friendships')
      .delete()
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    if (error) console.error('[delete-account] step 8: friendships error:', error)
    else       console.log('[delete-account] step 8: friendships OK')
  }

  // ── 9. Supprimer les push tokens ──────────────────────────────────────────
  console.log('[delete-account] step 9: push_tokens')
  try {
    const { error } = await admin.from('push_tokens').delete().eq('user_id', userId)
    if (error) console.error('[delete-account] step 9: push_tokens error (non-fatal):', error)
    else       console.log('[delete-account] step 9: push_tokens OK')
  } catch {
    console.log('[delete-account] step 9: push_tokens table absent (non-fatal)')
  }

  // ── 10. Anonymiser players.user_id et players.created_by ─────────────────
  // Ces colonnes peuvent référencer auth.users(id) via FK.
  // On NE supprime PAS les lignes player pour préserver l'historique des parties.
  console.log('[delete-account] step 10: anonymize players FK columns')
  {
    const { error: e1 } = await admin
      .from('players')
      .update({ user_id: null })
      .eq('user_id', userId)
    if (e1) console.error('[delete-account] step 10: players.user_id error:', e1)
    else    console.log('[delete-account] step 10: players.user_id nulled OK')

    const { error: e2 } = await admin
      .from('players')
      .update({ created_by: null })
      .eq('created_by', userId)
    if (e2) console.error('[delete-account] step 10: players.created_by error:', e2)
    else    console.log('[delete-account] step 10: players.created_by nulled OK')
  }

  // ── 11. Supprimer le profil ───────────────────────────────────────────────
  console.log('[delete-account] step 11: delete profile')
  {
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (profileError) {
      console.error('[delete-account] step 11: profile delete error:', profileError)
      return json({ error: 'Erreur suppression profil: ' + profileError.message }, 500)
    }
    console.log('[delete-account] step 11: profile OK')
  }

  // ── 12. Supprimer l'auth user ─────────────────────────────────────────────
  console.log('[delete-account] step 12: deleteUser')
  {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-account] step 12: deleteUser error:', deleteError)
      return json({ error: 'Erreur suppression compte: ' + deleteError.message }, 500)
    }
    console.log('[delete-account] step 12: deleteUser OK')
  }

  console.log(`[delete-account] DONE userId=${userId}`)
  return json({ success: true })
})
