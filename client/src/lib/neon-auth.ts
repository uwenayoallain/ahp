import { createAuthClient } from '@neondatabase/neon-js/auth'
import { getConfig } from './config'

type AuthClient = ReturnType<typeof createAuthClient>

let _client: AuthClient | null = null

export function getAuthClient(): AuthClient {
  if (!_client) {
    _client = createAuthClient(getConfig().neonAuthUrl)
  }
  return _client
}
