import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { submissions, challenges, neonAuthUsersSync, userProfiles } from '../db/schema.js'
import { resolvedDisplayNameSql } from '../displayNames.js'

type SubmissionInput = {
  userId: string
  localId?: string | null
  teamId?: number | null
  teamName: string
  challengeId?: number
  projectTitle: string
  description: string
  category: string
  version?: number
  penaltyPercent?: number
}

export async function createSubmission(input: SubmissionInput): Promise<number> {
  const db = getDb()
  const [row] = await db
    .insert(submissions)
    .values({
      userId: input.userId,
      localId: input.localId ?? null,
      teamId: input.teamId ?? null,
      teamName: input.teamName,
      challengeId: input.challengeId ?? null,
      projectTitle: input.projectTitle,
      description: input.description,
      category: input.category,
      penaltyPercent: input.penaltyPercent ?? 0,
      version: input.version ?? 1,
      updatedAt: new Date(),
    })
    .returning({ id: submissions.id })

  return row.id
}

export async function getSubmissionById(id: number) {
  const db = getDb()
  const [row] = await db
    .select({
      id: submissions.id,
      user_id: submissions.userId,
      local_id: submissions.localId,
      team_id: submissions.teamId,
      team_name: submissions.teamName,
      challenge_id: submissions.challengeId,
      project_title: submissions.projectTitle,
      description: submissions.description,
      category: submissions.category,
      status: submissions.status,
      score: submissions.score,
      raw_score: submissions.rawScore,
      penalty_percent: submissions.penaltyPercent,
      version: submissions.version,
      created_at: submissions.createdAt,
      updated_at: submissions.updatedAt,
      challenge_title: challenges.title,
      day_number: challenges.dayNumber,
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .where(eq(submissions.id, id))
    .limit(1)

  return row
}

export async function getAdminSubmissionById(id: number) {
  const db = getDb()
  const [row] = await db
    .select({
      id: submissions.id,
      user_id: submissions.userId,
      local_id: submissions.localId,
      team_id: submissions.teamId,
      team_name: submissions.teamName,
      challenge_id: submissions.challengeId,
      project_title: submissions.projectTitle,
      description: submissions.description,
      category: submissions.category,
      status: submissions.status,
      score: submissions.score,
      raw_score: submissions.rawScore,
      penalty_percent: submissions.penaltyPercent,
      version: submissions.version,
      created_at: submissions.createdAt,
      updated_at: submissions.updatedAt,
      challenge_title: challenges.title,
      day_number: challenges.dayNumber,
      user_name: resolvedDisplayNameSql(),
    })
    .from(submissions)
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .leftJoin(neonAuthUsersSync, eq(neonAuthUsersSync.id, submissions.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, submissions.userId))
    .where(eq(submissions.id, id))
    .limit(1)

  return row
}

export async function scoreSubmission(id: number, score: number, status: string) {
  const db = getDb()
  const [existing] = await db
    .select({ penaltyPercent: submissions.penaltyPercent })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1)

  const penaltyPercent = existing?.penaltyPercent ?? 0
  const finalScore = Math.max(0, Math.round(score * (1 - penaltyPercent / 100)))

  await db
    .update(submissions)
    .set({
      rawScore: score,
      score: finalScore,
      status,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, id))
}
