const path = require('node:path')
const dotenv = require('dotenv')

function loadProbeEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  const result = dotenv.config({ path: envPath })

  if (!process.env.PROBE_APP_ID) {
    process.env.PROBE_APP_ID = 'com.bandal.osbridge.probe'
  }

  if (!process.env.PROBE_PRODUCT_NAME) {
    process.env.PROBE_PRODUCT_NAME = 'OS Bridge Probe'
  }

  return {
    loaded: !result.error,
    envPath,
  }
}

module.exports = { loadProbeEnv }
