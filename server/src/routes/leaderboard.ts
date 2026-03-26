import { sql, eq } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { teams, teamMembers, submissions } from '../db/schema.js'
import { parsePagination } from '../pagination.js'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({ items: [], total: 0, page, limit })
  }

  const db = getDb()

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teams)
    .where(eq(teams.hackathonId, hackathon.id))

  const total = totalRow?.count ?? 0

  const items = await db
    .select({
      id: teams.id,
      name: teams.name,
      member_count: sql<number>`count(distinct ${teamMembers.userId})`,
      total_score: sql<number>`coalesce(sum(${submissions.score}), 0)`,
      submission_count: sql<number>`count(distinct ${submissions.id})`,
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .leftJoin(submissions, sql`${submissions.teamId} = ${teams.id} and ${submissions.score} is not null`)
    .where(eq(teams.hackathonId, hackathon.id))
    .groupBy(teams.id)
    .orderBy(sql`coalesce(sum(${submissions.score}), 0) desc`, sql`count(distinct ${submissions.id}) desc`)
    .limit(limit)
    .offset(offset)

  return res.json({ items, total, page, limit })
})
