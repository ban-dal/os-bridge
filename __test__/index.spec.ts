import test from 'ava'

import { getNotificationCapability, getNotificationFocusStatus, getNotificationPermissionStatus } from '../index'

const permissionStatuses = new Set(['granted', 'denied', 'not-determined', 'limited', 'unsupported', 'unknown'])
const notificationFocusStatuses = new Set(['active', 'inactive', 'unsupported', 'unknown'])

test('reads notification permission status', (t) => {
  t.true(permissionStatuses.has(getNotificationPermissionStatus()))
})

test('reads notification focus status as a stable value', (t) => {
  t.true(notificationFocusStatuses.has(getNotificationFocusStatus()))
})

test('reads notification capability as a stable shape', (t) => {
  const capability = getNotificationCapability()

  t.is(typeof capability.canNotify, 'boolean')
  t.true(permissionStatuses.has(capability.permission))
  t.true(notificationFocusStatuses.has(capability.focusStatus))
  t.true(Array.isArray(capability.reasons))
})
