import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { requireAuth } from '../middleware/auth.js'

export const skillModulesRouter = Router()

skillModulesRouter.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const userId = req.user?.sub

  const hackathon = getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [] })
  }

  const modules = db
    .prepare(
      `SELECT sm.id, sm.title, sm.description, sm.sort_order,
              sp.status AS progress_status, sp.completed_at
       FROM skill_modules sm
       LEFT JOIN skill_progress sp ON sp.module_id = sm.id AND sp.user_id = ?
       WHERE sm.hackathon_id = ?
       ORDER BY sm.sort_order ASC`,
    )
    .all(userId, hackathon.id)

  return res.json({ items: modules })
})
