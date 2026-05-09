# @ban-dal/os-bridge

napi-rs 기반의 Node.js 및 Electron용 타입 지원 네이티브 OS API입니다.

[EN](README.md) | 한국어

## 설치

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

이 패키지는 Node.js, Electron 메인 프로세스 또는 신뢰할 수 있는 preload 스크립트에서 사용하세요.

| 플랫폼          | 패키지                              | 상태                     |
| --------------- | ----------------------------------- | ------------------------ |
| macOS arm64     | `@ban-dal/os-bridge-darwin-arm64`   | 지원                     |
| macOS x64       | `@ban-dal/os-bridge-darwin-x64`     | 지원                     |
| Windows x64     | `@ban-dal/os-bridge-win32-x64-msvc` | 지원                     |
| Linux x64 glibc | `@ban-dal/os-bridge-linux-x64-gnu`  | 현재 API에서는 폴백 전용 |

플랫폼 패키지는 선택적 의존성입니다. 항상 `@ban-dal/os-bridge`에서 import하세요.

## 기능 요약

| 기능                      | API                                  | macOS | Windows       | Linux         |
| ------------------------- | ------------------------------------ | ----- | ------------- | ------------- |
| 알림 권한 상태            | `getNotificationPermissionStatus`    | 지원  | 지원          | `unsupported` |
| macOS 알림 권한 요청      | `requestMacNotificationPermission`   | 지원  | 상태 확인만   | `unsupported` |
| 알림 방해 수준            | `getNotificationInterruptionLevel`   | 지원  | 지원          | `unsupported` |
| macOS 집중 모드 상태 접근 | `requestMacFocusStatusAuthorization` | 지원  | `unsupported` | `unsupported` |
| 알림 기능 요약            | `getNotificationCapability`          | 지원  | 지원          | `unsupported` |

## 사용 방법

```ts
import { getNotificationCapability, type NotificationCapability } from '@ban-dal/os-bridge'

const capability: NotificationCapability = getNotificationCapability()
```

## 기능

### getNotificationPermissionStatus

`macOS` `Windows`

```ts
function getNotificationPermissionStatus(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

```ts
type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'limited' | 'unsupported' | 'unknown'
```

| 플랫폼  | 동작                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS   | 앱 번들 밖에서 호출하면 `unknown`을 반환합니다.                                                                                                                       |
| Windows | 앱 사용자 모델 ID로 알림 권한을 조회합니다.<br>앱별 거부 상태가 없으면 Windows는 기본적으로 허용 상태로 봅니다.<br>앱 ID가 없거나 비어 있으면 `unknown`을 반환합니다. |
| Linux   | `unsupported`를 반환합니다.                                                                                                                                           |

```ts
import { getNotificationPermissionStatus } from '@ban-dal/os-bridge'

const status = getNotificationPermissionStatus({ appUserModelId: 'com.example.my-app' })
```

Windows Electron 앱에서는 `app.setAppUserModelId(...)`에 사용한 것과 같은 앱 사용자 모델 ID를 전달하세요.

`getPermissionStatus(appUserModelId?)`는 저수준 호환 별칭으로 계속 사용할 수 있습니다.

### requestMacNotificationPermission

`macOS` `Windows 상태 확인만`

```ts
function requestMacNotificationPermission(options?: NotificationDiagnosticsOptions): NotificationPermissionStatus
```

macOS에서 알림 권한을 요청하고, 요청 결과의 권한 상태를 반환합니다.

Windows는 앱 알림 권한을 요청하는 OS API를 제공하지 않습니다. 기본 알림 상태도 허용이므로, Windows 진단에는 `getNotificationPermissionStatus` 또는 `getNotificationCapability`를 사용하세요.

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

OS가 현재 일반 알림 전달 상태인지, 제한된 알림 전달 상태인지 반환합니다.
`limited`는 진단용 컨텍스트일 뿐입니다. 이 앱의 알림이 반드시 차단된다는 뜻은 아닙니다.

#### macOS

macOS에서는 다음 조건이 필요합니다.

1. Apple Developer > Identifiers > 해당 App ID에 Communication Notifications가 활성화되어 있어야 합니다.
2. ad-hoc이 아닌, 해당 계정을 사용한 Code Sign이 이뤄진 번들된 앱이어야 합니다.
3. 시스템 설정 > 개인정보 보호 및 보안 > 집중 모드에서 앱을 활성화해야 합니다. 이는 `requestMacFocusStatusAuthorization()` 함수로 사용자에게 요청 Alert을 띄울 수 있습니다.

macOS가 집중 모드 또는 방해금지 모드여도 현재 집중 모드의 허용된 앱에 이 앱이 포함되어 있으면 `normal`로 응답됩니다.

#### Windows

Windows에서는 `ToastNotificationManager.GetDefault().NotificationMode()`에서 방해 수준을 읽습니다.

- `Unrestricted`는 `normal`을 반환합니다.
- `PriorityOnly`와 `AlarmsOnly`는 `limited`를 반환합니다.

Windows는 이 앱이 사용자의 우선순위 앱 목록에 포함되어 있는지 노출하지 않습니다. 따라서 `limited`는 시스템이 알림을 제한하고 있다는 뜻이지, 이 앱이 반드시 차단된다는 뜻은 아닙니다.

### requestMacFocusStatusAuthorization

`macOS`

```ts
function requestMacFocusStatusAuthorization(): NotificationInterruptionLevel
```

이 앱과 집중 모드 상태를 공유하도록 권한을 요청하고, 요청 후 현재 방해 수준을 반환합니다.

OS가 이미 요청을 처리했다면 시스템이 다시 알림 창을 표시하지 않을 수 있습니다.

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

`canNotify`는 플랫폼 지원 여부, 알림 권한, 플랫폼별 요구 사항을 바탕으로 결정됩니다.
예를 들어 Windows에서는 유효한 앱 사용자 모델 ID도 필요합니다.

방해 수준은 진단용 컨텍스트로 반환됩니다. 확정적인 알림 차단 사유로 취급되지는 않습니다.

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

## 기능 문서 추가하기

- `Feature Index`에 행 하나를 추가하세요.
- `Features` 아래에 `### 기능 이름` 섹션 하나를 추가하세요.
- 시그니처, export된 타입, 플랫폼 참고 사항을 포함하고, Electron 예제는 필요할 때만 추가하세요.

## 개발

```bash
pnpm install
pnpm build
pnpm test
```

### 수동 Electron Probe

현재 OS 알림 및 집중 모드 상태와 이 패키지의 진단 결과를 실제로 비교해야 할 때는 `electron-probe/`를 사용하세요.

```bash
pnpm build
cd electron-probe
cp .env.example .env
pnpm install
pnpm dev
```

macOS 앱 번들 테스트:

```bash
cd electron-probe
pnpm pack:mac
```

probe는 macOS 집중 모드 상태 접근을 요청할 수 있습니다. 패키징된 앱에는 `NSFocusStatusUsageDescription`이 포함됩니다.

macOS probe 패키지는 수동 테스트를 위해 로컬에서 ad-hoc 서명됩니다.
