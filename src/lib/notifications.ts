// Notifications push Capacitor iOS
// Encapsule @capacitor/push-notifications pour ne pas crasher sur web/simulateur.

import { Capacitor } from '@capacitor/core'

export type NotifPermission = 'granted' | 'denied' | 'prompt'

// Vrai uniquement sur un appareil iOS natif (pas simulateur web, pas Android)
export function isPushSupported(): boolean {
  return Capacitor.isNativePlatform()
}

// Vérifier le statut actuel de la permission (sans déclencher la popup)
export async function getPermissionStatus(): Promise<NotifPermission> {
  if (!isPushSupported()) return 'denied'
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const { receive } = await PushNotifications.checkPermissions()
    if (receive === 'granted') return 'granted'
    if (receive === 'denied')  return 'denied'
    return 'prompt'
  } catch {
    return 'denied'
  }
}

// Demander la permission puis enregistrer le device token
// Retourne true si l'accès est accordé
export async function requestAndRegister(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const { receive } = await PushNotifications.requestPermissions()
    if (receive !== 'granted') return false

    // Enregistrement : déclenche 'registration' ci-dessous
    await PushNotifications.register()

    // Stocker le token dès qu'APNs le retourne
    await new Promise<void>((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        await savePushToken(userId, token.value)
        resolve()
      })
      // Timeout de sécurité si APNs ne répond pas
      setTimeout(resolve, 5000)
    })

    return true
  } catch (e) {
    console.error('[notifications] requestAndRegister error:', e)
    return false
  }
}

// Enregistrer les listeners passifs (appelé une fois au login)
export async function initPushListeners(userId: string): Promise<void> {
  if (!isPushSupported()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Token renouvelé par APNs → mettre à jour en DB
    PushNotifications.addListener('registration', async (token) => {
      await savePushToken(userId, token.value)
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[notifications] registration error:', err)
    })

    // Notification reçue en foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[notifications] foreground:', notification)
      // On peut afficher un toast custom ici si besoin
    })

    // Tap sur une notification → navigation possible
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[notifications] tapped:', action)
      // Navigation : action.notification.data peut contenir { route: '/invitations' }
    })

    // Si permission déjà accordée, re-register pour rafraîchir le token
    const { receive } = await PushNotifications.checkPermissions()
    if (receive === 'granted') {
      await PushNotifications.register()
    }
  } catch (e) {
    console.error('[notifications] initPushListeners error:', e)
  }
}

// Supprimer tous les listeners (appelé au logout)
export async function removePushListeners(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
  } catch { /* ignore */ }
}

// ── Helpers Supabase (importés dynamiquement pour éviter les circular deps) ───

async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    // Import dynamique pour éviter les dépendances circulaires
    const { supabase } = await import('./supabase')
    if (!supabase) return
    await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform: 'ios', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' },
      )
  } catch (e) {
    console.error('[notifications] savePushToken error:', e)
  }
}
