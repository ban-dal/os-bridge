# @ban-dal/os-bridge

Typed native OS APIs for Node.js and Electron, powered by napi-rs.

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

### Notification Permission Status

```ts
function getNotificationPermissionStatus(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

```ts
type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'limited' | 'unsupported' | 'unknown'
```

| Platform | Behavior                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | Returns `unknown` when called outside an app bundle.                                                                                                                            |
| Windows  | Looks up notification permission by app user model id. Windows defaults to allowed when no app-specific deny state exists. Returns `unknown` if the app id is missing or empty. |
| Linux    | Returns `unsupported`.                                                                                                                                                          |

```ts
import { getNotificationPermissionStatus } from '@ban-dal/os-bridge'

const status = getNotificationPermissionStatus({ appUserModelId: 'com.example.my-app' })
```

For Windows Electron apps, pass the same app user model id used with `app.setAppUserModelId(...)`.

`getPermissionStatus(appUserModelId?)` remains available as the low-level compatibility alias.

### macOS Notification Permission Request

```ts
function requestMacNotificationPermission(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

This API requests notification authorization on macOS and returns the resulting permission status. Windows does not provide an OS API for requesting app notification permission, and its default notification state is allowed, so use `getNotificationPermissionStatus` or `getNotificationCapability` for Windows diagnostics.

```ts
import { requestMacNotificationPermission } from '@ban-dal/os-bridge'

const status = requestMacNotificationPermission()
```

### Notification Interruption Level

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

This API exposes whether the OS is currently in a normal or limited notification-delivery context. `limited` is diagnostic context only. It does not prove that this app's notifications will be suppressed.

#### macOS

On macOS, this API reads `INFocusStatusCenter`. To read this value, the app must be able to access Focus Status and the user must enable the app in System Settings > Privacy & Security > Focus. Use `requestMacFocusStatusAuthorization()` from an app bundle to request that Focus Status access.

macOS reports Focus from this app's effective perspective: if the current Focus allows this app, the value can be `normal` even while Focus is enabled. If Focus Status access is unavailable or not enabled for the app, this API returns `unknown`.

#### Windows

On Windows, this API reads `ToastNotificationManager.GetDefault().NotificationMode()`. `Unrestricted` maps to `normal`, while `PriorityOnly` and `AlarmsOnly` map to `limited`. Windows does not expose whether this app is included in the user's priority app list, so `limited` means the system is limiting notifications, not that this app is definitely blocked.

### macOS Focus Status Access Request

```ts
function requestMacFocusStatusAuthorization(): NotificationInterruptionLevel
```

This API requests permission for macOS to share Focus Status with this app, then returns the current interruption level. If the request has already been handled by the OS, macOS may not show another alert.

### Notification Capability

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

`canNotify` is based on platform support, notification permission, and platform-specific requirements such as the Windows app user model id. The interruption level is returned as diagnostic context, but it is not treated as a definitive notification-blocking reason.

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

The probe can request macOS Focus Status access and includes `NSFocusStatusUsageDescription` in the packaged app. The macOS probe package is ad-hoc signed locally for manual testing.
