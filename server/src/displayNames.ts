import { sql } from 'drizzle-orm'
import { neonAuthUsersSync, userProfiles } from './db/schema.js'

export function resolvedDisplayNameSql() {
  return sql<string>`coalesce(nullif(${userProfiles.displayName}, ''), nullif(${neonAuthUsersSync.name}, ''), '')`
}

export function resolveDisplayName(profileDisplayName: string | null | undefined, authDisplayName: string | null | undefined) {
  if (profileDisplayName !== undefined && profileDisplayName !== null && profileDisplayName !== '') {
    return profileDisplayName
  }

  return authDisplayName ?? ''
}
