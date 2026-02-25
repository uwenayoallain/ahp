import { getDb } from '../db/connection.js'

type SubmissionInput = {
  userId: number
  localId?: string
  teamId?: number
  teamName: string
  challengeId?: number
  projectTitle: string
  description: string
  category: string
  version?: number
}

export function createSubmission(input: SubmissionInput) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO submissions (user_id, local_id, team_id, team_name, challenge_id, project_title, description, category, version, updated_at)
    VALUES (@userId, @localId, @teamId, @teamName, @challengeId, @projectTitle, @description, @category, @version, datetime('now'))
  `)

  const info = stmt.run({
    userId: input.userId,
    localId: input.localId ?? null,
    teamId: input.teamId ?? null,
    teamName: input.teamName,
    challengeId: input.challengeId ?? null,
    projectTitle: input.projectTitle,
    description: input.description,
    category: input.category,
    version: input.version ?? 1,
  })

  return Number(info.lastInsertRowid)
}

export function getSubmissionById(id: number) {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.id, s.user_id, s.local_id, s.team_id, s.team_name, s.challenge_id, s.project_title,
              s.description, s.category, s.status, s.score, s.version, s.created_at, s.updated_at,
              c.title AS challenge_title, c.day_number
       FROM submissions s
       LEFT JOIN challenges c ON c.id = s.challenge_id
       WHERE s.id = ?`,
    )
    .get(id)
}

export function getAdminSubmissionById(id: number) {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.id, s.user_id, s.local_id, s.team_id, s.team_name, s.challenge_id, s.project_title,
              s.description, s.category, s.status, s.score, s.version, s.created_at, s.updated_at,
              c.title AS challenge_title, c.day_number,
              u.name AS user_name
       FROM submissions s
       LEFT JOIN challenges c ON c.id = s.challenge_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(id)
}

export function scoreSubmission(id: number, score: number, status: string) {
  const db = getDb()
  db.prepare(
    `UPDATE submissions SET score = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(score, status, id)
}
