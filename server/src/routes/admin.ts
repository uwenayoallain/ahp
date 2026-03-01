import { Router } from 'express'
import { getDb } from '../db/connection.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { parsePagination } from '../pagination.js'
import { getAdminSubmissionById, scoreSubmission } from '../services/submissions.js'

export const adminRouter = Router()

adminRouter.use(requireAuth)
adminRouter.use(requireAdmin)

adminRouter.get('/submissions', (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const total = (db.prepare('SELECT COUNT(*) AS count FROM submissions').get() as { count: number }).count

  const items = db
    .prepare(
      `SELECT s.id, s.user_id, s.team_id, s.team_name, s.challenge_id, s.project_title,
              s.category, s.status, s.score, s.version, s.updated_at,
              c.title AS challenge_title, c.day_number,
              u.name AS user_name
       FROM submissions s
       LEFT JOIN challenges c ON c.id = s.challenge_id
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset)

  return res.json({ items, total, page, limit })
})

adminRouter.get('/submissions/:id', (req, res) => {
  const id = Number(req.params.id)
  const submission = getAdminSubmissionById(id)

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  return res.json(submission)
})

adminRouter.get('/users', (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const total = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count

  const users = db
    .prepare(
      `
      SELECT u.id, u.name, u.email, u.role,
             COUNT(DISTINCT sp.module_id) AS modules_started,
             MAX(sp.updated_at) AS last_progress
      FROM users u
      LEFT JOIN skill_progress sp ON sp.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `,
    )
    .all(limit, offset)

  const hackathon = db
    .prepare('SELECT id FROM hackathons WHERE is_active = 1 LIMIT 1')
    .get() as { id: number } | undefined

  const totalModules = hackathon
    ? (db.prepare('SELECT COUNT(*) AS count FROM skill_modules WHERE hackathon_id = ?').get(hackathon.id) as { count: number }).count
    : 0

  return res.json({ items: users, total, page, limit, totalModules })
})

adminRouter.get('/stats', (_req, res) => {
  const db = getDb()
  const stats = {
    totalSubmissions: (db.prepare('SELECT COUNT(*) as count FROM submissions').get() as { count: number })
      .count,
    totalUsers: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
    reviewRate:
      (db
        .prepare(
          `
          SELECT
            COALESCE(
              CAST(SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS FLOAT)
              / NULLIF(COUNT(*), 0),
              0
            ) AS rate
          FROM submissions
        `,
        )
        .get() as { rate: number }).rate,
  }

  return res.json(stats)
})

adminRouter.patch('/submissions/:id/score', (req, res) => {
  const id = Number(req.params.id)
  const { score } = req.body as { score?: number }

  if (score === undefined || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Score must be a non-negative number' })
  }

  const db = getDb()
  const submission = db.prepare(
    `SELECT s.id, s.challenge_id, c.max_points
     FROM submissions s
     LEFT JOIN challenges c ON c.id = s.challenge_id
     WHERE s.id = ?`,
  ).get(id) as { id: number; challenge_id: number | null; max_points: number | null } | undefined

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  if (submission.max_points !== null && score > submission.max_points) {
    return res.status(400).json({ error: `Score cannot exceed ${submission.max_points} points` })
  }

  scoreSubmission(id, score, 'reviewed')
  return res.json({ status: 'scored', id, score })
})
