import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { requireAuth } from '../middleware/auth.js'

export const teamsRouter = Router()

teamsRouter.use(requireAuth)

function isUserOnTeam(hackathonId: number, userId: number): boolean {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT tm.id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.hackathon_id = ? AND tm.user_id = ?`,
    )
    .get(hackathonId, userId)
  return row !== undefined
}

teamsRouter.get('/', (req, res) => {
  const db = getDb()
  const userId = req.user!.sub

  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [], myTeam: null })
  }

  const teams = db
    .prepare(
      `SELECT t.id, t.name, t.created_by,
              COUNT(DISTINCT tm.user_id) AS member_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.hackathon_id = ?
       GROUP BY t.id
       ORDER BY t.name ASC`,
    )
    .all(hackathon.id)

  const myTeam = db
    .prepare(
      `SELECT t.id, t.name
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE t.hackathon_id = ? AND tm.user_id = ?
       LIMIT 1`,
    )
    .get(hackathon.id, userId) as { id: number; name: string } | undefined

  let myTeamMembers: unknown[] = []
  if (myTeam) {
    myTeamMembers = db
      .prepare(
        `SELECT u.id, u.name, tm.role, tm.joined_at
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = ?
         ORDER BY tm.joined_at ASC`,
      )
      .all(myTeam.id)
  }

  return res.json({
    items: teams,
    myTeam: myTeam ? { ...myTeam, members: myTeamMembers } : null,
  })
})

teamsRouter.post('/', (req, res) => {
  const db = getDb()
  const userId = req.user!.sub
  const { name } = req.body as { name?: string }

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Team name must be at least 2 characters' })
  }

  if (name.trim().length > 50) {
    return res.status(400).json({ error: 'Team name must be 50 characters or fewer' })
  }

  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.status(400).json({ error: 'No active hackathon' })
  }

  const createTeam = db.transaction(() => {
    if (isUserOnTeam(hackathon.id, userId)) {
      return { error: 'You are already on a team' }
    }

    const info = db
      .prepare('INSERT INTO teams (hackathon_id, name, created_by) VALUES (?, ?, ?)')
      .run(hackathon.id, name.trim(), userId)

    const teamId = Number(info.lastInsertRowid)

    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)')
      .run(teamId, userId, 'lead')

    return { id: teamId, name: name.trim() }
  })

  try {
    const result = createTeam()
    if ('error' in result) {
      return res.status(409).json({ error: result.error })
    }
    return res.status(201).json({ id: result.id, name: result.name })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A team with that name already exists' })
    }
    throw err
  }
})

teamsRouter.post('/:id/join', (req, res) => {
  const db = getDb()
  const userId = req.user!.sub
  const teamId = Number(req.params.id)

  const team = db
    .prepare('SELECT id, hackathon_id FROM teams WHERE id = ?')
    .get(teamId) as { id: number; hackathon_id: number } | undefined

  if (!team) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const joinTeam = db.transaction(() => {
    if (isUserOnTeam(team.hackathon_id, userId)) {
      return { error: 'You are already on a team' }
    }

    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)')
      .run(teamId, userId, 'member')

    return { status: 'joined' as const }
  })

  const result = joinTeam()
  if ('error' in result) {
    return res.status(409).json({ error: result.error })
  }
  return res.json({ status: result.status })
})

teamsRouter.post('/:id/leave', (req, res) => {
  const db = getDb()
  const userId = req.user!.sub
  const teamId = Number(req.params.id)

  const membership = db
    .prepare('SELECT id, role FROM team_members WHERE team_id = ? AND user_id = ?')
    .get(teamId, userId) as { id: number; role: string } | undefined

  if (!membership) {
    return res.status(404).json({ error: 'Not a member of this team' })
  }

  const leaveTeam = db.transaction(() => {
    db.prepare('DELETE FROM team_members WHERE id = ?').run(membership.id)

    const remaining = db
      .prepare('SELECT COUNT(*) AS count FROM team_members WHERE team_id = ?')
      .get(teamId) as { count: number }

    if (remaining.count === 0) {
      db.prepare('DELETE FROM teams WHERE id = ?').run(teamId)
    }
  })

  leaveTeam()
  return res.json({ status: 'left' })
})
