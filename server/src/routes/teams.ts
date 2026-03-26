import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { hackathons, neonAuthUsersSync, submissions, teamJoinRequests, teamMembers, teams } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export const teamsRouter = Router()

teamsRouter.use(requireAuth)

async function getMembership(hackathonId: number, userId: string) {
  const db = getDb()
  const [row] = await db
    .select({
      teamId: teamMembers.teamId,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teams.hackathonId, hackathonId), eq(teamMembers.userId, userId)))
    .limit(1)

  return row
}

async function countTeamMembers(teamId: number) {
  const db = getDb()
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))

  return row?.count ?? 0
}

async function isTeamLocked(teamId: number) {
  const db = getDb()
  const [row] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.teamId, teamId))
    .limit(1)

  return row !== undefined
}

async function getTeamWithHackathon(teamId: number) {
  const db = getDb()
  const [row] = await db
    .select({
      id: teams.id,
      name: teams.name,
      hackathonId: teams.hackathonId,
      createdBy: teams.createdBy,
      teamSizeMax: hackathons.teamSizeMax,
    })
    .from(teams)
    .innerJoin(hackathons, eq(hackathons.id, teams.hackathonId))
    .where(eq(teams.id, teamId))
    .limit(1)

  return row
}

teamsRouter.get('/', async (req, res) => {
  const userId = req.user!.sub
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [], myTeam: null, incomingRequests: [], myRequests: [] })
  }

  const db = getDb()
  const items = await db
    .select({
      id: teams.id,
      name: teams.name,
      created_by: teams.createdBy,
      member_count: sql<number>`count(distinct ${teamMembers.userId})`,
      capacity: hackathons.teamSizeMax,
    })
    .from(teams)
    .innerJoin(hackathons, eq(hackathons.id, teams.hackathonId))
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.hackathonId, hackathon.id))
    .groupBy(teams.id, hackathons.teamSizeMax)
    .orderBy(asc(teams.name))

  const membership = await getMembership(hackathon.id, userId)
  const myTeam = membership
    ? await db
        .select({
          id: teams.id,
          name: teams.name,
        })
        .from(teams)
        .where(eq(teams.id, membership.teamId))
        .limit(1)
        .then((rows) => rows[0])
    : undefined

  let myTeamMembers: unknown[] = []
  let incomingRequests: unknown[] = []
  if (myTeam) {
    myTeamMembers = await db
      .select({
        id: neonAuthUsersSync.id,
        name: neonAuthUsersSync.name,
        role: teamMembers.role,
        joined_at: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(neonAuthUsersSync, eq(neonAuthUsersSync.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, myTeam.id))
      .orderBy(asc(teamMembers.joinedAt))

    if (membership?.role === 'lead') {
      incomingRequests = await db
        .select({
          id: teamJoinRequests.id,
          team_id: teamJoinRequests.teamId,
          requester_user_id: teamJoinRequests.requesterUserId,
          requester_name: neonAuthUsersSync.name,
          status: teamJoinRequests.status,
          message: teamJoinRequests.message,
          created_at: teamJoinRequests.createdAt,
        })
        .from(teamJoinRequests)
        .innerJoin(neonAuthUsersSync, eq(neonAuthUsersSync.id, teamJoinRequests.requesterUserId))
        .where(and(eq(teamJoinRequests.teamId, myTeam.id), eq(teamJoinRequests.status, 'pending')))
        .orderBy(desc(teamJoinRequests.createdAt))
    }
  }

  const myRequests = await db
        .select({
          id: teamJoinRequests.id,
          team_id: teamJoinRequests.teamId,
          team_name: teams.name,
          status: teamJoinRequests.status,
          created_at: teamJoinRequests.createdAt,
        })
        .from(teamJoinRequests)
        .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(and(eq(teams.hackathonId, hackathon.id), eq(teamJoinRequests.requesterUserId, userId)))
    .orderBy(desc(teamJoinRequests.createdAt))

  const teamIds = items.map((item) => item.id)
  const lockedTeamIds = teamIds.length > 0
    ? await db
        .selectDistinct({ teamId: submissions.teamId })
        .from(submissions)
        .where(inArray(submissions.teamId, teamIds))
    : []

  const lockedSet = new Set(lockedTeamIds.map((row) => row.teamId).filter((value): value is number => value !== null))

  return res.json({
    items: items.map((item) => ({
      ...item,
      is_locked: lockedSet.has(item.id),
    })),
    myTeam: myTeam ? { ...myTeam, members: myTeamMembers } : null,
    incomingRequests,
    myRequests,
  })
})

teamsRouter.post('/', async (req, res) => {
  const userId = req.user!.sub
  const { name } = req.body as { name?: string }

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Team name must be at least 2 characters' })
  }

  if (name.trim().length > 50) {
    return res.status(400).json({ error: 'Team name must be 50 characters or fewer' })
  }

  const hackathon = await getActiveHackathon()
  if (!hackathon) {
    return res.status(400).json({ error: 'No active hackathon' })
  }

  const db = getDb()
  const [event] = await db
    .select({ teamSizeMax: hackathons.teamSizeMax })
    .from(hackathons)
    .where(eq(hackathons.id, hackathon.id))
    .limit(1)

  try {
    const [team] = await db.transaction(async (tx) => {
      const membership = await tx
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(and(eq(teams.hackathonId, hackathon.id), eq(teamMembers.userId, userId)))
        .limit(1)

      if (membership.length > 0) {
        throw new Error('already-on-team')
      }

      const pending = await tx
        .select({ id: teamJoinRequests.id })
        .from(teamJoinRequests)
        .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
        .where(
          and(
            eq(teams.hackathonId, hackathon.id),
            eq(teamJoinRequests.requesterUserId, userId),
            eq(teamJoinRequests.status, 'pending'),
          ),
        )
        .limit(1)

      if (pending.length > 0) {
        throw new Error('pending-request-exists')
      }

      const created = await tx
        .insert(teams)
        .values({
          hackathonId: hackathon.id,
          name: name.trim(),
          createdBy: userId,
        })
        .returning({ id: teams.id, name: teams.name })

      await tx
        .insert(teamMembers)
        .values({
          teamId: created[0].id,
          userId,
          role: 'lead',
        })

      return created
    })

    return res.status(201).json({
      id: team.id,
      name: team.name,
      capacity: event?.teamSizeMax ?? 4,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'already-on-team') {
      return res.status(409).json({ error: 'You are already on a team' })
    }
    if (message === 'pending-request-exists') {
      return res.status(409).json({ error: 'Cancel your pending team request first' })
    }
    if (message.includes('unique') || message.includes('duplicate key') || message.includes('23505')) {
      return res.status(409).json({ error: 'A team with that name already exists' })
    }
    throw err
  }
})

teamsRouter.post('/:id/join', (_req, res) => {
  return res.status(404).json({ error: 'Direct join is disabled. Request access instead.' })
})

teamsRouter.post('/:id/requests', async (req, res) => {
  const userId = req.user!.sub
  const teamId = Number(req.params.id)
  const { message } = req.body as { message?: string }

  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: 'Invalid team id' })
  }

  const team = await getTeamWithHackathon(teamId)
  if (!team) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const hackathon = await getActiveHackathon()
  if (!hackathon || hackathon.id !== team.hackathonId) {
    return res.status(400).json({ error: 'Team is not in the active hackathon' })
  }

  if (await isTeamLocked(teamId)) {
    return res.status(409).json({ error: 'Team membership is locked after the first submission' })
  }

  if (await getMembership(team.hackathonId, userId)) {
    return res.status(409).json({ error: 'You are already on a team' })
  }

  const memberCount = await countTeamMembers(teamId)
  if (memberCount >= team.teamSizeMax) {
    return res.status(409).json({ error: 'Team is already full' })
  }

  const db = getDb()
  const [existing] = await db
    .select({ id: teamJoinRequests.id })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(
      and(
        eq(teams.hackathonId, team.hackathonId),
        eq(teamJoinRequests.requesterUserId, userId),
        eq(teamJoinRequests.status, 'pending'),
      ),
    )
    .limit(1)

  if (existing) {
    return res.status(409).json({ error: 'You already have a pending team request' })
  }

  const [created] = await db
    .insert(teamJoinRequests)
    .values({
      teamId,
      requesterUserId: userId,
      message: message?.trim() ?? '',
    })
    .returning({
      id: teamJoinRequests.id,
      status: teamJoinRequests.status,
    })

  return res.status(201).json(created)
})

teamsRouter.get('/requests', async (req, res) => {
  const userId = req.user!.sub
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ incoming: [], mine: [] })
  }

  const membership = await getMembership(hackathon.id, userId)
  const db = getDb()

  let incoming: unknown[] = []
  if (membership?.role === 'lead') {
    incoming = await db
      .select({
        id: teamJoinRequests.id,
        requester_user_id: teamJoinRequests.requesterUserId,
        requester_name: neonAuthUsersSync.name,
        status: teamJoinRequests.status,
        message: teamJoinRequests.message,
        created_at: teamJoinRequests.createdAt,
      })
      .from(teamJoinRequests)
      .innerJoin(neonAuthUsersSync, eq(neonAuthUsersSync.id, teamJoinRequests.requesterUserId))
      .where(and(eq(teamJoinRequests.teamId, membership.teamId), eq(teamJoinRequests.status, 'pending')))
      .orderBy(desc(teamJoinRequests.createdAt))
  }

  const mine = await db
    .select({
      id: teamJoinRequests.id,
      team_id: teamJoinRequests.teamId,
      status: teamJoinRequests.status,
      created_at: teamJoinRequests.createdAt,
    })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(and(eq(teams.hackathonId, hackathon.id), eq(teamJoinRequests.requesterUserId, userId)))
    .orderBy(desc(teamJoinRequests.createdAt))

  return res.json({ incoming, mine })
})

teamsRouter.post('/requests/:id/approve', async (req, res) => {
  const userId = req.user!.sub
  const requestId = Number(req.params.id)

  if (Number.isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' })
  }

  const db = getDb()
  const [requestRecord] = await db
    .select({
      id: teamJoinRequests.id,
      teamId: teamJoinRequests.teamId,
      requesterUserId: teamJoinRequests.requesterUserId,
      status: teamJoinRequests.status,
      hackathonId: teams.hackathonId,
      teamSizeMax: hackathons.teamSizeMax,
    })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .innerJoin(hackathons, eq(hackathons.id, teams.hackathonId))
    .where(eq(teamJoinRequests.id, requestId))
    .limit(1)

  if (!requestRecord) {
    return res.status(404).json({ error: 'Request not found' })
  }

  if (requestRecord.status !== 'pending') {
    return res.status(409).json({ error: 'Request is no longer pending' })
  }

  const leadMembership = await getMembership(requestRecord.hackathonId, userId)
  if (!leadMembership || leadMembership.teamId !== requestRecord.teamId || leadMembership.role !== 'lead') {
    return res.status(403).json({ error: 'Only the team lead can approve requests' })
  }

  if (await isTeamLocked(requestRecord.teamId)) {
    return res.status(409).json({ error: 'Team membership is locked after the first submission' })
  }

  if (await getMembership(requestRecord.hackathonId, requestRecord.requesterUserId)) {
    return res.status(409).json({ error: 'Requester is already on a team' })
  }

  const memberCount = await countTeamMembers(requestRecord.teamId)
  if (memberCount >= requestRecord.teamSizeMax) {
    return res.status(409).json({ error: 'Team is already full' })
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(teamMembers)
      .values({
        teamId: requestRecord.teamId,
        userId: requestRecord.requesterUserId,
        role: 'member',
      })

    await tx
      .update(teamJoinRequests)
      .set({
        status: 'approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
      })
      .where(eq(teamJoinRequests.id, requestRecord.id))
  })

  return res.json({ id: requestRecord.id, status: 'approved' })
})

teamsRouter.post('/requests/:id/reject', async (req, res) => {
  const userId = req.user!.sub
  const requestId = Number(req.params.id)

  const db = getDb()
  const [requestRecord] = await db
    .select({
      id: teamJoinRequests.id,
      teamId: teamJoinRequests.teamId,
      status: teamJoinRequests.status,
      hackathonId: teams.hackathonId,
    })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(eq(teamJoinRequests.id, requestId))
    .limit(1)

  if (!requestRecord) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const membership = await getMembership(requestRecord.hackathonId, userId)
  if (!membership || membership.teamId !== requestRecord.teamId || membership.role !== 'lead') {
    return res.status(403).json({ error: 'Only the team lead can reject requests' })
  }

  await db
    .update(teamJoinRequests)
    .set({
      status: 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date(),
    })
    .where(eq(teamJoinRequests.id, requestRecord.id))

  return res.json({ id: requestRecord.id, status: 'rejected' })
})

teamsRouter.post('/requests/:id/cancel', async (req, res) => {
  const userId = req.user!.sub
  const requestId = Number(req.params.id)
  const db = getDb()

  const [requestRecord] = await db
    .select({
      id: teamJoinRequests.id,
      requesterUserId: teamJoinRequests.requesterUserId,
      status: teamJoinRequests.status,
    })
    .from(teamJoinRequests)
    .where(eq(teamJoinRequests.id, requestId))
    .limit(1)

  if (!requestRecord) {
    return res.status(404).json({ error: 'Request not found' })
  }

  if (requestRecord.requesterUserId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (requestRecord.status !== 'pending') {
    return res.status(409).json({ error: 'Only pending requests can be cancelled' })
  }

  await db
    .update(teamJoinRequests)
    .set({
      status: 'cancelled',
      reviewedAt: new Date(),
    })
    .where(eq(teamJoinRequests.id, requestRecord.id))

  return res.json({ id: requestRecord.id, status: 'cancelled' })
})

teamsRouter.post('/:id/leave', async (req, res) => {
  const userId = req.user!.sub
  const teamId = Number(req.params.id)

  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: 'Invalid team id' })
  }

  const [membership] = await getDb()
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return res.status(404).json({ error: 'Not a member of this team' })
  }

  if (await isTeamLocked(teamId)) {
    return res.status(409).json({ error: 'Team membership is locked after the first submission' })
  }

  const db = getDb()
  await db.transaction(async (tx) => {
    await tx.delete(teamMembers).where(eq(teamMembers.id, membership.id))

    const [remaining] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))

    if ((remaining?.count ?? 0) === 0) {
      await tx.delete(teams).where(eq(teams.id, teamId))
    }
  })

  return res.json({ status: 'left' })
})
