import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'

export const challengesRouter = Router()

challengesRouter.get('/', (_req, res) => {
  const db = getDb()
  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const challenges = db
    .prepare(
      `SELECT id, day_number, title, slug, difficulty, summary, max_points, unlock_at
       FROM challenges
       WHERE hackathon_id = ?
       ORDER BY day_number ASC`,
    )
    .all(hackathon.id)

  return res.set('Cache-Control', 'public, max-age=300').json({ items: challenges })
})

challengesRouter.get('/:idOrSlug', (req, res) => {
  const db = getDb()
  const param = req.params.idOrSlug
  const isNumeric = /^\d+$/.test(param)

  const challenge = isNumeric
    ? db
        .prepare(
          `SELECT id, hackathon_id, day_number, title, slug, difficulty, summary, description,
                  setup_instructions, resources, max_points, unlock_at
           FROM challenges WHERE id = ?`,
        )
        .get(Number(param))
    : db
        .prepare(
          `SELECT id, hackathon_id, day_number, title, slug, difficulty, summary, description,
                  setup_instructions, resources, max_points, unlock_at
           FROM challenges WHERE slug = ?`,
        )
        .get(param)

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' })
  }

  const row = challenge as Record<string, unknown>
  if (typeof row.resources === 'string') {
    try {
      row.resources = JSON.parse(row.resources as string)
    } catch {
      row.resources = []
    }
  }

  return res.set('Cache-Control', 'public, max-age=300').json(challenge)
})
