const fs = require('node:fs')
const path = require('node:path')

require('./scripts/env').loadProbeEnv()

const projectDir = __dirname

function findSigningCertificate() {
  if (process.env.CSC_LINK) {
    const cscLink = process.env.CSC_LINK
    const candidates = [cscLink, path.join(projectDir, cscLink)]
    const certificatePath = candidates.find((candidate) => fs.existsSync(candidate))

    if (certificatePath) {
      return certificatePath
    }
  }

  const defaultCertificatePath = path.join(projectDir, 'certificate.p12')
  if (fs.existsSync(defaultCertificatePath)) {
    return defaultCertificatePath
  }

  return fs.readdirSync(projectDir).find((file) => file.endsWith('.p12'))
}

const signingCertificate = findSigningCertificate()
const hasAppleNotarizationEnv =
  Boolean(process.env.APPLE_ID) &&
  Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD) &&
  Boolean(process.env.APPLE_TEAM_ID) &&
  Boolean(process.env.CSC_KEY_PASSWORD)
const shouldUseDeveloperSigning = Boolean(signingCertificate) && hasAppleNotarizationEnv

if (shouldUseDeveloperSigning) {
  process.env.CSC_LINK = path.isAbsolute(signingCertificate)
    ? signingCertificate
    : path.join(projectDir, signingCertificate)
}

module.exports = {
  appId: process.env.PROBE_APP_ID,
  productName: process.env.PROBE_PRODUCT_NAME,
  executableName: process.env.PROBE_PRODUCT_NAME,
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  directories: {
    output: 'dist',
  },
  files: ['package.json', 'dist-electron/**/*', 'renderer-dist/**/*'],
  extraResources: [
    {
      from: '..',
      to: 'os-bridge',
      filter: ['index.js', 'index.d.ts', 'os-bridge*.node'],
    },
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    electronLanguages: ["ko", "en"],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // entitlements: 'entitlements.mac.plist',
    // entitlementsInherit: 'entitlements.mac.plist',
    extendInfo: {
      NSFocusStatusUsageDescription: 'OS Bridge Probe reads Focus status to verify notification diagnostics.',
      NSUserNotificationAlertStyle: "alert",
      ElectronTeamID: shouldUseDeveloperSigning ? process.env.APPLE_TEAM_ID : null,
    },
    notarize: false,
    cscLink: shouldUseDeveloperSigning ? "certificate.p12" : null,
  },
  afterPack: shouldUseDeveloperSigning ? null : './scripts/ad-hoc-sign-mac.js',
  win: {
    target: ['dir'],
  },
}
