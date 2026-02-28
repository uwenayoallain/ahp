import { getDb } from '../db/connection.js'
import { createSubmission, getSubmissionById } from './submissions.js'

type SyncSubmissionPayload = {
  localId: string
  teamId?: number
  teamName: string
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

type SyncResult =
  | { status: 'ignored' }
  | { status: 'created'; id: number }
  | { status: 'updated'; id: number }
  | { status: 'conflict'; serverCopy: unknown }

export function processSync(userId: number, body: SyncRequest): SyncResult {
  if (body.action !== 'submission') {
    logSync(userId, body.action, 'unknown', 'ignored')
    return { status: 'ignored' }
  }

  const payload = body.payload as SyncSubmissionPayload
  const db = getDb()

  const syncTransaction = db.transaction((): SyncResult => {
    const existing = db
      .prepare(
        'SELECT id, version FROM submissions WHERE user_id = ? AND local_id = ?',
      )
      .get(userId, payload.localId) as { id: number; version: number } | undefined

    if (!existing) {
      const createdId = createSubmission({
        userId,
        localId: payload.localId,
        teamId: payload.teamId,
        teamName: payload.teamName,
        challengeId: payload.challengeId,
        projectTitle: payload.projectTitle,
        description: payload.description,
        category: payload.category,
        version: payload.version,
      })

      logSync(userId, 'submission', String(createdId), 'success')
      return { status: 'created', id: createdId }
    }

    if (payload.version < existing.version) {
      const serverCopy = getSubmissionById(existing.id)
      logSync(userId, 'submission', String(existing.id), 'conflict')
      return { status: 'conflict', serverCopy }
    }

    db.prepare(
      `
        UPDATE submissions
        SET team_id = @teamId,
            team_name = @teamName,
            challenge_id = @challengeId,
            project_title = @projectTitle,
            description = @description,
            category = @category,
            version = @version,
            updated_at = datetime('now')
        WHERE id = @id
      `,
    ).run({
      id: existing.id,
      teamId: payload.teamId ?? null,
      teamName: payload.teamName,
      challengeId: payload.challengeId ?? null,
      projectTitle: payload.projectTitle,
      description: payload.description,
      category: payload.category,
      version: payload.version,
    })

    logSync(userId, 'submission', String(existing.id), 'updated')
    return { status: 'updated', id: existing.id }
  })

  return syncTransaction()
}

export function getSyncStatus(userId: number) {
  const db = getDb()

  const submissionCount = (db
    .prepare('SELECT COUNT(*) AS count FROM submissions WHERE user_id = ?')
    .get(userId) as { count: number }).count

  const queueHealth = db
    .prepare(
      `SELECT status, COUNT(*) AS count
       FROM sync_log
       WHERE user_id = ?
       GROUP BY status`,
    )
    .all(userId)

  return {
    submissions: submissionCount,
    queueHealth,
  }
}

function logSync(userId: number, action: string, entityId: string, status: string) {
  const db = getDb()
  db.prepare(
    `
      INSERT INTO sync_log (user_id, action, entity_type, entity_id, status)
      VALUES (?, ?, 'submission', ?, ?)
    `,
  ).run(userId, action, entityId, status)
}
