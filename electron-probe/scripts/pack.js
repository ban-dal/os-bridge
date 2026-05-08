const { existsSync, rmSync } = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const { loadProbeEnv } = require('./env')

loadProbeEnv()

const repoRoot = path.resolve(__dirname, '..', '..')
const nativeFilesReady = ['darwin-arm64', 'darwin-x64', 'win32-x64-msvc'].some((target) =>
  existsSync(path.join(repoRoot, `os-bridge.${target}.node`)),
)

if (!existsSync(path.join(repoRoot, 'index.js')) || !nativeFilesReady) {
  console.error('Build the native bridge first from the repository root: pnpm build')
  process.exit(1)
}

const builderBin = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder',
)
rmSync(path.join(__dirname, '..', 'dist'), { recursive: true, force: true })

const buildResult = spawnSync('pnpm', ['build'], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
})

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1)
}

const args = ['--config', 'electron-builder.config.cjs', ...process.argv.slice(2)]

const child = spawn(builderBin, args, {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code) => {
  if ((code ?? 0) !== 0) {
    process.exit(code ?? 1)
  }

  process.exit(0)
})
