import { Router } from 'express'
import { getDb } from '../db/connection.js'

export const hackathonsRouter = Router()

hackathonsRouter.get('/active', (_req, res) => {
  const db = getDb()
  const hackathon = db
    .prepare(
      'SELECT id, name, slug, description, start_date, end_date FROM hackathons WHERE is_active = 1 LIMIT 1',
    )
    .get()

  if (!hackathon) {
    return res.status(404).json({ error: 'No active hackathon' })
  }

  return res.json(hackathon)
})
