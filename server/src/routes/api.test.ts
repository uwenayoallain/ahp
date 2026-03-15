import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Express } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { getDb, resetDbForTests } from '../db/connection.js'

const tempDbPath = path.join(os.tmpdir(), `ahp-test-${process.pid}.sqlite`)

let app: Express

beforeEach(async () => {
  process.env.NODE_ENV = 'test'
  process.env.AHP_DB_PATH = tempDbPath
  resetDbForTests()

  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath)
  }

  const mod = await import('../index.js')
  app = mod.createApp()
})

afterEach(() => {
  resetDbForTests()
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath)
  }
})

async function registerUser(name: string, email: string, password = 'secret123') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password })
  return {
    userId: res.body.user.id as number,
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
  }
}

async function makeAdmin(userId: number) {
  const db = getDb()
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userId)
}

function seedHackathon() {
  const db = getDb()
  const info = db.prepare(
    `INSERT INTO hackathons (name, slug, description, start_date, end_date, is_active)
     VALUES ('Test Hack', 'test-hack', 'A test hackathon', '2026-03-16', '2026-03-20', 1)`,
  ).run()
  return Number(info.lastInsertRowid)
}

function seedChallenge(hackathonId: number, dayNumber: number, slug: string, title = 'Challenge') {
  const db = getDb()
  const info = db.prepare(
    `INSERT INTO challenges (hackathon_id, day_number, title, slug, difficulty, summary, description, setup_instructions, resources, max_points)
     VALUES (?, ?, ?, ?, 'medium', 'Summary', 'Full description', 'Run npm install', '[]', 100)`,
  ).run(hackathonId, dayNumber, title, slug)
  return Number(info.lastInsertRowid)
}

function seedTeam(hackathonId: number, name: string, createdBy: number) {
  const db = getDb()
  const info = db.prepare(
    'INSERT INTO teams (hackathon_id, name, created_by) VALUES (?, ?, ?)',
  ).run(hackathonId, name, createdBy)
  const teamId = Number(info.lastInsertRowid)
  db.prepare(
    'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
  ).run(teamId, createdBy, 'lead')
  return teamId
}

function seedSubmission(userId: number, teamId: number | null, challengeId: number | null, title: string) {
  const db = getDb()
  const info = db.prepare(
    `INSERT INTO submissions (user_id, team_id, team_name, challenge_id, project_title, description, category)
     VALUES (?, ?, 'Team', ?, ?, 'Desc', 'Algorithm')`,
  ).run(userId, teamId, challengeId, title)
  return Number(info.lastInsertRowid)
}

function seedScheduleEvent(hackathonId: number, dayNumber: number, title: string, time: string) {
  const db = getDb()
  db.prepare(
    `INSERT INTO schedule_events (hackathon_id, day_number, time, title, venue, sort_order)
     VALUES (?, ?, ?, ?, 'Room A', 0)`,
  ).run(hackathonId, dayNumber, time, title)
}

function seedRule(hackathonId: number, title: string, body: string, sortOrder: number) {
  const db = getDb()
  db.prepare(
    'INSERT INTO rules (hackathon_id, title, body, sort_order) VALUES (?, ?, ?, ?)',
  ).run(hackathonId, title, body, sortOrder)
}

function seedSkillModule(hackathonId: number, id: string, title: string) {
  const db = getDb()
  db.prepare(
    'INSERT INTO skill_modules (id, hackathon_id, title, description, sort_order) VALUES (?, ?, ?, ?, 0)',
  ).run(id, hackathonId, title, `${title} description`)
}

describe('health', () => {
  test('GET /api/health responds with ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('auth', () => {
  test('register + login flow works', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
    })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.accessToken).toBeTypeOf('string')
    expect(registerRes.body.refreshToken).toBeTypeOf('string')
    expect(registerRes.body.user.name).toBe('Test User')

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'secret123',
    })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.email).toBe('test@example.com')
    expect(loginRes.body.accessToken).toBeTypeOf('string')
  })

  test('register rejects duplicate email', async () => {
    await registerUser('User A', 'dup@example.com')
    const res = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'dup@example.com',
      password: 'secret123',
    })
    expect(res.status).toBe(409)
  })

  test('register rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@y.com' })
    expect(res.status).toBe(400)
  })

  test('login rejects wrong password', async () => {
    await registerUser('User', 'u@test.com')
    const res = await request(app).post('/api/auth/login').send({
      email: 'u@test.com',
      password: 'wrong',
    })
    expect(res.status).toBe(401)
  })

  test('login rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'secret123',
    })
    expect(res.status).toBe(401)
  })

  test('refresh token flow works', async () => {
    const { refreshToken } = await registerUser('User', 'u@test.com')
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTypeOf('string')
    expect(res.body.refreshToken).toBeTypeOf('string')
  })

  test('register rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'User',
      email: 'not-an-email',
      password: 'secret123',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email/i)
  })

  test('register rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'User',
      email: 'u@test.com',
      password: '123',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/password/i)
  })

  test('refresh rejects revoked token', async () => {
    const { refreshToken } = await registerUser('User', 'u@test.com')
    const first = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(first.status).toBe(200)

    const second = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(second.status).toBe(401)
  })

  test('logout revokes refresh token', async () => {
    const { refreshToken } = await registerUser('User', 'u@test.com')

    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken })
    expect(logoutRes.status).toBe(200)

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(refreshRes.status).toBe(401)
  })
})

describe('hackathons', () => {
  test('GET /api/hackathons/active returns 404 when none active', async () => {
    const res = await request(app).get('/api/hackathons/active')
    expect(res.status).toBe(404)
  })

  test('GET /api/hackathons/active returns active hackathon', async () => {
    seedHackathon()
    const res = await request(app).get('/api/hackathons/active')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test Hack')
    expect(res.body.slug).toBe('test-hack')
  })
})

describe('challenges', () => {
  test('GET /api/challenges returns empty when no hackathon', async () => {
    const res = await request(app).get('/api/challenges')
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  test('GET /api/challenges returns challenges for active hackathon', async () => {
    const hId = seedHackathon()
    seedChallenge(hId, 1, 'day-1', 'Day 1 Challenge')
    seedChallenge(hId, 2, 'day-2', 'Day 2 Challenge')

    const res = await request(app).get('/api/challenges')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].day_number).toBe(1)
    expect(res.body.items[1].day_number).toBe(2)
  })

  test('GET /api/challenges/:slug returns challenge by slug', async () => {
    const hId = seedHackathon()
    seedChallenge(hId, 1, 'day-1', 'Day 1 Challenge')

    const res = await request(app).get('/api/challenges/day-1')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Day 1 Challenge')
    expect(res.body.description).toBe('Full description')
    expect(res.body.resources).toEqual([])
  })

  test('GET /api/challenges/:id returns challenge by numeric id', async () => {
    const hId = seedHackathon()
    const cId = seedChallenge(hId, 1, 'day-1', 'Day 1 Challenge')

    const res = await request(app).get(`/api/challenges/${cId}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Day 1 Challenge')
  })

  test('GET /api/challenges/:slug returns 404 for unknown', async () => {
    const res = await request(app).get('/api/challenges/nonexistent')
    expect(res.status).toBe(404)
  })

  test('challenge resources are parsed from JSON string', async () => {
    const hId = seedHackathon()
    const db = getDb()
    db.prepare(
      `INSERT INTO challenges (hackathon_id, day_number, title, slug, resources, max_points)
       VALUES (?, 1, 'C1', 'c1', ?, 100)`,
    ).run(hId, JSON.stringify([{ label: 'Docs', url: 'https://example.com' }]))

    const res = await request(app).get('/api/challenges/c1')
    expect(res.status).toBe(200)
    expect(res.body.resources).toEqual([{ label: 'Docs', url: 'https://example.com' }])
  })
})

describe('schedule', () => {
  test('GET /api/schedule returns empty when no hackathon', async () => {
    const res = await request(app).get('/api/schedule')
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  test('GET /api/schedule returns events for active hackathon', async () => {
    const hId = seedHackathon()
    seedScheduleEvent(hId, 1, 'Opening Ceremony', '09:00')
    seedScheduleEvent(hId, 1, 'Workshop', '10:00')

    const res = await request(app).get('/api/schedule')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].title).toBe('Opening Ceremony')
    expect(res.headers['cache-control']).toBe('public, max-age=300')
  })
})

describe('rules', () => {
  test('GET /api/rules returns empty when no hackathon', async () => {
    const res = await request(app).get('/api/rules')
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  test('GET /api/rules returns rules ordered by sort_order', async () => {
    const hId = seedHackathon()
    seedRule(hId, 'Rule B', 'Body B', 2)
    seedRule(hId, 'Rule A', 'Body A', 1)

    const res = await request(app).get('/api/rules')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].title).toBe('Rule A')
    expect(res.body.items[1].title).toBe('Rule B')
  })
})

describe('skill-modules', () => {
  test('GET /api/skill-modules requires auth', async () => {
    const res = await request(app).get('/api/skill-modules')
    expect(res.status).toBe(401)
  })

  test('GET /api/skill-modules returns empty when no hackathon', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    const res = await request(app)
      .get('/api/skill-modules')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  test('GET /api/skill-modules returns modules with user progress', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    seedSkillModule(hId, 'mod-1', 'Module 1')
    seedSkillModule(hId, 'mod-2', 'Module 2')

    const db = getDb()
    db.prepare(
      "INSERT INTO skill_progress (user_id, module_id, status) VALUES (?, 'mod-1', 'completed')",
    ).run(userId)

    const res = await request(app)
      .get('/api/skill-modules')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)

    const mod1 = res.body.items.find((m: { id: string }) => m.id === 'mod-1')
    expect(mod1.progress_status).toBe('completed')

    const mod2 = res.body.items.find((m: { id: string }) => m.id === 'mod-2')
    expect(mod2.progress_status).toBeNull()
  })
})

describe('leaderboard', () => {
  test('GET /api/leaderboard returns empty when no hackathon', async () => {
    const res = await request(app).get('/api/leaderboard')
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  test('GET /api/leaderboard returns teams ranked by score', async () => {
    const { userId: user1 } = await registerUser('User1', 'u1@test.com')
    const { userId: user2 } = await registerUser('User2', 'u2@test.com')
    const hId = seedHackathon()
    const cId = seedChallenge(hId, 1, 'c1', 'C1')

    const team1 = seedTeam(hId, 'Alpha', user1)
    const team2 = seedTeam(hId, 'Beta', user2)

    const db = getDb()
    db.prepare(
      `INSERT INTO submissions (user_id, team_id, team_name, challenge_id, project_title, description, category, score, status)
       VALUES (?, ?, 'Alpha', ?, 'P1', 'D', 'Algo', 90, 'reviewed')`,
    ).run(user1, team1, cId)
    db.prepare(
      `INSERT INTO submissions (user_id, team_id, team_name, challenge_id, project_title, description, category, score, status)
       VALUES (?, ?, 'Beta', ?, 'P2', 'D', 'Algo', 75, 'reviewed')`,
    ).run(user2, team2, cId)

    const res = await request(app).get('/api/leaderboard')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].name).toBe('Alpha')
    expect(res.body.items[0].total_score).toBe(90)
    expect(res.body.items[1].name).toBe('Beta')
    expect(res.body.items[1].total_score).toBe(75)
    expect(res.body.total).toBe(2)
    expect(res.body.page).toBe(1)
  })
})

describe('teams', () => {
  test('GET /api/teams requires auth', async () => {
    const res = await request(app).get('/api/teams')
    expect(res.status).toBe(401)
  })

  test('GET /api/teams returns teams and myTeam', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    seedTeam(hId, 'My Team', userId)

    const res = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.myTeam).not.toBeNull()
    expect(res.body.myTeam.name).toBe('My Team')
    expect(res.body.myTeam.members).toHaveLength(1)
  })

  test('GET /api/teams returns null myTeam when user has no team', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    seedHackathon()

    const res = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.myTeam).toBeNull()
  })

  test('POST /api/teams creates a team', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    seedHackathon()

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Team' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Team')
  })

  test('POST /api/teams rejects short name', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    seedHackathon()

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'A' })
    expect(res.status).toBe(400)
  })

  test('POST /api/teams rejects duplicate team name', async () => {
    const { userId } = await registerUser('User A', 'a@test.com')
    const { accessToken: tokenB } = await registerUser('User B', 'b@test.com')
    const hId = seedHackathon()
    seedTeam(hId, 'Taken', userId)

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Taken' })
    expect(res.status).toBe(409)
  })

  test('POST /api/teams rejects if user already on a team', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    seedTeam(hId, 'Existing', userId)

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Another' })
    expect(res.status).toBe(409)
  })

  test('POST /api/teams/:id/join adds user to team', async () => {
    const { userId: creator } = await registerUser('Creator', 'c@test.com')
    const { accessToken: joinerToken } = await registerUser('Joiner', 'j@test.com')
    const hId = seedHackathon()
    const teamId = seedTeam(hId, 'Open Team', creator)

    const res = await request(app)
      .post(`/api/teams/${teamId}/join`)
      .set('Authorization', `Bearer ${joinerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('joined')
  })

  test('POST /api/teams/:id/join rejects if already on a team', async () => {
    const { userId: u1 } = await registerUser('U1', 'u1@test.com')
    const { accessToken: token2, userId: u2 } = await registerUser('U2', 'u2@test.com')
    const hId = seedHackathon()
    seedTeam(hId, 'Team A', u1)
    seedTeam(hId, 'Team B', u2)

    const teamA = getDb().prepare("SELECT id FROM teams WHERE name = 'Team A'").get() as { id: number }

    const res = await request(app)
      .post(`/api/teams/${teamA.id}/join`)
      .set('Authorization', `Bearer ${token2}`)
    expect(res.status).toBe(409)
  })

  test('POST /api/teams/:id/join returns 404 for nonexistent team', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    seedHackathon()

    const res = await request(app)
      .post('/api/teams/9999/join')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  test('POST /api/teams/:id/leave removes user from team', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    const teamId = seedTeam(hId, 'My Team', userId)

    const res = await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('left')
  })

  test('POST /api/teams/:id/leave deletes team when last member leaves', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    const teamId = seedTeam(hId, 'Solo Team', userId)

    await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${accessToken}`)

    const db = getDb()
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId)
    expect(team).toBeUndefined()
  })

  test('POST /api/teams/:id/leave returns 404 if not a member', async () => {
    const { userId: creator } = await registerUser('Creator', 'c@test.com')
    const { accessToken: otherToken } = await registerUser('Other', 'o@test.com')
    const hId = seedHackathon()
    const teamId = seedTeam(hId, 'Their Team', creator)

    const res = await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(404)
  })

  test('POST /api/teams create is atomic — team + membership created together', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    seedHackathon()

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Atomic Team' })
    expect(res.status).toBe(201)

    const db = getDb()
    const team = db.prepare("SELECT id FROM teams WHERE name = 'Atomic Team'").get() as { id: number }
    const member = db.prepare('SELECT user_id, role FROM team_members WHERE team_id = ?').get(team.id) as { user_id: number; role: string }
    expect(member.user_id).toBe(userId)
    expect(member.role).toBe('lead')
  })

  test('POST /api/teams/:id/leave is atomic — team deleted with last member', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    const teamId = seedTeam(hId, 'Doomed Team', userId)

    await request(app)
      .post(`/api/teams/${teamId}/leave`)
      .set('Authorization', `Bearer ${accessToken}`)

    const db = getDb()
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId)
    const members = db.prepare('SELECT id FROM team_members WHERE team_id = ?').all(teamId)
    expect(team).toBeUndefined()
    expect(members).toHaveLength(0)
  })
})

describe('submissions', () => {
  test('GET /api/submissions requires auth', async () => {
    const res = await request(app).get('/api/submissions')
    expect(res.status).toBe(401)
  })

  test('GET /api/submissions returns user submissions', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    const cId = seedChallenge(hId, 1, 'c1', 'C1')
    seedSubmission(userId, null, cId, 'My Project')

    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].project_title).toBe('My Project')
  })

  test('GET /api/submissions/:id returns own submission', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const subId = seedSubmission(userId, null, null, 'My Project')

    const res = await request(app)
      .get(`/api/submissions/${subId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.project_title).toBe('My Project')
  })

  test('GET /api/submissions/:id returns 403 for other user submission', async () => {
    const { userId: owner } = await registerUser('Owner', 'own@test.com')
    const { accessToken: otherToken } = await registerUser('Other', 'oth@test.com')
    const subId = seedSubmission(owner, null, null, 'Their Project')

    const res = await request(app)
      .get(`/api/submissions/${subId}`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  test('GET /api/submissions/:id allows admin to view any submission', async () => {
    const { userId: owner } = await registerUser('Owner', 'own@test.com')
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)

    const mod = await import('../middleware/auth.js')
    const newToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const subId = seedSubmission(owner, null, null, 'Their Project')

    const res = await request(app)
      .get(`/api/submissions/${subId}`)
      .set('Authorization', `Bearer ${newToken}`)
    expect(res.status).toBe(200)
  })

  test('GET /api/submissions/:id returns 404 for nonexistent', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    const res = await request(app)
      .get('/api/submissions/9999')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  test('GET /api/submissions/:id returns 400 for non-numeric id', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    const res = await request(app)
      .get('/api/submissions/abc')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(400)
  })

  test('GET /api/submissions/categories returns distinct categories', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    seedSubmission(userId, null, null, 'P1')
    seedSubmission(userId, null, null, 'P2')

    const res = await request(app)
      .get('/api/submissions/categories')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toContain('Algorithm')
    expect(new Set(res.body.items).size).toBe(res.body.items.length)
  })
})

describe('stats', () => {
  test('GET /api/me/stats requires auth', async () => {
    const res = await request(app).get('/api/me/stats')
    expect(res.status).toBe(401)
  })

  test('GET /api/me/stats returns zeros when no hackathon', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')
    const res = await request(app)
      .get('/api/me/stats')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.submissionCount).toBe(0)
    expect(res.body.rank).toBeNull()
  })

  test('GET /api/me/stats returns correct stats', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')
    const hId = seedHackathon()
    const cId = seedChallenge(hId, 1, 'c1', 'C1')
    const teamId = seedTeam(hId, 'My Team', userId)

    const db = getDb()
    db.prepare(
      `INSERT INTO submissions (user_id, team_id, team_name, challenge_id, project_title, description, category, score, status)
       VALUES (?, ?, 'My Team', ?, 'P1', 'D', 'Algo', 85, 'reviewed')`,
    ).run(userId, teamId, cId)

    seedSkillModule(hId, 'mod-1', 'Module 1')
    seedSkillModule(hId, 'mod-2', 'Module 2')
    db.prepare(
      "INSERT INTO skill_progress (user_id, module_id, status) VALUES (?, 'mod-1', 'completed')",
    ).run(userId)

    const res = await request(app)
      .get('/api/me/stats')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.submissionCount).toBe(1)
    expect(res.body.totalScore).toBe(85)
    expect(res.body.rank).toBe(1)
    expect(res.body.teamName).toBe('My Team')
    expect(res.body.completedModules).toBe(1)
    expect(res.body.totalModules).toBe(2)
  })
})

describe('admin', () => {
  test('admin endpoints reject non-admin users', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')

    const res = await request(app)
      .get('/api/admin/submissions')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(403)
  })

  test('admin endpoints reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/submissions')
    expect(res.status).toBe(401)
  })

  test('GET /api/admin/submissions returns all submissions', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const { userId: user1 } = await registerUser('U1', 'u1@test.com')
    const { userId: user2 } = await registerUser('U2', 'u2@test.com')
    seedSubmission(user1, null, null, 'Project 1')
    seedSubmission(user2, null, null, 'Project 2')

    const res = await request(app)
      .get('/api/admin/submissions')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.total).toBe(2)
    expect(res.body.page).toBe(1)
  })

  test('GET /api/admin/submissions supports pagination', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const { userId } = await registerUser('User', 'u@test.com')
    seedSubmission(userId, null, null, 'P1')
    seedSubmission(userId, null, null, 'P2')
    seedSubmission(userId, null, null, 'P3')

    const res = await request(app)
      .get('/api/admin/submissions?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.total).toBe(3)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(2)

    const res2 = await request(app)
      .get('/api/admin/submissions?page=2&limit=2')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res2.body.items).toHaveLength(1)
    expect(res2.body.page).toBe(2)
  })

  test('GET /api/admin/users returns all users', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    await registerUser('U1', 'u1@test.com')

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBeGreaterThanOrEqual(2)
    expect(res.body).toHaveProperty('totalModules')
    expect(typeof res.body.totalModules).toBe('number')
  })

  test('GET /api/admin/stats returns stats', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalSubmissions')
    expect(res.body).toHaveProperty('totalUsers')
    expect(res.body).toHaveProperty('reviewRate')
  })

  test('PATCH /api/admin/submissions/:id/score scores a submission', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const { userId } = await registerUser('User', 'u@test.com')
    const subId = seedSubmission(userId, null, null, 'Project')

    const res = await request(app)
      .patch(`/api/admin/submissions/${subId}/score`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: 95 })
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(95)

    const db = getDb()
    const sub = db.prepare('SELECT score, status FROM submissions WHERE id = ?').get(subId) as { score: number; status: string }
    expect(sub.score).toBe(95)
    expect(sub.status).toBe('reviewed')
  })

  test('PATCH /api/admin/submissions/:id/score rejects invalid score', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const res = await request(app)
      .patch('/api/admin/submissions/1/score')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: -5 })
    expect(res.status).toBe(400)
  })

  test('PATCH /api/admin/submissions/:id/score returns 404 for nonexistent', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const res = await request(app)
      .patch('/api/admin/submissions/9999/score')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: 50 })
    expect(res.status).toBe(404)
  })

  test('GET /api/admin/submissions/:id returns a single submission', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const { userId } = await registerUser('User', 'u@test.com')
    const subId = seedSubmission(userId, null, null, 'My Project')

    const res = await request(app)
      .get(`/api/admin/submissions/${subId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(subId)
    expect(res.body.project_title).toBe('My Project')
    expect(res.body.user_name).toBe('User')
    expect(res.body).toHaveProperty('description')
  })

  test('GET /api/admin/submissions/:id returns 404 for nonexistent', async () => {
    const { userId: adminId } = await registerUser('Admin', 'admin@test.com')
    await makeAdmin(adminId)
    const mod = await import('../middleware/auth.js')
    const adminToken = mod.signAccessToken({ sub: adminId, role: 'admin' })

    const res = await request(app)
      .get('/api/admin/submissions/9999')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})

describe('sync', () => {
  test('POST /api/sync requires auth', async () => {
    const res = await request(app).post('/api/sync').send({ action: 'submission', payload: {} })
    expect(res.status).toBe(401)
  })

  test('POST /api/sync creates a new submission', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-abc',
          teamName: 'Solo',
          projectTitle: 'Synced Project',
          description: 'Description',
          category: 'Algorithm',
          version: 1,
        },
      })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('created')

    const db = getDb()
    const sub = db.prepare('SELECT project_title FROM submissions WHERE user_id = ?').get(userId) as { project_title: string }
    expect(sub.project_title).toBe('Synced Project')

    const log = db.prepare('SELECT status FROM sync_log WHERE user_id = ?').get(userId) as { status: string }
    expect(log.status).toBe('success')
  })

  test('POST /api/sync returns conflict on version mismatch', async () => {
    const { accessToken, userId } = await registerUser('User', 'u@test.com')

    const db = getDb()
    db.prepare(
      `INSERT INTO submissions (user_id, local_id, team_name, project_title, description, category, version)
       VALUES (?, 'draft-x', 'T', 'P', 'D', 'Algo', 5)`,
    ).run(userId)

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-x',
          teamName: 'T',
          projectTitle: 'P',
          description: 'D',
          category: 'Algo',
          version: 3,
        },
      })
    expect(res.status).toBe(409)
    expect(res.body.status).toBe('conflict')
  })

  test('POST /api/sync ignores non-submission actions', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ action: 'skillProgress', payload: {} })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ignored')
  })

  test('GET /api/sync/status returns sync status', async () => {
    const { accessToken } = await registerUser('User', 'u@test.com')

    const res = await request(app)
      .get('/api/sync/status')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('submissions')
    expect(res.body).toHaveProperty('queueHealth')
  })
})
