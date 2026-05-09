import { contextBridge, ipcRenderer } from 'electron'

type NotificationOptions = { method?: 'electron' | 'osascript' }

contextBridge.exposeInMainWorld('probe', {
  getDiagnostics: () => ipcRenderer.invoke('probe:getDiagnostics'),
  requestMacFocusStatusAuthorization: () => ipcRenderer.invoke('probe:requestMacFocusStatusAuthorization'),
  requestMacNotificationPermission: () => ipcRenderer.invoke('probe:requestMacNotificationPermission'),
  sendNotification: (options?: NotificationOptions) => ipcRenderer.invoke('probe:sendNotification', options),
  openBridgePath: () => ipcRenderer.invoke('probe:openBridgePath'),
})
