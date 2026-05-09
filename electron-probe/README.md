# OS Bridge Electron Probe

Manual Electron app for physically checking notification diagnostics against the current OS state.

## Setup

```bash
cd electron-probe
cp .env.example .env
pnpm install
```

This project pins pnpm 10 and explicitly allows the `electron` and `esbuild` install scripts in `pnpm-workspace.yaml`. That lets a fresh clone run Electron's postinstall step during `pnpm install`, so `pnpm dev` can start without a separate rebuild.

```dotenv
PROBE_APP_ID=com.bandal.osbridge.probe
PROBE_PRODUCT_NAME=OS Bridge Probe
```

## Run

Build the native addon from the repository root first.

```bash
pnpm build
cd electron-probe
pnpm dev
```

On macOS, `pnpm dev` runs through Electron's development app bundle, so System Settings may not list `PROBE_PRODUCT_NAME`. Use the packaged `.app` when checking whether this probe appears in Settings > Notifications.

## Package

```bash
cd electron-probe
pnpm pack:mac
```

The packaged `.app` is written to `electron-probe/dist`. For macOS Focus testing, prefer the packaged app over `pnpm dev` because notification permissions and bundle identity are tied to the app bundle.

The macOS package is ad-hoc signed locally and includes `NSFocusStatusUsageDescription`, which macOS requires before using `INFocusStatusCenter`.

## Manual Checks

1. Open the probe app.
2. Press `Request Focus Access` on macOS and approve the system prompt if shown.
3. Toggle Focus in the OS.
4. Press `Refresh`.
5. Press `Request Notification Access` in the packaged macOS app and approve the system prompt if shown.
6. Press `Send Notification` and confirm whether a notification appears.
7. Compare `canNotify`, `permission`, `interruptionLevel`, and `reasons` with the actual OS state.

On Windows, set `PROBE_APP_ID` to the same value used as the app user model id. The probe calls `app.setAppUserModelId(PROBE_APP_ID)` and writes a Start Menu shortcut named `PROBE_PRODUCT_NAME` with that app user model id. Restart the dev app once after the shortcut is created so new notifications can resolve the display name in Windows notification UI.
