import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { ensureSeedData } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')

let dbInstance: Database.Database | null = null

function resolveDbPath() {
  if (process.env.AHP_DB_PATH) {
    return path.resolve(process.env.AHP_DB_PATH)
  }
  return path.resolve(serverRoot, 'ahp.sqlite')
}

function resolveSchemaPath() {
  return path.resolve(serverRoot, 'src', 'db', 'schema.sql')
}

function ensureSchema(db: Database.Database) {
  const schema = fs.readFileSync(resolveSchemaPath(), 'utf8')
  db.exec(schema)
}

export function getDb() {
  if (dbInstance === null) {
    dbInstance = new Database(resolveDbPath())
    dbInstance.pragma('journal_mode = WAL')
    ensureSchema(dbInstance)
    ensureSeedData(dbInstance)
  }

  return dbInstance
}

export function resetDbForTests() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
