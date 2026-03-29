import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

export function applyDevEnv() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return
  }

  const dir = path.dirname(fileURLToPath(import.meta.url))
  const rootEnv = path.resolve(dir, '../../.env')
  const rootLocalEnv = path.resolve(dir, '../../.env.local')
  const serverEnv = path.resolve(dir, '../.env')
  const serverLocalEnv = path.resolve(dir, '../.env.local')

  config({ path: rootEnv })
  config({ path: rootLocalEnv, override: true })
  config({ path: serverEnv })
  config({ path: serverLocalEnv, override: true })
}
