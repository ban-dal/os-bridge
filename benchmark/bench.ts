import { Bench } from 'tinybench'

import { getPermissionStatus } from '../index.js'

const b = new Bench()

b.add('getPermissionStatus', () => {
  getPermissionStatus()
})

await b.run()

console.table(b.table())
