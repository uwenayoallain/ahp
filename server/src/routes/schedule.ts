import { asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { scheduleEvents } from '../db/schema.js'

export const scheduleRouter = Router()

scheduleRouter.get('/', async (_req, res) => {
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const db = getDb()
  const events = await db
    .select({
      id: scheduleEvents.id,
      day_number: scheduleEvents.dayNumber,
      time: scheduleEvents.time,
      title: scheduleEvents.title,
      venue: scheduleEvents.venue,
      sort_order: scheduleEvents.sortOrder,
    })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.hackathonId, hackathon.id))
    .orderBy(asc(scheduleEvents.dayNumber), asc(scheduleEvents.sortOrder))

  return res.set('Cache-Control', 'public, max-age=300').json({ items: events })
})
