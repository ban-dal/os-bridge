import test from 'ava'

import { getPermissionStatus } from '../index'

const permissionStatuses = new Set(['granted', 'denied', 'not-determined', 'limited', 'unsupported', 'unknown'])

test('reads notification permission status', (t) => {
  t.true(permissionStatuses.has(getPermissionStatus()))
})
