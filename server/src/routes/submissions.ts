import { desc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import { getDb } from '../db/connection.js'
import { submissions, challenges } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { parsePagination } from '../pagination.js'
import { getSubmissionById } from '../services/submissions.js'

export const submissionsRouter = Router()

submissionsRouter.use(requireAuth)

submissionsRouter.get('/categories', async (_req, res) => {
  const db = getDb()
  const rows = await db
    .selectDistinct({ category: submissions.category })
    .from(submissions)
    .orderBy(submissions.category)
  return res.json({ items: rows.map((row) => row.category) })
})

submissionsRouter.get('/', async (req, res) => {
  const userId = req.user?.sub
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(eq(submissions.userId, userId))

  const total = totalRow?.count ?? 0

  const items = await db
    .select({
      id: submissions.id,
      local_id: submissions.localId,
      team_id: submissions.teamId,
      team_name: submissions.teamName,
      challenge_id: submissions.challengeId,
      project_title: submissions.projectTitle,
      description: submissions.description,
      category: submissions.category,
      status: submissions.status,
      score: submissions.score,
      version: submissions.version,
      created_at: submissions.createdAt,
      updated_at: submissions.updatedAt,
      challenge_title: challenges.title,
      day_number: challenges.dayNumber,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.updatedAt))
    .limit(limit)
    .offset(offset)

  return res.json({ items, total, page, limit })
})

submissionsRouter.get('/:id', async (req, res) => {
  const submissionId = Number(req.params.id)
  if (Number.isNaN(submissionId)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const submission = await getSubmissionById(submissionId)

  if (!submission) {
    return res.status(404).json({ error: 'Not found' })
  }

  if (req.user?.role !== 'admin' && submission.user_id !== req.user?.sub) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  return res.json(submission)
})
