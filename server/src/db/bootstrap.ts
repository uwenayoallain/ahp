import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')

function resolveSchemaPath() {
  return path.resolve(serverRoot, 'src', 'db', 'schema.sql')
}

export async function ensureSchemaSql(exec: (sql: string) => Promise<unknown>) {
  const schema = fs.readFileSync(resolveSchemaPath(), 'utf8')
  await exec(schema)
}
