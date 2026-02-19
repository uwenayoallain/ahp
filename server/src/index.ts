import cors from 'cors'
import express from 'express'
import { getDb } from './db/connection.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { challengesRouter } from './routes/challenges.js'
import { hackathonsRouter } from './routes/hackathons.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { rulesRouter } from './routes/rules.js'
import { scheduleRouter } from './routes/schedule.js'
import { skillModulesRouter } from './routes/skillModules.js'
import { statsRouter } from './routes/stats.js'
import { submissionsRouter } from './routes/submissions.js'
import { syncRouter } from './routes/sync.js'
import { teamsRouter } from './routes/teams.js'

export function createApp() {
  const app = express()

  getDb()

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173']

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/sync', syncRouter)
  app.use('/api/submissions', submissionsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/hackathons', hackathonsRouter)
  app.use('/api/challenges', challengesRouter)
  app.use('/api/schedule', scheduleRouter)
  app.use('/api/rules', rulesRouter)
  app.use('/api/skill-modules', skillModulesRouter)
  app.use('/api/leaderboard', leaderboardRouter)
  app.use('/api/teams', teamsRouter)
  app.use('/api/me/stats', statsRouter)

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

export function startServer(port = Number(process.env.PORT ?? 3001)) {
  const app = createApp()
  return app.listen(port, () => {
    console.log(`AHP server running on http://localhost:${port}`)
  })
}

if (process.env.NODE_ENV !== 'test') {
  startServer()
}
