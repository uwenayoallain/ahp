import { asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { challenges } from '../db/schema.js'

export const challengesRouter = Router()

challengesRouter.get('/', async (_req, res) => {
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const db = getDb()
  const items = await db
    .select({
      id: challenges.id,
      day_number: challenges.dayNumber,
      title: challenges.title,
      slug: challenges.slug,
      difficulty: challenges.difficulty,
      summary: challenges.summary,
      max_points: challenges.maxPoints,
      unlock_at: challenges.unlockAt,
      submission_deadline_at: challenges.submissionDeadlineAt,
    })
    .from(challenges)
    .where(eq(challenges.hackathonId, hackathon.id))
    .orderBy(asc(challenges.dayNumber))

  return res.set('Cache-Control', 'public, max-age=300').json({ items })
})

challengesRouter.get('/:idOrSlug', async (req, res) => {
  const db = getDb()
  const param = req.params.idOrSlug
  const isNumeric = /^\d+$/.test(param)

  const [challenge] = await db
    .select({
      id: challenges.id,
      hackathon_id: challenges.hackathonId,
      day_number: challenges.dayNumber,
      title: challenges.title,
      slug: challenges.slug,
      difficulty: challenges.difficulty,
      summary: challenges.summary,
      description: challenges.description,
      setup_instructions: challenges.setupInstructions,
      resources: challenges.resources,
      max_points: challenges.maxPoints,
      unlock_at: challenges.unlockAt,
      submission_deadline_at: challenges.submissionDeadlineAt,
    })
    .from(challenges)
    .where(isNumeric ? eq(challenges.id, Number(param)) : eq(challenges.slug, param))
    .limit(1)

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' })
  }

  const result: Record<string, unknown> = { ...challenge }
  if (typeof result.resources === 'string') {
    try {
      const parsed = JSON.parse(result.resources as string) as Array<Record<string, unknown>>
      result.resources = parsed.map((item) => ({
        label: typeof item.label === 'string' ? item.label : String(item.title ?? 'Resource'),
        url: typeof item.url === 'string' ? item.url : '',
        type: typeof item.type === 'string' ? item.type : '',
      }))
    } catch {
      result.resources = []
    }
  }

  return res.set('Cache-Control', 'public, max-age=300').json(result)
})
