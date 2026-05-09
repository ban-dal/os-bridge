import { Notification } from 'electron'
import { execFile } from 'node:child_process'

export type NotificationMethod = 'electron' | 'osascript'

type NotificationEvent = { type: string; detail?: string; checkedAt: string }
type NotificationAttempt = {
  sent: boolean
  method: NotificationMethod
  id?: number
  reason: string
  events?: NotificationEvent[]
  checkedAt: string
}

let nextNotificationId = 1
const activeNotifications = new Map<number, Notification>()

export function sendNotification(method: NotificationMethod, onClick: () => void) {
  return method === 'osascript' ? sendAppleScriptNotification() : sendElectronNotification(onClick)
}

function createNotificationPayload(method: NotificationMethod): { title: string; body: string } {
  return {
    title: method === 'osascript' ? 'OS Bridge Probe (osascript)' : 'OS Bridge Probe',
    body: `Notification probe sent at ${new Date().toLocaleTimeString()}`,
  }
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createWindowsToastXml(title: string, body: string): string {
  return `
<toast activationType="protocol">
  <visual>
    <binding template="ToastGeneric">
      <text>${escapeXml(title)}</text>
      <text>${escapeXml(body)}</text>
    </binding>
  </visual>
</toast>`.trim()
}

function sendAppleScriptNotification(): Promise<NotificationAttempt> | NotificationAttempt {
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
    const events: NotificationEvent[] = []
    const { title, body } = createNotificationPayload('osascript')
    const script = `display notification "${escapeAppleScriptString(body)}" with title "${escapeAppleScriptString(title)}" sound name "default"`

    function record(type: string, detail?: string) {
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

function sendElectronNotification(onClick: () => void): Promise<NotificationAttempt> | NotificationAttempt {
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
    const events: NotificationEvent[] = []
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

    function record(type: string, detail?: string) {
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

    function finish(sent: boolean, reason: string) {
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
      onClick()
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
