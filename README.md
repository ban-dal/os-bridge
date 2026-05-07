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

| Feature                        | API                   | macOS     | Windows   | Linux         |
| ------------------------------ | --------------------- | --------- | --------- | ------------- |
| Notification permission status | `getPermissionStatus` | Supported | Supported | `unsupported` |

## Usage

```ts
import { getPermissionStatus, type NotificationPermissionStatus } from '@ban-dal/os-bridge'

const status: NotificationPermissionStatus = getPermissionStatus()
```

## Features

### Notification Permission Status

```ts
function getPermissionStatus(appUserModelId?: string): NotificationPermissionStatus
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
import { getPermissionStatus } from '@ban-dal/os-bridge'

const status = getPermissionStatus('com.example.my-app')
```

For Windows Electron apps, pass the same app user model id used with `app.setAppUserModelId(...)`.

#### Electron

```ts
// main.ts
import { app, ipcMain } from 'electron'
import { getPermissionStatus } from '@ban-dal/os-bridge'

const appUserModelId = 'com.example.my-app'

if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelId)
}

ipcMain.handle('notification:getPermissionStatus', () => {
  return getPermissionStatus(appUserModelId)
})
```

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { NotificationPermissionStatus } from '@ban-dal/os-bridge'

contextBridge.exposeInMainWorld('osBridge', {
  getNotificationPermissionStatus: (): Promise<NotificationPermissionStatus> => {
    return ipcRenderer.invoke('notification:getPermissionStatus')
  },
})
```

```ts
// renderer.ts
const status = await window.osBridge.getNotificationPermissionStatus()
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
