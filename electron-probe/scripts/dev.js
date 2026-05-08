const { spawn } = require('node:child_process')
const electron = require('electron')
const { loadProbeEnv } = require('./env')

loadProbeEnv()

let electronProcess

async function main() {
  const { createServer } = await import('vite')
  const vite = await createServer({
    configFile: `${__dirname}/../vite.config.ts`,
  })

  await vite.listen()
  vite.printUrls()

  const rendererUrl = vite.resolvedUrls?.local[0]

  if (!rendererUrl) {
    throw new Error('Vite dev server did not expose a local URL')
  }

  electronProcess = spawn(electron, ['.'], {
    cwd: `${__dirname}/..`,
    env: {
      ...process.env,
      PROBE_RENDERER_URL: rendererUrl,
    },
    stdio: 'inherit',
  })

  electronProcess.on('exit', (code) => {
    vite.close()
    process.exit(code ?? 0)
  })

  process.on('SIGINT', () => {
    electronProcess.kill()
    vite.close()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    electronProcess.kill()
    vite.close()
    process.exit(0)
  })
}

main().catch((error) => {
  if (electronProcess) {
    electronProcess.kill()
  }

  console.error(error)
  process.exit(1)
})
