import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { requireAuth } from '../middleware/auth.js'

export const statsRouter = Router()

statsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const userId = req.user!.sub

  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({
      submissionCount: 0,
      totalScore: 0,
      rank: null,
      teamName: null,
      completedModules: 0,
      totalModules: 0,
    })
  }

  const submissionStats = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(score), 0) AS total_score
       FROM submissions
       WHERE user_id = ?`,
    )
    .get(userId) as { count: number; total_score: number }

  const team = db
    .prepare(
      `SELECT t.id, t.name
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE t.hackathon_id = ? AND tm.user_id = ?
       LIMIT 1`,
    )
    .get(hackathon.id, userId) as { id: number; name: string } | undefined

  let rank: number | null = null
  if (team) {
    const ranked = db
      .prepare(
        `SELECT ranked.rank
         FROM (
           SELECT t.id,
                  RANK() OVER (ORDER BY COALESCE(SUM(s.score), 0) DESC) AS rank
           FROM teams t
           LEFT JOIN submissions s ON s.team_id = t.id AND s.score IS NOT NULL
           WHERE t.hackathon_id = ?
           GROUP BY t.id
         ) ranked
         WHERE ranked.id = ?`,
      )
      .get(hackathon.id, team.id) as { rank: number } | undefined

    rank = ranked?.rank ?? null
  }

  const moduleStats = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM skill_modules WHERE hackathon_id = ?) AS total,
         (SELECT COUNT(*) FROM skill_progress WHERE user_id = ? AND status = 'completed') AS completed`,
    )
    .get(hackathon.id, userId) as { total: number; completed: number }

  return res.json({
    submissionCount: submissionStats.count,
    totalScore: submissionStats.total_score,
    rank,
    teamName: team?.name ?? null,
    completedModules: moduleStats.completed,
    totalModules: moduleStats.total,
  })
})
