import { asc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { skillModules, skillProgress } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export const skillModulesRouter = Router()

skillModulesRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.user?.sub
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const db = getDb()
  const modules = await db
    .select({
      id: skillModules.id,
      title: skillModules.title,
      description: skillModules.description,
      sort_order: skillModules.sortOrder,
      progress_status: skillProgress.status,
      completed_at: skillProgress.completedAt,
    })
    .from(skillModules)
    .leftJoin(
      skillProgress,
      sql`${skillProgress.moduleId} = ${skillModules.id} and ${skillProgress.userId} = ${userId}`,
    )
    .where(eq(skillModules.hackathonId, hackathon.id))
    .orderBy(asc(skillModules.sortOrder))

  return res.json({ items: modules })
})
