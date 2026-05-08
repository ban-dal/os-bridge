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

| Feature                         | API                               | macOS     | Windows   | Linux         |
| ------------------------------- | --------------------------------- | --------- | --------- | ------------- |
| Notification permission status  | `getNotificationPermissionStatus` | Supported | Supported | `unsupported` |
| Notification Focus status       | `getNotificationFocusStatus`      | Supported | Supported | `unsupported` |
| Notification capability summary | `getNotificationCapability`       | Supported | Supported | `unsupported` |

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

| Platform | Behavior                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| macOS    | Returns `unknown` when called outside an app bundle.                                                        |
| Windows  | Looks up notification permission by app user model id. Returns `unknown` if the app id is missing or empty. |
| Linux    | Returns `unsupported`.                                                                                      |

```ts
import { getNotificationPermissionStatus } from '@ban-dal/os-bridge'

const status = getNotificationPermissionStatus({ appUserModelId: 'com.example.my-app' })
```

For Windows Electron apps, pass the same app user model id used with `app.setAppUserModelId(...)`.

`getPermissionStatus(appUserModelId?)` remains available as the low-level compatibility alias.

### Notification Focus Status

```ts
function getNotificationFocusStatus(options?: NotificationDiagnosticsOptions): NotificationFocusStatus
```

```ts
type NotificationFocusStatus = 'active' | 'inactive' | 'unsupported' | 'unknown'
```

This API exposes the focus signal available to the native implementation. On macOS, it reads `INFocusStatusCenter` and returns `unknown` if the app cannot access Focus Status. On Windows 11, it reads `Windows.UI.Shell.FocusSessionManager`, which reports an active Focus session rather than the full notification suppression state; older or unsupported Windows versions return `unsupported` or `unknown`.

Pass `{ requestFocusAuthorization: true }` from an app bundle on macOS to trigger the Focus Status authorization prompt before reading the status.

### Notification Capability

```ts
function getNotificationCapability(options?: NotificationDiagnosticsOptions): NotificationCapability
```

```ts
type NotificationCapability = {
  canNotify: boolean
  permission: NotificationPermissionStatus
  focusStatus: NotificationFocusStatus
  reasons: NotificationUnavailableReason[]
}

type NotificationUnavailableReason =
  | 'permission-denied'
  | 'permission-not-determined'
  | 'missing-app-user-model-id'
  | 'invalid-app-user-model-id'
  | 'not-bundled-app'
  | 'not-code-signed'
  | 'unsupported-platform'
  | 'unknown'
```

`canNotify` is based on platform support, notification permission, and platform-specific requirements such as the Windows app user model id. Focus status is returned as diagnostic context, but it is not treated as a definitive notification-blocking reason.

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
