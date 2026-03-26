import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { hackathons } from '../db/schema.js'

export const hackathonsRouter = Router()

hackathonsRouter.get('/active', async (_req, res) => {
  const db = getDb()
  const [hackathon] = await db
    .select({
      id: hackathons.id,
      name: hackathons.name,
      slug: hackathons.slug,
      description: hackathons.description,
      start_date: hackathons.startDate,
      end_date: hackathons.endDate,
    })
    .from(hackathons)
    .where(eq(hackathons.isActive, true))
    .limit(1)

  if (!hackathon) {
    return res.status(404).json({ error: 'No active hackathon' })
  }

  return res.json(hackathon)
})
