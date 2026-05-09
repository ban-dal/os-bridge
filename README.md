# @ban-dal/os-bridge

Typed native OS APIs for Node.js and Electron, powered by napi-rs.

EN | [한국어](README.ko.md)

## Install

```bash
npm install @ban-dal/os-bridge
```

```bash
pnpm add @ban-dal/os-bridge
```

```bash
yarn add @ban-dal/os-bridge
```

## Runtime

Use this package from Node.js, the Electron main process, or a trusted preload script.

| Platform        | Package                             | Status                         |
| --------------- | ----------------------------------- | ------------------------------ |
| macOS arm64     | `@ban-dal/os-bridge-darwin-arm64`   | Supported                      |
| macOS x64       | `@ban-dal/os-bridge-darwin-x64`     | Supported                      |
| Windows x64     | `@ban-dal/os-bridge-win32-x64-msvc` | Supported                      |
| Linux x64 glibc | `@ban-dal/os-bridge-linux-x64-gnu`  | Fallback-only for current APIs |

Platform packages are optional dependencies. Always import from `@ban-dal/os-bridge`.

## Feature Index

| Feature                         | API                                  | macOS     | Windows       | Linux         |
| ------------------------------- | ------------------------------------ | --------- | ------------- | ------------- |
| Notification permission status  | `getNotificationPermissionStatus`    | Supported | Supported     | `unsupported` |
| macOS notification permission   | `requestMacNotificationPermission`   | Supported | Status only   | `unsupported` |
| Notification interruption level | `getNotificationInterruptionLevel`   | Supported | Supported     | `unsupported` |
| macOS Focus Status access       | `requestMacFocusStatusAuthorization` | Supported | `unsupported` | `unsupported` |
| Notification capability summary | `getNotificationCapability`          | Supported | Supported     | `unsupported` |

## Usage

```ts
import { getNotificationCapability, type NotificationCapability } from '@ban-dal/os-bridge'

const capability: NotificationCapability = getNotificationCapability()
```

## Features

### getNotificationPermissionStatus

`macOS` `Windows`

```ts
function getNotificationPermissionStatus(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

```ts
type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'limited' | 'unsupported' | 'unknown'
```

| Platform | Behavior                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | Returns `unknown` when called outside an app bundle.                                                                                                                                  |
| Windows  | Looks up notification permission by app user model id.<br>Windows defaults to allowed when no app-specific deny state exists.<br>Returns `unknown` if the app id is missing or empty. |
| Linux    | Returns `unsupported`.                                                                                                                                                                |

```ts
import { getNotificationPermissionStatus } from '@ban-dal/os-bridge'

const status = getNotificationPermissionStatus({ appUserModelId: 'com.example.my-app' })
```

For Windows Electron apps, pass the same app user model id used with `app.setAppUserModelId(...)`.

`getPermissionStatus(appUserModelId?)` remains available as the low-level compatibility alias.

### requestMacNotificationPermission

`macOS` `Windows status only`

```ts
function requestMacNotificationPermission(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

Requests notification authorization on macOS and returns the resulting permission status.

Windows does not provide an OS API for requesting app notification permission. Its default notification state is allowed, so use `getNotificationPermissionStatus` or `getNotificationCapability` for Windows diagnostics.

```ts
import { requestMacNotificationPermission } from '@ban-dal/os-bridge'

const status = requestMacNotificationPermission()
```

### getNotificationInterruptionLevel

`macOS` `Windows`

```ts
function getNotificationInterruptionLevel(): NotificationInterruptionLevel
```

```ts
type NotificationInterruptionLevel = 'normal' | 'limited' | 'unsupported' | 'unknown'
```

```ts
type NotificationDiagnosticsOptions = {
  appUserModelId?: string
}
```

Returns whether the OS is currently in a normal or limited notification-delivery context.
`limited` is diagnostic context only. It does not prove that this app's notifications will be suppressed.

#### macOS

On macOS, the following conditions are required:

1. Communication Notifications enabled for the App ID in Apple Developer > Identifiers.
2. A bundled app code-signed with that account, not ad-hoc signing.
3. The app enabled in System Settings > Privacy & Security > Focus. You can prompt the user for this with `requestMacFocusStatusAuthorization()`.

Even when Focus or Do Not Disturb is enabled, the result is `normal` if the app is included in the allowed apps for the current Focus.

#### Windows

On Windows, the interruption level comes from `ToastNotificationManager.GetDefault().NotificationMode()`.

- `Unrestricted` returns `normal`.
- `PriorityOnly` and `AlarmsOnly` return `limited`.

Windows does not expose whether this app is included in the user's priority app list. Therefore, `limited` means the system is limiting notifications, not that this app is definitely blocked.

### requestMacFocusStatusAuthorization

`macOS`

```ts
function requestMacFocusStatusAuthorization(): NotificationInterruptionLevel
```

Requests permission to share Focus Status with this app, then returns the current interruption level.

If the request has already been handled by the OS, the system may not show another alert.

### getNotificationCapability

`macOS` `Windows`

```ts
function getNotificationCapability(options?: NotificationDiagnosticsOptions): NotificationCapability
```

```ts
type NotificationCapability = {
  canNotify: boolean
  permission: NotificationPermissionStatus
  interruptionLevel: NotificationInterruptionLevel
  reasons: NotificationUnavailableReason[]
}

type NotificationUnavailableReason =
  | 'permission-denied'
  | 'permission-not-determined'
  | 'missing-app-user-model-id'
  | 'invalid-app-user-model-id'
  | 'unsupported-platform'
  | 'unknown'
```

`canNotify` is based on platform support, notification permission, and platform-specific requirements.
For example, Windows also needs a valid app user model id.

The interruption level is returned as diagnostic context. It is not treated as a definitive notification-blocking reason.

#### Electron

```ts
// main.ts
import { app, ipcMain } from 'electron'
import { getNotificationCapability } from '@ban-dal/os-bridge'

const appUserModelId = 'com.example.my-app'

if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelId)
}

ipcMain.handle('notification:getCapability', () => {
  return getNotificationCapability({ appUserModelId })
})
```

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { NotificationCapability } from '@ban-dal/os-bridge'

contextBridge.exposeInMainWorld('osBridge', {
  getNotificationCapability: (): Promise<NotificationCapability> => {
    return ipcRenderer.invoke('notification:getCapability')
  },
})
```

```ts
// renderer.ts
const capability = await window.osBridge.getNotificationCapability()
```

## Adding Feature Documentation

- Add one row to `Feature Index`.
- Add one `### Feature Name` section under `Features`.
- Include the signature, exported types, platform notes, and an Electron example only when needed.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

### Manual Electron Probe

Use `electron-probe/` when you need to physically compare this package's diagnostics with the current OS notification and Focus state.

```bash
pnpm build
cd electron-probe
cp .env.example .env
pnpm install
pnpm dev
```

For macOS app-bundle testing:

```bash
cd electron-probe
pnpm pack:mac
```

The probe can request macOS Focus Status access. It includes `NSFocusStatusUsageDescription` in the packaged app.

The macOS probe package is ad-hoc signed locally for manual testing.
