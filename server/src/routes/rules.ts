import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'

export const rulesRouter = Router()

rulesRouter.get('/', (_req, res) => {
  const db = getDb()
  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const rules = db
    .prepare(
      `SELECT id, title, body, sort_order
       FROM rules
       WHERE hackathon_id = ?
       ORDER BY sort_order ASC`,
    )
    .all(hackathon.id)

  return res.set('Cache-Control', 'public, max-age=300').json({ items: rules })
})
