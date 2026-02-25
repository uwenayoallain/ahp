import { Router } from 'express'
import { getDb } from '../db/connection.js'
import { requireAuth } from '../middleware/auth.js'
import { parsePagination } from '../pagination.js'
import { getSubmissionById } from '../services/submissions.js'

export const submissionsRouter = Router()

submissionsRouter.use(requireAuth)

submissionsRouter.get('/categories', (_req, res) => {
  const db = getDb()
  const rows = db
    .prepare('SELECT DISTINCT category FROM submissions ORDER BY category')
    .all() as { category: string }[]
  return res.json({ items: rows.map((r) => r.category) })
})

submissionsRouter.get('/', (req, res) => {
  const userId = req.user?.sub
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const total = (db
    .prepare('SELECT COUNT(*) AS count FROM submissions WHERE user_id = ?')
    .get(userId) as { count: number }).count

  const items = db
    .prepare(
      `SELECT s.id, s.local_id, s.team_id, s.team_name, s.challenge_id, s.project_title,
              s.description, s.category, s.status, s.score, s.version, s.created_at, s.updated_at,
              c.title AS challenge_title, c.day_number
       FROM submissions s
       LEFT JOIN challenges c ON c.id = s.challenge_id
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(userId, limit, offset)

  return res.json({ items, total, page, limit })
})

submissionsRouter.get('/:id', (req, res) => {
  const submissionId = Number(req.params.id)
  if (Number.isNaN(submissionId)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const submission = getSubmissionById(submissionId) as
    | { id: number; user_id: number; [key: string]: unknown }
    | undefined

  if (!submission) {
    return res.status(404).json({ error: 'Not found' })
  }

  if (req.user?.role !== 'admin' && submission.user_id !== req.user?.sub) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  return res.json(submission)
})
