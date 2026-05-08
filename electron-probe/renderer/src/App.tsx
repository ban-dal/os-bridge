import { useEffect, useMemo, useState } from 'react'

type ProbeState = {
  diagnostics: ProbeDiagnostics | null
  notificationAttempt: NotificationAttempt | null
  permissionRequest: NotificationPermissionRequest | null
  error: string | null
  loading: boolean
}

const statusClassName = 'rounded-md border px-2 py-1 font-mono text-sm'
const buttonClassName =
  'inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50'

function formatBoolean(value: boolean) {
  return value ? 'yes' : 'no'
}

function App() {
  const [state, setState] = useState<ProbeState>({
    diagnostics: null,
    notificationAttempt: null,
    permissionRequest: null,
    error: null,
    loading: false,
  })

  async function refresh(options?: { requestFocusAuthorization?: boolean }) {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const diagnostics = await window.probe.getDiagnostics(options)
      setState((current) => ({ ...current, diagnostics, loading: false }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      }))
    }
  }

  async function sendNotification(method: NotificationMethod) {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const notificationAttempt = await window.probe.sendNotification({ method })
      const diagnostics = await window.probe.getDiagnostics()
      setState((current) => ({ ...current, notificationAttempt, diagnostics, loading: false }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      }))
    }
  }

  async function requestNotificationPermission() {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const permissionRequest = await window.probe.requestNotificationPermission()
      setState((current) => ({
        ...current,
        diagnostics: permissionRequest.diagnostics,
        permissionRequest,
        loading: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      }))
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const rawResult = useMemo(
    () =>
      JSON.stringify(
        {
          notificationAttempt: state.notificationAttempt,
          permissionRequest: state.permissionRequest,
          diagnostics: state.diagnostics,
          error: state.error,
        },
        null,
        2,
      ),
    [state.diagnostics, state.error, state.notificationAttempt, state.permissionRequest],
  )

  const capability = state.diagnostics?.bridge.capability

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">OS Bridge Electron Probe</h1>
        <p className="text-sm text-zinc-600">
          Manual harness for checking notification diagnostics against real OS state.
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        <button className={buttonClassName} disabled={state.loading} type="button" onClick={() => refresh()}>
          Refresh
        </button>
        <button
          className={buttonClassName}
          disabled={state.loading}
          type="button"
          onClick={() => refresh({ requestFocusAuthorization: true })}
        >
          Request Focus Access
        </button>
        <button
          className={buttonClassName}
          disabled={state.loading}
          type="button"
          onClick={() => sendNotification('electron')}
        >
          Send Electron Notification
        </button>
        <button
          className={buttonClassName}
          disabled={state.loading}
          type="button"
          onClick={() => sendNotification('osascript')}
        >
          Send osascript Notification
        </button>
        <button
          className={buttonClassName}
          disabled={state.loading}
          type="button"
          onClick={requestNotificationPermission}
        >
          Request Notification Access
        </button>
        <button className={buttonClassName} type="button" onClick={() => navigator.clipboard.writeText(rawResult)}>
          Copy JSON
        </button>
        <button className={buttonClassName} type="button" onClick={() => window.probe.openBridgePath()}>
          Reveal Bridge
        </button>
      </section>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Status label="Can Notify" value={capability ? formatBoolean(capability.canNotify) : '-'} />
        <Status label="Permission" value={state.diagnostics?.bridge.permission ?? '-'} />
        <Status label="Request Permission" value={state.permissionRequest?.permission ?? '-'} />
        <Status label="Focus Status" value={state.diagnostics?.bridge.focusStatus ?? '-'} />
        <Status
          label="Electron Support"
          value={state.diagnostics ? formatBoolean(state.diagnostics.electronNotificationSupported) : '-'}
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Reasons</h2>
        <div className="flex flex-wrap gap-2">
          {(capability?.reasons.length ? capability.reasons : ['none']).map((reason) => (
            <span className={statusClassName} key={reason}>
              {reason}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Raw Result</h2>
        <pre className="max-h-[460px] overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
          {rawResult}
        </pre>
      </section>
    </main>
  )
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 break-words font-mono text-lg text-zinc-950">{value}</div>
    </div>
  )
}

export default App
