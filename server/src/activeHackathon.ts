import { getDb } from './db/connection.js'

type ActiveHackathon = { id: number }

export function getActiveHackathon(): ActiveHackathon | undefined {
  const db = getDb()
  return db
    .prepare('SELECT id FROM hackathons WHERE is_active = 1 LIMIT 1')
    .get() as ActiveHackathon | undefined
}
