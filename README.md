# os-bridge

Native OS capability bridge for Node.js, powered by napi-rs.

## Install

```bash
pnpm add os-bridge
```

## Usage

```ts
import { getPermissionStatus } from 'os-bridge'

const status = getPermissionStatus()
```

`getPermissionStatus(appUserModelId?: string)` returns one of:

- `granted`
- `denied`
- `not-determined`
- `limited`
- `unsupported`
- `unknown`

Windows notification permission lookup requires the app user model id. macOS returns `unknown` outside an app bundle.

## Development

```bash
pnpm install
pnpm build
pnpm test
```
