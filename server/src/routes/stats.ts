import { sql, eq } from 'drizzle-orm'
import { Router } from 'express'
import { getActiveHackathon } from '../activeHackathon.js'
import { getDb } from '../db/connection.js'
import { submissions, teams, teamMembers } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export const statsRouter = Router()

statsRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const hackathon = await getActiveHackathon()

  if (!hackathon) {
    return res.json({
      submissionCount: 0,
      totalScore: 0,
      rank: null,
      teamName: null,
      completedModules: 0,
      totalModules: 0,
    })
  }

  const db = getDb()

  const [submissionStats] = await db
    .select({
      count: sql<number>`count(*)`,
      total_score: sql<number>`coalesce(sum(${submissions.score}), 0)`,
    })
    .from(submissions)
    .where(eq(submissions.userId, userId))

  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(sql`${teams.hackathonId} = ${hackathon.id} and ${teamMembers.userId} = ${userId}`)
    .limit(1)

  let rank: number | null = null
  if (team) {
    const ranked = await db.execute<{ rank: number }>(sql`
      SELECT ranked.rank
      FROM (
        SELECT t.id,
               RANK() OVER (ORDER BY COALESCE(SUM(s.score), 0) DESC) AS rank
        FROM teams t
        LEFT JOIN submissions s ON s.team_id = t.id AND s.score IS NOT NULL
        WHERE t.hackathon_id = ${hackathon.id}
        GROUP BY t.id
      ) ranked
      WHERE ranked.id = ${team.id}
    `)
    rank = ranked.rows[0]?.rank ?? null
  }

  const moduleResult = await db.execute<{ total: number; completed: number }>(sql`
    SELECT
      (SELECT COUNT(*) FROM skill_modules WHERE hackathon_id = ${hackathon.id}) AS total,
      (SELECT COUNT(*) FROM skill_progress WHERE user_id = ${userId} AND status = 'completed') AS completed
  `)
  const moduleStats = moduleResult.rows[0]

  return res.json({
    submissionCount: submissionStats?.count ?? 0,
    totalScore: submissionStats?.total_score ?? 0,
    rank,
    teamName: team?.name ?? null,
    completedModules: moduleStats?.completed ?? 0,
    totalModules: moduleStats?.total ?? 0,
  })
})
