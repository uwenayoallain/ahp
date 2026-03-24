import { PGlite } from '@electric-sql/pglite'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import ws from 'ws'
import { ensureSchemaSql } from './bootstrap.js'
import * as schema from './schema.js'

neonConfig.webSocketConstructor = ws

// Use the Neon type as the canonical DB type. PGlite is cast to it for tests.
type Db = ReturnType<typeof drizzleNeon<typeof schema>>

let pool: Pool | null = null
let pglite: PGlite | null = null
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
      const dataDir = decodeURIComponent(url.slice('pglite://'.length)) || undefined
      pglite = dataDir ? new PGlite(dataDir) : new PGlite()
      dbInstance = drizzlePglite(pglite, { schema }) as unknown as Db
    } else {
      pool = new Pool({ connectionString: url })
      dbInstance = drizzleNeon({ client: pool, schema })
    }
  }
  return dbInstance
}

export async function resetDbForTests() {
  if (pglite) {
    await pglite.close()
    pglite = null
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
  getDb()

  if (pglite) {
    await ensureSchemaSql((sql) => pglite!.exec(sql))
  }
}
