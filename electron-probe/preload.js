const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('probe', {
  getDiagnostics: (options) => ipcRenderer.invoke('probe:getDiagnostics', options),
  requestNotificationPermission: () => ipcRenderer.invoke('probe:requestNotificationPermission'),
  sendNotification: (options) => ipcRenderer.invoke('probe:sendNotification', options),
  openBridgePath: () => ipcRenderer.invoke('probe:openBridgePath'),
})
