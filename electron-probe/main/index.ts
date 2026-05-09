import { app, BrowserWindow, Notification, ipcMain, shell } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { NotificationDiagnosticsOptions } from '../../index'
import { sendNotification, type NotificationMethod } from './notification'

type Bridge = typeof import('../../index')
type DiagnosticsOptions = Pick<NotificationDiagnosticsOptions, 'requestFocusAuthorization'>

const appUserModelId = process.env.PROBE_APP_ID || 'com.bandal.osbridge.probe'
const productName = process.env.PROBE_PRODUCT_NAME || 'OS Bridge Probe'

if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelId)
}

let mainWindow: BrowserWindow | null = null
let windowsShortcutPath: string | null = null
let windowsShortcutStatus: string | null = null

function resolveBridgePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'os-bridge', 'index.js')
  }

  return path.join(__dirname, '..', '..', 'index.js')
}

function loadBridge(): { bridge: Bridge; bridgePath: string } {
  const bridgePath = resolveBridgePath()

  delete require.cache[require.resolve(bridgePath)]

  return {
    bridge: require(bridgePath) as Bridge,
    bridgePath,
  }
}

function readDiagnostics(options: DiagnosticsOptions = {}) {
  const { bridge, bridgePath } = loadBridge()
  const diagnosticsOptions = {
    appUserModelId,
    requestFocusAuthorization: options.requestFocusAuthorization === true,
  }

  const permission = bridge.getNotificationPermissionStatus(diagnosticsOptions)
  const interruptionLevel = bridge.getNotificationInterruptionLevel(diagnosticsOptions)
  const capability = bridge.getNotificationCapability(diagnosticsOptions)

  return {
    checkedAt: new Date().toISOString(),
    app: {
      appUserModelId,
      isPackaged: app.isPackaged,
      name: app.getName(),
      version: app.getVersion(),
      executablePath: app.getPath('exe'),
      windowsShortcutPath,
      windowsShortcutStatus,
    },
    runtime: {
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      electron: process.versions.electron,
      osRelease: os.release(),
    },
    bridge: {
      path: bridgePath,
      permission,
      interruptionLevel,
      capability,
    },
    electronNotificationSupported: Notification.isSupported(),
  }
}

function ensureWindowsAppShortcut() {
  if (process.platform !== 'win32') {
    return
  }

  const programsPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  const shortcutPath = path.join(programsPath, `${productName}.lnk`)
  const appPath = app.getAppPath()
  const operation = existsSync(shortcutPath) ? 'replace' : 'create'

  mkdirSync(programsPath, { recursive: true })

  try {
    const written = shell.writeShortcutLink(shortcutPath, operation, {
      target: app.getPath('exe'),
      cwd: app.isPackaged ? path.dirname(app.getPath('exe')) : appPath,
      ...(app.isPackaged ? {} : { args: `"${appPath}"` }),
      description: 'Manual Electron probe for OS Bridge notification diagnostics.',
      icon: app.getPath('exe'),
      iconIndex: 0,
      appUserModelId,
    })
    const exists = existsSync(shortcutPath)

    windowsShortcutPath = exists ? shortcutPath : null
    windowsShortcutStatus = written && exists ? operation : 'failed'
  } catch (error) {
    windowsShortcutPath = null
    windowsShortcutStatus = error instanceof Error ? error.message : String(error)
  }
}

function requestMacNotificationPermission() {
  const { bridge } = loadBridge()
  const diagnosticsOptions = {
    appUserModelId,
  }

  if (typeof bridge.requestMacNotificationPermission === 'function') {
    return bridge.requestMacNotificationPermission(diagnosticsOptions)
  }

  return bridge.getNotificationPermissionStatus(diagnosticsOptions)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    title: productName,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer-dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  app.setName(productName)
  ensureWindowsAppShortcut()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('probe:getDiagnostics', (_event, options) => {
  return readDiagnostics(options)
})

ipcMain.handle('probe:sendNotification', (_event, options: { method?: NotificationMethod } = {}) => {
  return sendNotification(options.method || 'electron', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})

ipcMain.handle('probe:requestMacNotificationPermission', () => {
  const permission = requestMacNotificationPermission()
  const diagnostics = readDiagnostics()

  return {
    permission,
    diagnostics,
    checkedAt: new Date().toISOString(),
  }
})

ipcMain.handle('probe:openBridgePath', () => {
  const bridgePath = resolveBridgePath()

  return shell.showItemInFolder(bridgePath)
})
