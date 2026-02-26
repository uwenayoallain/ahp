import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'

export const scheduleRouter = Router()

scheduleRouter.get('/', (_req, res) => {
  const db = getDb()
  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const events = db
    .prepare(
      `SELECT id, day_number, time, title, venue, sort_order
       FROM schedule_events
       WHERE hackathon_id = ?
       ORDER BY day_number ASC, sort_order ASC`,
    )
    .all(hackathon.id)

  return res.set('Cache-Control', 'public, max-age=300').json({ items: events })
})
