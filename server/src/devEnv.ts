import { config } from 'dotenv'

export function applyDevEnv() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return
  }

  config({ path: '.env' })
}
