import { contextBridge, ipcRenderer } from 'electron'

type DiagnosticsOptions = { requestFocusAuthorization?: boolean }
type NotificationOptions = { method?: 'electron' | 'osascript' }

contextBridge.exposeInMainWorld('probe', {
  getDiagnostics: (options?: DiagnosticsOptions) => ipcRenderer.invoke('probe:getDiagnostics', options),
  requestNotificationPermission: () => ipcRenderer.invoke('probe:requestNotificationPermission'),
  sendNotification: (options?: NotificationOptions) => ipcRenderer.invoke('probe:sendNotification', options),
  openBridgePath: () => ipcRenderer.invoke('probe:openBridgePath'),
})
