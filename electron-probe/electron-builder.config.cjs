require('./scripts/env').loadProbeEnv()

module.exports = {
  appId: process.env.PROBE_APP_ID || 'com.bandal.osbridge.probe',
  productName: process.env.PROBE_PRODUCT_NAME || 'OS Bridge Probe',
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
    entitlements: 'entitlements.mac.plist',
    entitlementsInherit: 'entitlements.mac.plist',
    extendInfo: {
      NSFocusStatusUsageDescription: 'OS Bridge Probe reads Focus status to verify notification diagnostics.',
      NSUserNotificationAlertStyle: "alert",
    },
    identity: null,
    target: ['dir'],
  },
  afterPack: './scripts/ad-hoc-sign-mac.js',
  win: {
    target: ['dir'],
  },
}
