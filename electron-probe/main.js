const { app, BrowserWindow, Notification, ipcMain, shell } = require('electron')
const { execFile } = require('node:child_process')
const path = require('node:path')
const os = require('node:os')

const appUserModelId = process.env.PROBE_APP_ID || 'com.bandal.osbridge.probe'
const productName = process.env.PROBE_PRODUCT_NAME || 'OS Bridge Probe'

if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelId)
}

let mainWindow
let nextNotificationId = 1
const activeNotifications = new Map()

function resolveBridgePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'os-bridge', 'index.js')
  }

  return path.join(__dirname, '..', '..', 'index.js')
}

function loadBridge() {
  const bridgePath = resolveBridgePath()

  delete require.cache[require.resolve(bridgePath)]

  return {
    bridge: require(bridgePath),
    bridgePath,
  }
}

function readDiagnostics(options = {}) {
  const { bridge, bridgePath } = loadBridge()
  const diagnosticsOptions = {
    appUserModelId,
    requestFocusAuthorization: options.requestFocusAuthorization === true,
  }

  const permission = bridge.getNotificationPermissionStatus(diagnosticsOptions)
  const focusStatus = bridge.getNotificationFocusStatus(diagnosticsOptions)
  const capability = bridge.getNotificationCapability(diagnosticsOptions)

  return {
    checkedAt: new Date().toISOString(),
    app: {
      appUserModelId,
      isPackaged: app.isPackaged,
      name: app.getName(),
      version: app.getVersion(),
      executablePath: app.getPath('exe'),
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
      focusStatus,
      capability,
    },
    electronNotificationSupported: Notification.isSupported(),
  }
}

function requestNotificationPermission() {
  const { bridge } = loadBridge()
  const diagnosticsOptions = {
    appUserModelId,
  }

  if (typeof bridge.requestNotificationPermission === 'function') {
    return bridge.requestNotificationPermission(diagnosticsOptions)
  }

  return bridge.getNotificationPermissionStatus(diagnosticsOptions)
}

function createNotificationPayload(method) {
  return {
    title: method === 'osascript' ? 'OS Bridge Probe (osascript)' : 'OS Bridge Probe',
    body: `Notification probe sent at ${new Date().toLocaleTimeString()}`,
  }
}

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createWindowsToastXml(title, body) {
  return `
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>${escapeXml(title)}</text>
      <text>${escapeXml(body)}</text>
    </binding>
  </visual>
</toast>`.trim()
}

function sendAppleScriptNotification() {
  if (process.platform !== 'darwin') {
    return {
      sent: false,
      method: 'osascript',
      reason: 'osascript-notification-unsupported-platform',
      checkedAt: new Date().toISOString(),
    }
  }

  return new Promise((resolve) => {
    const id = nextNotificationId++
    const events = []
    const { title, body } = createNotificationPayload('osascript')
    const script = `display notification "${escapeAppleScriptString(body)}" with title "${escapeAppleScriptString(title)}" sound name "default"`

    function record(type, detail) {
      events.push({
        type,
        detail,
        checkedAt: new Date().toISOString(),
      })
    }

    execFile('/usr/bin/osascript', ['-e', script], { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        record('failed', stderr || error.message)
        resolve({
          sent: false,
          method: 'osascript',
          id,
          reason: 'osascript-failed',
          events,
          checkedAt: new Date().toISOString(),
        })
        return
      }

      record('executed', stdout || undefined)
      resolve({
        sent: true,
        method: 'osascript',
        id,
        reason: 'executed',
        events,
        checkedAt: new Date().toISOString(),
      })
    })
  })
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

function sendElectronNotification() {
  if (!Notification.isSupported()) {
    return {
      sent: false,
      method: 'electron',
      reason: 'electron-notification-unsupported',
      checkedAt: new Date().toISOString(),
    }
  }

  return new Promise((resolve) => {
    const id = nextNotificationId++
    const events = []
    let finished = false
    const { title, body } = createNotificationPayload('electron')
    const notificationOptions =
      process.platform === 'win32'
        ? {
            toastXml: createWindowsToastXml(title, body),
          }
        : {
            title,
            body,
            silent: false,
          }
    const notification = new Notification(notificationOptions)

    activeNotifications.set(id, notification)
    record('created', process.platform === 'win32' ? 'toastXml' : 'native')

    function record(type, detail) {
      events.push({
        type,
        detail,
        checkedAt: new Date().toISOString(),
      })
    }

    function cleanup() {
      clearTimeout(timeout)
      clearTimeout(retentionTimeout)
      activeNotifications.delete(id)
    }

    function finish(sent, reason) {
      if (finished) {
        return
      }

      finished = true
      resolve({
        sent,
        method: 'electron',
        id,
        reason,
        events,
        checkedAt: new Date().toISOString(),
      })
    }

    const timeout = setTimeout(() => {
      record('timeout')
      finish(false, 'event-timeout')
    }, 5000)
    const retentionTimeout = setTimeout(() => {
      record('retention-timeout')
      activeNotifications.delete(id)
    }, 60000)

    notification.once('show', () => {
      clearTimeout(timeout)
      record('show')
      finish(true, 'show')
    })

    notification.once('failed', (_event, error) => {
      record('failed', error ? String(error) : undefined)
      cleanup()
      finish(false, 'failed')
    })

    notification.once('close', () => {
      record('close')
      cleanup()
    })

    notification.once('click', () => {
      record('click')
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    try {
      notification.show()
    } catch (error) {
      record('failed', error ? String(error) : undefined)
      cleanup()
      finish(false, 'show-threw')
    }
  })
}

ipcMain.handle('probe:sendNotification', (_event, options = {}) => {
  if (options.method === 'osascript') {
    return sendAppleScriptNotification()
  }

  return sendElectronNotification()
})

ipcMain.handle('probe:requestNotificationPermission', () => {
  const permission = requestNotificationPermission()
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
