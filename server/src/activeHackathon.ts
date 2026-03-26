import { eq } from 'drizzle-orm'
import { getDb } from './db/connection.js'
import { hackathons } from './db/schema.js'

type ActiveHackathon = { id: number }

export async function getActiveHackathon(): Promise<ActiveHackathon | undefined> {
  const db = getDb()
  const [row] = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.isActive, true))
    .limit(1)
  return row
}
