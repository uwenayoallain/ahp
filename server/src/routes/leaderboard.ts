import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { parsePagination } from '../pagination.js'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const db = getDb()
  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [], total: 0, page, limit })
  }

  const total = (db
    .prepare('SELECT COUNT(*) AS count FROM teams WHERE hackathon_id = ?')
    .get(hackathon.id) as { count: number }).count

  const teams = db
    .prepare(
      `SELECT t.id, t.name,
              COUNT(DISTINCT tm.user_id) AS member_count,
              COALESCE(SUM(s.score), 0) AS total_score,
              COUNT(DISTINCT s.id) AS submission_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       LEFT JOIN submissions s ON s.team_id = t.id AND s.score IS NOT NULL
       WHERE t.hackathon_id = ?
       GROUP BY t.id
       ORDER BY total_score DESC, submission_count DESC
       LIMIT ? OFFSET ?`,
    )
    .all(hackathon.id, limit, offset)

  return res.json({ items: teams, total, page, limit })
})
