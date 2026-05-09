import test from 'ava'

import { getNotificationCapability, getNotificationInterruptionLevel, getNotificationPermissionStatus } from '../index'

const permissionStatuses = new Set(['granted', 'denied', 'not-determined', 'limited', 'unsupported', 'unknown'])
const notificationInterruptionLevels = new Set(['normal', 'limited', 'unsupported', 'unknown'])

test('reads notification permission status', (t) => {
  t.true(permissionStatuses.has(getNotificationPermissionStatus()))
})

test('reads notification interruption level as a stable value', (t) => {
  t.true(notificationInterruptionLevels.has(getNotificationInterruptionLevel()))
})

test('reads notification capability as a stable shape', (t) => {
  const capability = getNotificationCapability()

  t.is(typeof capability.canNotify, 'boolean')
  t.true(permissionStatuses.has(capability.permission))
  t.true(notificationInterruptionLevels.has(capability.interruptionLevel))
  t.true(Array.isArray(capability.reasons))
})
