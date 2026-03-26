import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import { getDb } from '../db/connection.js'
import {
  submissions,
  challenges,
  neonAuthUsersSync,
  userProfiles,
  skillProgress,
  skillModules,
  hackathons,
  scheduleEvents,
  rules,
} from '../db/schema.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { parsePagination } from '../pagination.js'
import { getAdminSubmissionById, scoreSubmission } from '../services/submissions.js'

export const adminRouter = Router()

adminRouter.use(requireAuth)
adminRouter.use(requireAdmin)

function parseIntegerParam(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

async function ensureHackathonExists(hackathonId: number) {
  const db = getDb()
  const [hackathon] = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId))
    .limit(1)

  return hackathon
}

function normalizeDateValue(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value.trim() === '') {
    return null
  }

  return new Date(value)
}

function normalizeResources(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }

  if (typeof value === 'string') {
    if (value.trim() === '') {
      return '[]'
    }

    try {
      JSON.parse(value)
      return value
    } catch {
      throw new Error('invalid-resources')
    }
  }

  return '[]'
}

adminRouter.get('/hackathons', async (_req, res) => {
  const db = getDb()
  const items = await db
    .select({
      id: hackathons.id,
      name: hackathons.name,
      slug: hackathons.slug,
      description: hackathons.description,
      startDate: hackathons.startDate,
      endDate: hackathons.endDate,
      isActive: hackathons.isActive,
      teamSizeMin: hackathons.teamSizeMin,
      teamSizeMax: hackathons.teamSizeMax,
      latePolicy: hackathons.latePolicy,
      latePenaltyPercentPerHour: hackathons.latePenaltyPercentPerHour,
    })
    .from(hackathons)
    .orderBy(desc(hackathons.startDate))

  return res.json({ items })
})

adminRouter.post('/hackathons', async (req, res) => {
  const {
    name,
    slug,
    description,
    startDate,
    endDate,
    teamSizeMin,
    teamSizeMax,
    latePolicy,
    latePenaltyPercentPerHour,
  } = req.body as {
    name?: string
    slug?: string
    description?: string
    startDate?: string
    endDate?: string
    teamSizeMin?: number
    teamSizeMax?: number
    latePolicy?: 'reject' | 'accept_with_penalty'
    latePenaltyPercentPerHour?: number
  }

  if (!name?.trim() || !slug?.trim() || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, slug, startDate, and endDate are required' })
  }

  if ((teamSizeMin ?? 1) < 1 || (teamSizeMax ?? 4) < (teamSizeMin ?? 1)) {
    return res.status(400).json({ error: 'Invalid team size configuration' })
  }

  if (latePolicy !== undefined && latePolicy !== 'reject' && latePolicy !== 'accept_with_penalty') {
    return res.status(400).json({ error: 'Invalid latePolicy' })
  }

  const db = getDb()

  try {
    const [created] = await db
      .insert(hackathons)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() ?? '',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        teamSizeMin: teamSizeMin ?? 1,
        teamSizeMax: teamSizeMax ?? 4,
        latePolicy: latePolicy ?? 'accept_with_penalty',
        latePenaltyPercentPerHour: latePenaltyPercentPerHour ?? 20,
      })
      .returning({
        id: hackathons.id,
        name: hackathons.name,
        slug: hackathons.slug,
        description: hackathons.description,
        startDate: hackathons.startDate,
        endDate: hackathons.endDate,
        isActive: hackathons.isActive,
        teamSizeMin: hackathons.teamSizeMin,
        teamSizeMax: hackathons.teamSizeMax,
        latePolicy: hackathons.latePolicy,
        latePenaltyPercentPerHour: hackathons.latePenaltyPercentPerHour,
      })

    return res.status(201).json(created)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('unique') || message.includes('duplicate key') || message.includes('23505')) {
      return res.status(409).json({ error: 'Hackathon slug already exists' })
    }
    throw err
  }
})

adminRouter.patch('/hackathons/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  const updates = req.body as {
    name?: string
    slug?: string
    description?: string
    startDate?: string
    endDate?: string
    teamSizeMin?: number
    teamSizeMax?: number
    latePolicy?: 'reject' | 'accept_with_penalty'
    latePenaltyPercentPerHour?: number
  }

  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.slug !== undefined) payload.slug = updates.slug.trim()
  if (updates.description !== undefined) payload.description = updates.description.trim()
  if (updates.startDate !== undefined) payload.startDate = new Date(updates.startDate)
  if (updates.endDate !== undefined) payload.endDate = new Date(updates.endDate)
  if (updates.teamSizeMin !== undefined) payload.teamSizeMin = updates.teamSizeMin
  if (updates.teamSizeMax !== undefined) payload.teamSizeMax = updates.teamSizeMax
  if (updates.latePolicy !== undefined) payload.latePolicy = updates.latePolicy
  if (updates.latePenaltyPercentPerHour !== undefined) {
    payload.latePenaltyPercentPerHour = updates.latePenaltyPercentPerHour
  }

  if (
    updates.teamSizeMin !== undefined &&
    updates.teamSizeMax !== undefined &&
    (updates.teamSizeMin < 1 || updates.teamSizeMax < updates.teamSizeMin)
  ) {
    return res.status(400).json({ error: 'Invalid team size configuration' })
  }

  const db = getDb()
  const [updated] = await db
    .update(hackathons)
    .set(payload)
    .where(eq(hackathons.id, id))
    .returning({
      id: hackathons.id,
      name: hackathons.name,
      slug: hackathons.slug,
      description: hackathons.description,
      startDate: hackathons.startDate,
      endDate: hackathons.endDate,
      isActive: hackathons.isActive,
      teamSizeMin: hackathons.teamSizeMin,
      teamSizeMax: hackathons.teamSizeMax,
      latePolicy: hackathons.latePolicy,
      latePenaltyPercentPerHour: hackathons.latePenaltyPercentPerHour,
    })

  if (!updated) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  return res.json(updated)
})

adminRouter.post('/hackathons/:id/activate', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  const db = getDb()
  const [existing] = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.id, id))
    .limit(1)

  if (!existing) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  await db.transaction(async (tx) => {
    await tx.update(hackathons).set({ isActive: false })
    await tx.update(hackathons).set({ isActive: true }).where(eq(hackathons.id, id))
  })

  return res.json({ status: 'activated', id })
})

adminRouter.get('/hackathons/:id/challenges', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const db = getDb()
  const items = await db
    .select({
      id: challenges.id,
      dayNumber: challenges.dayNumber,
      title: challenges.title,
      slug: challenges.slug,
      difficulty: challenges.difficulty,
      summary: challenges.summary,
      description: challenges.description,
      setupInstructions: challenges.setupInstructions,
      resources: challenges.resources,
      maxPoints: challenges.maxPoints,
      unlockAt: challenges.unlockAt,
      submissionDeadlineAt: challenges.submissionDeadlineAt,
    })
    .from(challenges)
    .where(eq(challenges.hackathonId, hackathonId))
    .orderBy(asc(challenges.dayNumber), asc(challenges.id))

  return res.json({ items })
})

adminRouter.post('/hackathons/:id/challenges', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const {
    dayNumber,
    title,
    slug,
    difficulty,
    summary,
    description,
    setupInstructions,
    resources,
    maxPoints,
    unlockAt,
    submissionDeadlineAt,
  } = req.body as {
    dayNumber?: number
    title?: string
    slug?: string
    difficulty?: string
    summary?: string
    description?: string
    setupInstructions?: string
    resources?: unknown
    maxPoints?: number
    unlockAt?: string
    submissionDeadlineAt?: string
  }

  if (!title?.trim() || !slug?.trim() || dayNumber === undefined) {
    return res.status(400).json({ error: 'dayNumber, title, and slug are required' })
  }

  let serializedResources = '[]'
  try {
    serializedResources = normalizeResources(resources)
  } catch {
    return res.status(400).json({ error: 'Invalid resources payload' })
  }

  const db = getDb()

  try {
    const [created] = await db
      .insert(challenges)
      .values({
        hackathonId,
        dayNumber,
        title: title.trim(),
        slug: slug.trim(),
        difficulty: difficulty?.trim() || 'medium',
        summary: summary?.trim() ?? '',
        description: description?.trim() ?? '',
        setupInstructions: setupInstructions?.trim() ?? '',
        resources: serializedResources,
        maxPoints: maxPoints ?? 100,
        unlockAt: normalizeDateValue(unlockAt),
        submissionDeadlineAt: normalizeDateValue(submissionDeadlineAt),
      })
      .returning({
        id: challenges.id,
        dayNumber: challenges.dayNumber,
        title: challenges.title,
        slug: challenges.slug,
        difficulty: challenges.difficulty,
        summary: challenges.summary,
        description: challenges.description,
        setupInstructions: challenges.setupInstructions,
        resources: challenges.resources,
        maxPoints: challenges.maxPoints,
        unlockAt: challenges.unlockAt,
        submissionDeadlineAt: challenges.submissionDeadlineAt,
      })

    return res.status(201).json(created)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('unique') || message.includes('duplicate key') || message.includes('23505')) {
      return res.status(409).json({ error: 'Challenge day or slug already exists for this hackathon' })
    }
    throw err
  }
})

adminRouter.patch('/hackathons/:id/challenges/:challengeId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const challengeId = parseIntegerParam(req.params.challengeId)
  if (hackathonId === null || challengeId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const updates = req.body as {
    dayNumber?: number
    title?: string
    slug?: string
    difficulty?: string
    summary?: string
    description?: string
    setupInstructions?: string
    resources?: unknown
    maxPoints?: number
    unlockAt?: string
    submissionDeadlineAt?: string
  }

  const payload: Record<string, unknown> = {}
  if (updates.dayNumber !== undefined) payload.dayNumber = updates.dayNumber
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.slug !== undefined) payload.slug = updates.slug.trim()
  if (updates.difficulty !== undefined) payload.difficulty = updates.difficulty.trim()
  if (updates.summary !== undefined) payload.summary = updates.summary.trim()
  if (updates.description !== undefined) payload.description = updates.description.trim()
  if (updates.setupInstructions !== undefined) payload.setupInstructions = updates.setupInstructions.trim()
  if (updates.maxPoints !== undefined) payload.maxPoints = updates.maxPoints
  if (updates.unlockAt !== undefined) payload.unlockAt = normalizeDateValue(updates.unlockAt)
  if (updates.submissionDeadlineAt !== undefined) {
    payload.submissionDeadlineAt = normalizeDateValue(updates.submissionDeadlineAt)
  }

  if (updates.resources !== undefined) {
    try {
      payload.resources = normalizeResources(updates.resources)
    } catch {
      return res.status(400).json({ error: 'Invalid resources payload' })
    }
  }

  const db = getDb()
  const [updated] = await db
    .update(challenges)
    .set(payload)
    .where(and(eq(challenges.id, challengeId), eq(challenges.hackathonId, hackathonId)))
    .returning({
      id: challenges.id,
      hackathonId: challenges.hackathonId,
      dayNumber: challenges.dayNumber,
      title: challenges.title,
      slug: challenges.slug,
      difficulty: challenges.difficulty,
      summary: challenges.summary,
      description: challenges.description,
      setupInstructions: challenges.setupInstructions,
      resources: challenges.resources,
      maxPoints: challenges.maxPoints,
      unlockAt: challenges.unlockAt,
      submissionDeadlineAt: challenges.submissionDeadlineAt,
    })

  if (!updated || updated.hackathonId !== hackathonId) {
    return res.status(404).json({ error: 'Challenge not found' })
  }

  return res.json(updated)
})

adminRouter.delete('/hackathons/:id/challenges/:challengeId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const challengeId = parseIntegerParam(req.params.challengeId)
  if (hackathonId === null || challengeId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const db = getDb()
  const [deleted] = await db
    .delete(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.hackathonId, hackathonId)))
    .returning({ id: challenges.id })

  if (!deleted) {
    return res.status(404).json({ error: 'Challenge not found' })
  }

  return res.json({ status: 'deleted', id: challengeId })
})

adminRouter.get('/hackathons/:id/schedule', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const db = getDb()
  const items = await db
    .select({
      id: scheduleEvents.id,
      dayNumber: scheduleEvents.dayNumber,
      time: scheduleEvents.time,
      title: scheduleEvents.title,
      venue: scheduleEvents.venue,
      sortOrder: scheduleEvents.sortOrder,
    })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.hackathonId, hackathonId))
    .orderBy(asc(scheduleEvents.dayNumber), asc(scheduleEvents.sortOrder), asc(scheduleEvents.id))

  return res.json({ items })
})

adminRouter.post('/hackathons/:id/schedule', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const { dayNumber, time, title, venue, sortOrder } = req.body as {
    dayNumber?: number
    time?: string
    title?: string
    venue?: string
    sortOrder?: number
  }

  if (dayNumber === undefined || !time?.trim() || !title?.trim()) {
    return res.status(400).json({ error: 'dayNumber, time, and title are required' })
  }

  const db = getDb()
  const [created] = await db
    .insert(scheduleEvents)
    .values({
      hackathonId,
      dayNumber,
      time: time.trim(),
      title: title.trim(),
      venue: venue?.trim() ?? '',
      sortOrder: sortOrder ?? 0,
    })
    .returning({
      id: scheduleEvents.id,
      dayNumber: scheduleEvents.dayNumber,
      time: scheduleEvents.time,
      title: scheduleEvents.title,
      venue: scheduleEvents.venue,
      sortOrder: scheduleEvents.sortOrder,
    })

  return res.status(201).json(created)
})

adminRouter.patch('/hackathons/:id/schedule/:eventId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const eventId = parseIntegerParam(req.params.eventId)
  if (hackathonId === null || eventId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const updates = req.body as {
    dayNumber?: number
    time?: string
    title?: string
    venue?: string
    sortOrder?: number
  }

  const payload: Record<string, unknown> = {}
  if (updates.dayNumber !== undefined) payload.dayNumber = updates.dayNumber
  if (updates.time !== undefined) payload.time = updates.time.trim()
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.venue !== undefined) payload.venue = updates.venue.trim()
  if (updates.sortOrder !== undefined) payload.sortOrder = updates.sortOrder

  const db = getDb()
  const [updated] = await db
    .update(scheduleEvents)
    .set(payload)
    .where(and(eq(scheduleEvents.id, eventId), eq(scheduleEvents.hackathonId, hackathonId)))
    .returning({
      id: scheduleEvents.id,
      hackathonId: scheduleEvents.hackathonId,
      dayNumber: scheduleEvents.dayNumber,
      time: scheduleEvents.time,
      title: scheduleEvents.title,
      venue: scheduleEvents.venue,
      sortOrder: scheduleEvents.sortOrder,
    })

  if (!updated || updated.hackathonId !== hackathonId) {
    return res.status(404).json({ error: 'Schedule event not found' })
  }

  return res.json(updated)
})

adminRouter.delete('/hackathons/:id/schedule/:eventId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const eventId = parseIntegerParam(req.params.eventId)
  if (hackathonId === null || eventId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const db = getDb()
  const [deleted] = await db
    .delete(scheduleEvents)
    .where(and(eq(scheduleEvents.id, eventId), eq(scheduleEvents.hackathonId, hackathonId)))
    .returning({ id: scheduleEvents.id })

  if (!deleted) {
    return res.status(404).json({ error: 'Schedule event not found' })
  }

  return res.json({ status: 'deleted', id: eventId })
})

adminRouter.get('/hackathons/:id/rules', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const db = getDb()
  const items = await db
    .select({
      id: rules.id,
      title: rules.title,
      body: rules.body,
      sortOrder: rules.sortOrder,
    })
    .from(rules)
    .where(eq(rules.hackathonId, hackathonId))
    .orderBy(asc(rules.sortOrder), asc(rules.id))

  return res.json({ items })
})

adminRouter.post('/hackathons/:id/rules', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const { title, body, sortOrder } = req.body as {
    title?: string
    body?: string
    sortOrder?: number
  }

  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'title and body are required' })
  }

  const db = getDb()
  const [created] = await db
    .insert(rules)
    .values({
      hackathonId,
      title: title.trim(),
      body: body.trim(),
      sortOrder: sortOrder ?? 0,
    })
    .returning({
      id: rules.id,
      title: rules.title,
      body: rules.body,
      sortOrder: rules.sortOrder,
    })

  return res.status(201).json(created)
})

adminRouter.patch('/hackathons/:id/rules/:ruleId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const ruleId = parseIntegerParam(req.params.ruleId)
  if (hackathonId === null || ruleId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const updates = req.body as {
    title?: string
    body?: string
    sortOrder?: number
  }

  const payload: Record<string, unknown> = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.body !== undefined) payload.body = updates.body.trim()
  if (updates.sortOrder !== undefined) payload.sortOrder = updates.sortOrder

  const db = getDb()
  const [updated] = await db
    .update(rules)
    .set(payload)
    .where(and(eq(rules.id, ruleId), eq(rules.hackathonId, hackathonId)))
    .returning({
      id: rules.id,
      hackathonId: rules.hackathonId,
      title: rules.title,
      body: rules.body,
      sortOrder: rules.sortOrder,
    })

  if (!updated || updated.hackathonId !== hackathonId) {
    return res.status(404).json({ error: 'Rule not found' })
  }

  return res.json(updated)
})

adminRouter.delete('/hackathons/:id/rules/:ruleId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  const ruleId = parseIntegerParam(req.params.ruleId)
  if (hackathonId === null || ruleId === null) {
    return res.status(400).json({ error: 'Invalid ids' })
  }

  const db = getDb()
  const [deleted] = await db
    .delete(rules)
    .where(and(eq(rules.id, ruleId), eq(rules.hackathonId, hackathonId)))
    .returning({ id: rules.id })

  if (!deleted) {
    return res.status(404).json({ error: 'Rule not found' })
  }

  return res.json({ status: 'deleted', id: ruleId })
})

adminRouter.get('/hackathons/:id/skill-modules', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const db = getDb()
  const items = await db
    .select({
      id: skillModules.id,
      title: skillModules.title,
      description: skillModules.description,
      sortOrder: skillModules.sortOrder,
    })
    .from(skillModules)
    .where(eq(skillModules.hackathonId, hackathonId))
    .orderBy(asc(skillModules.sortOrder), asc(skillModules.id))

  return res.json({ items })
})

adminRouter.post('/hackathons/:id/skill-modules', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  if (!await ensureHackathonExists(hackathonId)) {
    return res.status(404).json({ error: 'Hackathon not found' })
  }

  const { id, title, description, sortOrder } = req.body as {
    id?: string
    title?: string
    description?: string
    sortOrder?: number
  }

  if (!id?.trim() || !title?.trim()) {
    return res.status(400).json({ error: 'id and title are required' })
  }

  const db = getDb()

  try {
    const [created] = await db
      .insert(skillModules)
      .values({
        id: id.trim(),
        hackathonId,
        title: title.trim(),
        description: description?.trim() ?? '',
        sortOrder: sortOrder ?? 0,
      })
      .returning({
        id: skillModules.id,
        title: skillModules.title,
        description: skillModules.description,
        sortOrder: skillModules.sortOrder,
      })

    return res.status(201).json(created)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('unique') || message.includes('duplicate key') || message.includes('23505')) {
      return res.status(409).json({ error: 'Skill module id already exists for this hackathon' })
    }
    throw err
  }
})

adminRouter.patch('/hackathons/:id/skill-modules/:moduleId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  const moduleId = req.params.moduleId
  const updates = req.body as {
    title?: string
    description?: string
    sortOrder?: number
  }

  const payload: Record<string, unknown> = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.description !== undefined) payload.description = updates.description.trim()
  if (updates.sortOrder !== undefined) payload.sortOrder = updates.sortOrder

  const db = getDb()
  const [updated] = await db
    .update(skillModules)
    .set(payload)
    .where(and(eq(skillModules.id, moduleId), eq(skillModules.hackathonId, hackathonId)))
    .returning({
      id: skillModules.id,
      hackathonId: skillModules.hackathonId,
      title: skillModules.title,
      description: skillModules.description,
      sortOrder: skillModules.sortOrder,
    })

  if (!updated || updated.hackathonId !== hackathonId) {
    return res.status(404).json({ error: 'Skill module not found' })
  }

  return res.json(updated)
})

adminRouter.delete('/hackathons/:id/skill-modules/:moduleId', async (req, res) => {
  const hackathonId = parseIntegerParam(req.params.id)
  if (hackathonId === null) {
    return res.status(400).json({ error: 'Invalid hackathon id' })
  }

  const moduleId = req.params.moduleId
  const db = getDb()
  const [deleted] = await db
    .delete(skillModules)
    .where(and(eq(skillModules.id, moduleId), eq(skillModules.hackathonId, hackathonId)))
    .returning({ id: skillModules.id })

  if (!deleted) {
    return res.status(404).json({ error: 'Skill module not found' })
  }

  return res.json({ status: 'deleted', id: moduleId })
})

adminRouter.get('/submissions', async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)

  const total = totalRow?.count ?? 0

  const items = await db
    .select({
      id: submissions.id,
      user_id: submissions.userId,
      team_id: submissions.teamId,
      team_name: submissions.teamName,
      challenge_id: submissions.challengeId,
      project_title: submissions.projectTitle,
      category: submissions.category,
      status: submissions.status,
      score: submissions.score,
      version: submissions.version,
      updated_at: submissions.updatedAt,
      challenge_title: challenges.title,
      day_number: challenges.dayNumber,
      user_name: neonAuthUsersSync.name,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .leftJoin(neonAuthUsersSync, eq(neonAuthUsersSync.id, submissions.userId))
    .orderBy(desc(submissions.updatedAt))
    .limit(limit)
    .offset(offset)

  return res.json({ items, total, page, limit })
})

adminRouter.get('/submissions/:id', async (req, res) => {
  const id = Number(req.params.id)
  const submission = await getAdminSubmissionById(id)

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  return res.json(submission)
})

adminRouter.get('/users', async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const db = getDb()

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userProfiles)

  const total = totalRow?.count ?? 0

  const users = await db
    .select({
      id: neonAuthUsersSync.id,
      name: neonAuthUsersSync.name,
      email: neonAuthUsersSync.email,
      role: userProfiles.role,
      modules_started: sql<number>`count(distinct ${skillProgress.moduleId})`,
      last_progress: sql<string>`max(${skillProgress.updatedAt})`,
    })
    .from(neonAuthUsersSync)
    .innerJoin(userProfiles, eq(userProfiles.userId, neonAuthUsersSync.id))
    .leftJoin(skillProgress, eq(skillProgress.userId, neonAuthUsersSync.id))
    .groupBy(neonAuthUsersSync.id, neonAuthUsersSync.name, neonAuthUsersSync.email, userProfiles.role)
    .orderBy(desc(neonAuthUsersSync.createdAt))
    .limit(limit)
    .offset(offset)

  const [activeHackathon] = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.isActive, true))
    .limit(1)

  let totalModules = 0
  if (activeHackathon) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillModules)
      .where(eq(skillModules.hackathonId, activeHackathon.id))
    totalModules = row?.count ?? 0
  }

  return res.json({ items: users, total, page, limit, totalModules })
})

adminRouter.get('/stats', async (_req, res) => {
  const db = getDb()

  const [subCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userProfiles)

  const reviewResult = await db.execute<{ rate: number }>(sql`
    SELECT
      COALESCE(
        CAST(SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS double precision)
        / NULLIF(COUNT(*), 0),
        0
      ) AS rate
    FROM submissions
  `)
  const reviewRow = reviewResult.rows[0]

  return res.json({
    totalSubmissions: subCount?.count ?? 0,
    totalUsers: userCount?.count ?? 0,
    reviewRate: reviewRow?.rate ?? 0,
  })
})

adminRouter.patch('/submissions/:id/score', async (req, res) => {
  const id = Number(req.params.id)
  const { score } = req.body as { score?: number }

  if (score === undefined || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Score must be a non-negative number' })
  }

  const db = getDb()
  const [submission] = await db
    .select({
      id: submissions.id,
      challenge_id: submissions.challengeId,
      max_points: challenges.maxPoints,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .where(eq(submissions.id, id))
    .limit(1)

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  if (submission.max_points !== null && score > submission.max_points) {
    return res.status(400).json({ error: `Score cannot exceed ${submission.max_points} points` })
  }

  await scoreSubmission(id, score, 'reviewed')
  return res.json({ status: 'scored', id, score })
})
