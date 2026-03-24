import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Express } from 'express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { getDb, initializeDbForTests, resetDbForTests } from '../db/connection.js'
import {
  challenges,
  hackathons,
  neonAuthUsersSync,
  submissions,
  teamMembers,
  teams,
  userProfiles,
} from '../db/schema.js'

let app: Express
let tempDir: string

beforeEach(async () => {
  process.env.NODE_ENV = 'test'
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahp-pglite-'))
  process.env.DATABASE_URL = `pglite://${encodeURIComponent(tempDir)}`
  await resetDbForTests()

  const mod = await import('../index.js')
  app = mod.createApp()
  await initializeDbForTests()
})

afterEach(async () => {
  await resetDbForTests()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

function authHeaders(userId: string, role: 'participant' | 'admin' = 'participant') {
  return {
    'x-test-user-id': userId,
    'x-test-user-role': role,
  }
}

function testUserId(label: string) {
  const hex = Buffer.from(label).toString('hex').slice(0, 12).padEnd(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

async function seedUser(userId: string, displayName: string, role: 'participant' | 'admin' = 'participant') {
  const db = getDb()

  await db.insert(neonAuthUsersSync).values({
    id: userId,
    name: displayName,
    email: `${userId}@example.com`,
  }).onConflictDoNothing()

  await db.insert(userProfiles).values({
    userId,
    displayName,
    role,
  }).onConflictDoNothing()
}

async function seedHackathon(values?: Partial<{
  name: string
  slug: string
  isActive: boolean
  teamSizeMin: number
  teamSizeMax: number
  latePolicy: 'reject' | 'accept_with_penalty'
  latePenaltyPercentPerHour: number
}>) {
  const db = getDb()
  const [row] = await db.insert(hackathons).values({
    name: values?.name ?? 'Test Hackathon',
    slug: values?.slug ?? `test-hack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: 'Test event',
    startDate: new Date('2026-03-16T08:00:00Z'),
    endDate: new Date('2026-03-20T18:00:00Z'),
    isActive: values?.isActive ?? true,
    teamSizeMin: values?.teamSizeMin ?? 1,
    teamSizeMax: values?.teamSizeMax ?? 4,
    latePolicy: values?.latePolicy ?? 'accept_with_penalty',
    latePenaltyPercentPerHour: values?.latePenaltyPercentPerHour ?? 20,
  }).returning({ id: hackathons.id })

  return row.id
}

async function seedChallenge(hackathonId: number, dayNumber: number, title: string, values?: Partial<{
  slug: string
  unlockAt: Date | null
  submissionDeadlineAt: Date | null
  maxPoints: number
}>) {
  const db = getDb()
  const [row] = await db.insert(challenges).values({
    hackathonId,
    dayNumber,
    title,
    slug: values?.slug ?? `challenge-${dayNumber}-${Math.random().toString(36).slice(2, 8)}`,
    difficulty: 'medium',
    summary: 'Summary',
    description: 'Description',
    setupInstructions: 'Setup',
    resources: '[]',
    maxPoints: values?.maxPoints ?? 100,
    unlockAt: values?.unlockAt ?? new Date('2026-03-16T09:00:00Z'),
    submissionDeadlineAt: values?.submissionDeadlineAt ?? new Date('2026-03-16T17:00:00Z'),
  }).returning({ id: challenges.id })

  return row.id
}

async function seedTeam(hackathonId: number, createdBy: string, name = 'Alpha Team') {
  const db = getDb()
  const [team] = await db.insert(teams).values({
    hackathonId,
    createdBy,
    name,
  }).returning({ id: teams.id })

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: createdBy,
    role: 'lead',
  })

  return team.id
}

describe('health', () => {
  test('GET /api/health responds with ok', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('hackathons', () => {
  test('GET /api/hackathons/active returns 404 when none active', async () => {
    const res = await request(app).get('/api/hackathons/active')

    expect(res.status).toBe(404)
  })

  test('POST /api/admin/hackathons creates a configurable hackathon', async () => {
    const adminUserId = testUserId('admin-user')
    await seedUser(adminUserId, 'Admin User', 'admin')

    const res = await request(app)
      .post('/api/admin/hackathons')
      .set(authHeaders(adminUserId, 'admin'))
      .send({
        name: 'Aegis 2027',
        slug: 'aegis-2027',
        description: 'Future event',
        startDate: '2027-04-01T08:00:00Z',
        endDate: '2027-04-05T18:00:00Z',
        teamSizeMin: 1,
        teamSizeMax: 3,
        latePolicy: 'accept_with_penalty',
        latePenaltyPercentPerHour: 10,
      })

    expect(res.status).toBe(201)
    expect(res.body.slug).toBe('aegis-2027')
    expect(res.body.teamSizeMax).toBe(3)
  })

  test('POST /api/admin/hackathons/:id/activate switches the active hackathon', async () => {
    const adminUserId = testUserId('admin-user')
    await seedUser(adminUserId, 'Admin User', 'admin')
    const firstId = await seedHackathon({ slug: 'first', isActive: true })
    const secondId = await seedHackathon({ slug: 'second', isActive: false })

    const res = await request(app)
      .post(`/api/admin/hackathons/${secondId}/activate`)
      .set(authHeaders(adminUserId, 'admin'))

    expect(res.status).toBe(200)

    const activeRes = await request(app).get('/api/hackathons/active')
    expect(activeRes.status).toBe(200)
    expect(activeRes.body.slug).toBe('second')

    const db = getDb()
    const rows = await db
      .select({ id: hackathons.id, isActive: hackathons.isActive })
      .from(hackathons)

    expect(rows.find((row) => row.id === firstId)?.isActive).toBe(false)
    expect(rows.find((row) => row.id === secondId)?.isActive).toBe(true)
  })
})

describe('team requests', () => {
  test('participants request access instead of joining directly', async () => {
    const leadUserId = testUserId('lead-user')
    const participantUserId = testUserId('participant-user')
    await seedUser(leadUserId, 'Lead User')
    await seedUser(participantUserId, 'Participant User')
    const hackathonId = await seedHackathon()
    const teamId = await seedTeam(hackathonId, leadUserId, 'Request Team')

    const joinRes = await request(app)
      .post(`/api/teams/${teamId}/join`)
      .set(authHeaders(participantUserId))

    expect(joinRes.status).toBe(404)

    const requestRes = await request(app)
      .post(`/api/teams/${teamId}/requests`)
      .set(authHeaders(participantUserId))
      .send({ message: 'Please let me join.' })

    expect(requestRes.status).toBe(201)
    expect(requestRes.body.status).toBe('pending')
  })

  test('team lead can approve a pending request', async () => {
    const leadUserId = testUserId('lead-user')
    const participantUserId = testUserId('participant-user')
    await seedUser(leadUserId, 'Lead User')
    await seedUser(participantUserId, 'Participant User')
    const hackathonId = await seedHackathon()
    const teamId = await seedTeam(hackathonId, leadUserId, 'Approval Team')

    const requestRes = await request(app)
      .post(`/api/teams/${teamId}/requests`)
      .set(authHeaders(participantUserId))
      .send({ message: 'Please approve me.' })

    expect(requestRes.status).toBe(201)

    const approveRes = await request(app)
      .post(`/api/teams/requests/${requestRes.body.id}/approve`)
      .set(authHeaders(leadUserId))

    expect(approveRes.status).toBe(200)
    expect(approveRes.body.status).toBe('approved')

    const db = getDb()
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))

    expect(members.map((member) => member.userId)).toContain(participantUserId)
  })
})

describe('submission sync', () => {
  test('sync derives team membership from the authenticated user instead of trusting payload teamId', async () => {
    const leadUserId = testUserId('lead-user')
    const attackerUserId = testUserId('attacker-user')
    await seedUser(leadUserId, 'Lead User')
    await seedUser(attackerUserId, 'Attacker User')
    const hackathonId = await seedHackathon()
    const challengeId = await seedChallenge(hackathonId, 1, 'Secure Challenge', {
      unlockAt: new Date('2026-03-16T08:00:00Z'),
      submissionDeadlineAt: new Date('2026-03-16T18:00:00Z'),
    })
    const protectedTeamId = await seedTeam(hackathonId, leadUserId, 'Protected Team')

    const res = await request(app)
      .post('/api/sync')
      .set(authHeaders(attackerUserId))
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-1',
          teamId: protectedTeamId,
          teamName: 'Protected Team',
          challengeId,
          projectTitle: 'Spoof attempt',
          description: 'Should not attach to another team',
          category: 'Security',
          version: 1,
        },
      })

    expect(res.status).toBe(200)

    const db = getDb()
    const [row] = await db
      .select({
        teamId: submissions.teamId,
        teamName: submissions.teamName,
      })
      .from(submissions)
      .where(eq(submissions.localId, 'draft-1'))

    expect(row.teamId).toBeNull()
    expect(row.teamName).toBe('')
  })

  test('sync rejects submissions for challenges that are not yet unlocked', async () => {
    const participantUserId = testUserId('participant-user')
    await seedUser(participantUserId, 'Participant User')
    const hackathonId = await seedHackathon()
    const challengeId = await seedChallenge(hackathonId, 1, 'Locked Challenge', {
      unlockAt: new Date('2099-01-01T09:00:00Z'),
      submissionDeadlineAt: new Date('2099-01-01T17:00:00Z'),
    })

    const res = await request(app)
      .post('/api/sync')
      .set(authHeaders(participantUserId))
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-locked',
          challengeId,
          projectTitle: 'Too early',
          description: 'Locked challenge',
          category: 'Algorithm',
          version: 1,
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/unlock/i)
  })

  test('sync stores a late penalty when the active hackathon accepts late submissions', async () => {
    const participantUserId = testUserId('late-user')
    await seedUser(participantUserId, 'Late User')
    const hackathonId = await seedHackathon({
      latePolicy: 'accept_with_penalty',
      latePenaltyPercentPerHour: 15,
    })
    const challengeId = await seedChallenge(hackathonId, 1, 'Late Challenge', {
      unlockAt: new Date('2020-01-01T09:00:00Z'),
      submissionDeadlineAt: new Date('2020-01-01T10:00:00Z'),
    })

    const res = await request(app)
      .post('/api/sync')
      .set(authHeaders(participantUserId))
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-late',
          challengeId,
          projectTitle: 'Late but valid',
          description: 'Submitted after the deadline',
          category: 'Security',
          version: 1,
        },
      })

    expect(res.status).toBe(200)

    const db = getDb()
    const [row] = await db
      .select({
        penaltyPercent: submissions.penaltyPercent,
      })
      .from(submissions)
      .where(eq(submissions.localId, 'draft-late'))

    expect(row.penaltyPercent).toBeGreaterThan(0)
  })

  test('sync rejects late submissions when the active hackathon late policy is reject', async () => {
    const participantUserId = testUserId('reject-late-user')
    await seedUser(participantUserId, 'Reject Late User')
    const hackathonId = await seedHackathon({
      latePolicy: 'reject',
    })
    const challengeId = await seedChallenge(hackathonId, 1, 'Closed Challenge', {
      unlockAt: new Date('2020-01-01T09:00:00Z'),
      submissionDeadlineAt: new Date('2020-01-01T10:00:00Z'),
    })

    const res = await request(app)
      .post('/api/sync')
      .set(authHeaders(participantUserId))
      .send({
        action: 'submission',
        payload: {
          localId: 'draft-rejected-late',
          challengeId,
          projectTitle: 'Too late',
          description: 'Should be rejected',
          category: 'Security',
          version: 1,
        },
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/deadline/i)
  })
})
