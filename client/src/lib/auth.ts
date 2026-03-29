import { getAuthClient } from './neon-auth'

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await getAuthClient().getSession()
    return (data as { session?: { token?: string } } | null)?.session?.token ?? null
  } catch {
    return null
  }
}
