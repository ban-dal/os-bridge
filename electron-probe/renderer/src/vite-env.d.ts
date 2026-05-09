/// <reference types="vite/client" />

type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'limited' | 'unsupported' | 'unknown'
type NotificationFocusStatus = 'active' | 'inactive' | 'unsupported' | 'unknown'
type NotificationMethod = 'electron' | 'osascript'

type NotificationCapability = {
  canNotify: boolean
  permission: NotificationPermissionStatus
  focusStatus: NotificationFocusStatus
  reasons: string[]
}

type ProbeDiagnostics = {
  checkedAt: string
  app: {
    appUserModelId: string
    isPackaged: boolean
    name: string
    version: string
    executablePath: string
    windowsShortcutPath: string | null
    windowsShortcutStatus: string | null
  }
  runtime: {
    platform: string
    arch: string
    node: string
    electron: string
    osRelease: string
  }
  bridge: {
    path: string
    permission: NotificationPermissionStatus
    focusStatus: NotificationFocusStatus
    capability: NotificationCapability
  }
  electronNotificationSupported: boolean
}

type NotificationAttempt = {
  sent: boolean
  method?: NotificationMethod
  id?: number
  reason?: string
  events?: Array<{
    type: string
    detail?: string
    checkedAt: string
  }>
  checkedAt: string
}

type NotificationPermissionRequest = {
  permission: NotificationPermissionStatus
  diagnostics: ProbeDiagnostics
  checkedAt: string
}

interface Window {
  probe: {
    getDiagnostics: (options?: { requestFocusAuthorization?: boolean }) => Promise<ProbeDiagnostics>
    requestNotificationPermission: () => Promise<NotificationPermissionRequest>
    sendNotification: (options?: { method?: NotificationMethod }) => Promise<NotificationAttempt>
    openBridgePath: () => Promise<void>
  }
}
