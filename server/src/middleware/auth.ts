import type { NextFunction, Request, Response } from 'express'
import * as jose from 'jose'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { userProfiles } from '../db/schema.js'

type JwtPayload = {
  sub: string
  role: 'participant' | 'admin'
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload
  }
}

function resolveJwksUrl(): URL {
  const base = process.env.NEON_AUTH_URL
  if (!base && process.env.NODE_ENV === 'test') {
    return new URL('http://localhost/.well-known/jwks.json')
  }
  if (!base) {
    throw new Error('NEON_AUTH_URL environment variable is required')
  }
  return new URL(`${base}/.well-known/jwks.json`)
}

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(resolveJwksUrl())
  }
  return jwks
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // In test mode, allow bypassing JWT verification via headers.
  if (process.env.NODE_ENV === 'test') {
    const testUserId = req.headers['x-test-user-id']
    const testUserRole = req.headers['x-test-user-role']
    if (typeof testUserId === 'string') {
      req.user = {
        sub: testUserId,
        role: testUserRole === 'admin' ? 'admin' : 'participant',
      }
      return next()
    }
  }

  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const token = authorization.slice('Bearer '.length)

  try {
    const { payload } = await jose.jwtVerify(token, getJwks())

    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    const db = getDb()
    const [profile] = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, payload.sub))

    req.user = {
      sub: payload.sub,
      role: (profile?.role === 'admin' ? 'admin' : 'participant'),
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  return next()
}

export function resetAuthForTests() {
  jwks = null
}
