import { authClient } from './neon-auth'

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await authClient.getSession()
    return data?.session?.token ?? null
  } catch {
    return null
  }
}
