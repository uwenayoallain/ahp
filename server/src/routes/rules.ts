import { asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { rules } from '../db/schema.js'

export const rulesRouter = Router()

rulesRouter.get('/', async (_req, res) => {
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const db = getDb()
  const items = await db
    .select({
      id: rules.id,
      title: rules.title,
      body: rules.body,
      sort_order: rules.sortOrder,
    })
    .from(rules)
    .where(eq(rules.hackathonId, hackathon.id))
    .orderBy(asc(rules.sortOrder))

  return res.set('Cache-Control', 'public, max-age=300').json({ items })
})
