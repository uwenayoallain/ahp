import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { userProfiles, neonAuthUsersSync } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const db = getDb()

  const [existing] = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      role: userProfiles.role,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))

  if (existing) {
    const [neonUser] = await db
      .select({ email: neonAuthUsersSync.email })
      .from(neonAuthUsersSync)
      .where(eq(neonAuthUsersSync.id, userId))

    return res.json({ ...existing, email: neonUser?.email ?? '' })
  }

  const [neonUser] = await db
    .select({ name: neonAuthUsersSync.name, email: neonAuthUsersSync.email })
    .from(neonAuthUsersSync)
    .where(eq(neonAuthUsersSync.id, userId))

  const displayName = neonUser?.name ?? ''

  await db
    .insert(userProfiles)
    .values({ userId, displayName, role: 'participant' })
    .onConflictDoNothing()

  return res.json({ userId, displayName, role: 'participant', avatarUrl: '', bio: '', email: neonUser?.email ?? '' })
})

authRouter.patch('/profile', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const db = getDb()
  const { displayName, bio, avatarUrl } = req.body as {
    displayName?: string
    bio?: string
    avatarUrl?: string
  }

  const updates: Record<string, string> = {}
  if (typeof displayName === 'string') updates.displayName = displayName.slice(0, 100)
  if (typeof bio === 'string') updates.bio = bio.slice(0, 500)
  if (typeof avatarUrl === 'string') updates.avatarUrl = avatarUrl.slice(0, 500)

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const setClause: Record<string, unknown> = {}
  if ('displayName' in updates) setClause.displayName = updates.displayName
  if ('bio' in updates) setClause.bio = updates.bio
  if ('avatarUrl' in updates) setClause.avatarUrl = updates.avatarUrl

  await db
    .update(userProfiles)
    .set(setClause)
    .where(eq(userProfiles.userId, userId))

  const [updated] = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      role: userProfiles.role,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))

  const [neonUser] = await db
    .select({ email: neonAuthUsersSync.email })
    .from(neonAuthUsersSync)
    .where(eq(neonAuthUsersSync.id, userId))

  return res.json({ ...updated, email: neonUser?.email ?? '' })
})
