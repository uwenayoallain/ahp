import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { challenges, hackathons, submissions, syncLog, teamMembers, teams } from '../db/schema.js'
import { getSubmissionById } from './submissions.js'

type SyncSubmissionPayload = {
  localId: string
  challengeId?: number
  projectTitle: string
  description: string
  category: string
  version: number
}

type SyncRequest = {
  action: 'submission' | 'skillProgress'
  payload: unknown
}

export type SyncResult =
  | { status: 'ignored' }
  | { status: 'created'; id: number }
  | { status: 'updated'; id: number }
  | { status: 'conflict'; serverCopy: unknown }
  | { status: 'rejected'; error: string }

export async function processSync(userId: string, body: SyncRequest): Promise<SyncResult> {
  if (body.action !== 'submission') {
    await logSync(userId, body.action, 'unknown', 'ignored')
    return { status: 'ignored' }
  }

  const payload = body.payload as SyncSubmissionPayload
  const db = getDb()

  const [activeHackathon] = await db
    .select({
      id: hackathons.id,
      latePolicy: hackathons.latePolicy,
      latePenaltyPercentPerHour: hackathons.latePenaltyPercentPerHour,
    })
    .from(hackathons)
    .where(eq(hackathons.isActive, true))
    .limit(1)

  if (!activeHackathon) {
    await logSync(userId, 'submission', payload.localId, 'rejected')
    return { status: 'rejected', error: 'No active hackathon' }
  }

  if (payload.challengeId === undefined) {
    await logSync(userId, 'submission', payload.localId, 'rejected')
    return { status: 'rejected', error: 'payload.challengeId is required' }
  }

  const [challenge] = await db
    .select({
      id: challenges.id,
      unlockAt: challenges.unlockAt,
      submissionDeadlineAt: challenges.submissionDeadlineAt,
    })
    .from(challenges)
    .where(and(eq(challenges.id, payload.challengeId), eq(challenges.hackathonId, activeHackathon.id)))
    .limit(1)

  if (!challenge) {
    await logSync(userId, 'submission', payload.localId, 'rejected')
    return { status: 'rejected', error: 'Challenge is not available in the active hackathon' }
  }

  const now = new Date()

  if (challenge.unlockAt && now < challenge.unlockAt) {
    await logSync(userId, 'submission', payload.localId, 'rejected')
    return { status: 'rejected', error: 'Challenge is not unlocked yet' }
  }

  let penaltyPercent = 0
  if (challenge.submissionDeadlineAt && now > challenge.submissionDeadlineAt) {
    if (activeHackathon.latePolicy === 'reject') {
      await logSync(userId, 'submission', payload.localId, 'rejected')
      return { status: 'rejected', error: 'Submission deadline has passed' }
    }

    const hoursLate = Math.ceil(
      (now.getTime() - challenge.submissionDeadlineAt.getTime()) / (60 * 60 * 1000),
    )
    penaltyPercent = Math.max(0, hoursLate * activeHackathon.latePenaltyPercentPerHour)
  }

  const [membership] = await db
    .select({
      teamId: teamMembers.teamId,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teams.hackathonId, activeHackathon.id), eq(teamMembers.userId, userId)))
    .limit(1)

  const result = await db.transaction(async (tx): Promise<SyncResult> => {
    const [existing] = await tx
      .select({ id: submissions.id, version: submissions.version })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.localId, payload.localId)))
      .limit(1)

    if (!existing) {
      const [created] = await tx
        .insert(submissions)
        .values({
          userId,
          localId: payload.localId,
          teamId: membership?.teamId ?? null,
          teamName: membership?.teamName ?? '',
          challengeId: challenge.id,
          projectTitle: payload.projectTitle,
          description: payload.description,
          category: payload.category,
          penaltyPercent,
          version: payload.version,
          updatedAt: now,
        })
        .returning({ id: submissions.id })

      return { status: 'created', id: created.id }
    }

    if (payload.version < existing.version) {
      const serverCopy = await getSubmissionById(existing.id)
      return { status: 'conflict', serverCopy }
    }

    await tx
      .update(submissions)
      .set({
        teamId: membership?.teamId ?? null,
        teamName: membership?.teamName ?? '',
        challengeId: challenge.id,
        projectTitle: payload.projectTitle,
        description: payload.description,
        category: payload.category,
        penaltyPercent,
        version: payload.version,
        updatedAt: now,
      })
      .where(eq(submissions.id, existing.id))

    return { status: 'updated', id: existing.id }
  })

  if (result.status === 'created') {
    await logSync(userId, 'submission', String(result.id), 'success')
  } else if (result.status === 'updated') {
    await logSync(userId, 'submission', String(result.id), 'updated')
  } else if (result.status === 'conflict') {
    const entityId = typeof result.serverCopy === 'object' && result.serverCopy !== null && 'id' in result.serverCopy
      ? String((result.serverCopy as { id: number }).id)
      : payload.localId
    await logSync(userId, 'submission', entityId, 'conflict')
  }

  return result
}

export async function getSyncStatus(userId: string) {
  const db = getDb()

  const [submissionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(eq(submissions.userId, userId))

  const queueHealth = await db
    .select({
      status: syncLog.status,
      count: sql<number>`count(*)`,
    })
    .from(syncLog)
    .where(eq(syncLog.userId, userId))
    .groupBy(syncLog.status)

  return {
    submissions: submissionCount?.count ?? 0,
    queueHealth,
  }
}

async function logSync(userId: string, action: string, entityId: string, status: string) {
  const db = getDb()
  await db
    .insert(syncLog)
    .values({ userId, action, entityType: 'submission', entityId, status })
}
