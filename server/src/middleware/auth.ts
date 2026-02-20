import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/connection.js'

function resolveSecret(envKey: string, fallback: string): string {
  const value = process.env[envKey]
  if (value) return value
  if (process.env.NODE_ENV === 'test') return fallback
  throw new Error(`${envKey} environment variable is required`)
}

const ACCESS_SECRET = resolveSecret('JWT_SECRET', 'test-access-secret')
const REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET', 'test-refresh-secret')

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

type JwtPayload = {
  sub: number
  role: 'participant' | 'admin'
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload
  }
}

function toJwtPayload(value: unknown): JwtPayload | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const payload = value as Record<string, unknown>
  const sub = payload.sub
  const role = payload.role

  if (typeof sub !== 'number') {
    return null
  }

  if (role !== 'participant' && role !== 'admin') {
    return null
  }

  return { sub, role }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const token = authorization.slice('Bearer '.length)

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET)
    const payload = toJwtPayload(decoded)

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    req.user = payload
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

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function signRefreshToken(payload: JwtPayload) {
  const jti = crypto.randomUUID()
  return jwt.sign({ ...payload, jti }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

export function storeRefreshToken(userId: number, token: string) {
  const db = getDb()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
  ).run(userId, tokenHash, expiresAt)
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET)
    return toJwtPayload(decoded)
  } catch {
    return null
  }
}

export function isRefreshTokenRevoked(token: string): boolean {
  const db = getDb()
  const tokenHash = hashToken(token)
  const row = db.prepare(
    'SELECT revoked FROM refresh_tokens WHERE token_hash = ?',
  ).get(tokenHash) as { revoked: number } | undefined

  if (!row) return true
  return row.revoked === 1
}

export function revokeRefreshToken(token: string) {
  const db = getDb()
  const tokenHash = hashToken(token)
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash)
}

export function revokeAllUserTokens(userId: number) {
  const db = getDb()
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId)
}
