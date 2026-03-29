import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema.js'

neonConfig.webSocketConstructor = ws

type Db = ReturnType<typeof drizzleNeon<typeof schema>>

let pool: Pool | null = null
let pgliteInstance: unknown = null
let dbInstance: Db | null = null

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return url
}

export function getDb(): Db {
  if (!dbInstance) {
    const url = resolveDatabaseUrl()

    if (url.startsWith('pglite://')) {
      throw new Error('PGlite is only available in test mode. Use initializePglite() first.')
    }

    pool = new Pool({ connectionString: url })
    dbInstance = drizzleNeon({ client: pool, schema })
  }
  return dbInstance
}

export async function resetDbForTests() {
  if (pgliteInstance) {
    await (pgliteInstance as { close: () => Promise<void> }).close()
    pgliteInstance = null
  }

  if (pool) {
    try {
      await pool.end()
    } catch {
      // Ignore repeated close attempts in tests.
    }
    pool = null
  }
  dbInstance = null
}

export async function initializeDbForTests() {
  const url = resolveDatabaseUrl()

  if (url.startsWith('pglite://')) {
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite')
    const { ensureSchemaSql } = await import('./bootstrap.js')

    const dataDir = decodeURIComponent(url.slice('pglite://'.length)) || undefined
    const pg = dataDir ? new PGlite(dataDir) : new PGlite()
    pgliteInstance = pg
    dbInstance = drizzlePglite(pg, { schema }) as unknown as Db

    await ensureSchemaSql((sql) => pg.exec(sql))
  } else {
    getDb()
  }
}
