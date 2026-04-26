// Shim TypeScript pour @capacitor/push-notifications
// Permet au build de passer avant que le package soit installé.
// Ce fichier sera ignoré une fois le vrai package installé (node_modules prend la priorité).
// → Pour installer le vrai package : npm install @capacitor/push-notifications && npx cap sync ios

declare module '@capacitor/push-notifications' {
  export interface Token {
    value: string
  }

  export interface PushNotificationSchema {
    id?: string
    title?: string
    subtitle?: string
    body?: string
    badge?: number
    data: Record<string, unknown>
  }

  export interface ActionPerformed {
    actionId: string
    inputValue?: string
    notification: PushNotificationSchema
  }

  export interface PermissionStatus {
    receive: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
  }

  export interface PushNotificationsPlugin {
    checkPermissions(): Promise<PermissionStatus>
    requestPermissions(): Promise<PermissionStatus>
    register(): Promise<void>
    removeAllListeners(): Promise<void>
    addListener(
      eventName: 'registration',
      listenerFunc: (token: Token) => void,
    ): Promise<{ remove: () => void }>
    addListener(
      eventName: 'registrationError',
      listenerFunc: (error: unknown) => void,
    ): Promise<{ remove: () => void }>
    addListener(
      eventName: 'pushNotificationReceived',
      listenerFunc: (notification: PushNotificationSchema) => void,
    ): Promise<{ remove: () => void }>
    addListener(
      eventName: 'pushNotificationActionPerformed',
      listenerFunc: (action: ActionPerformed) => void,
    ): Promise<{ remove: () => void }>
  }

  export const PushNotifications: PushNotificationsPlugin
}
