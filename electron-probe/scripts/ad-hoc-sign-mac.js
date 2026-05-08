const { spawnSync } = require('node:child_process')
const path = require('node:path')

exports.default = async function adHocSignMac(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const productFilename = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${productFilename}.app`)
  const entitlementsPath = path.join(context.packager.projectDir, 'entitlements.mac.plist')

  const result = spawnSync(
    'codesign',
    ['--force', '--deep', '--sign', '-', '--options', 'runtime', '--entitlements', entitlementsPath, appPath],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) {
    throw new Error(`ad-hoc macOS code signing failed with exit code ${result.status ?? 1}`)
  }
}
