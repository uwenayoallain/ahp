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
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))

  if (existing) {
    return res.json(existing)
  }

  const [neonUser] = await db
    .select({ name: neonAuthUsersSync.name })
    .from(neonAuthUsersSync)
    .where(eq(neonAuthUsersSync.id, userId))

  const displayName = neonUser?.name ?? ''

  await db
    .insert(userProfiles)
    .values({ userId, displayName, role: 'participant' })
    .onConflictDoNothing()

  return res.json({ userId, displayName, role: 'participant' })
})
