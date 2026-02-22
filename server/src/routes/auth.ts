import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../db/connection.js'
import { isRefreshTokenRevoked, revokeRefreshToken, signAccessToken, signRefreshToken, storeRefreshToken, verifyRefreshToken } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

export const authRouter = Router()

const authLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 })

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

authRouter.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string
    email?: string
    password?: string
  }

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
    | { id: number }
    | undefined

  if (existing) {
    return res.status(409).json({ error: 'Email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash)

  const userId = Number(info.lastInsertRowid)
  const accessToken = signAccessToken({ sub: userId, role: 'participant' })
  const refreshToken = signRefreshToken({ sub: userId, role: 'participant' })
  storeRefreshToken(userId, refreshToken)

  return res.status(201).json({
    user: { id: userId, name, email, role: 'participant' },
    accessToken,
    refreshToken,
  })
})

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const db = getDb()
  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email) as
    | { id: number; name: string; email: string; role: 'participant' | 'admin'; password_hash: string }
    | undefined

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role })
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role })
  storeRefreshToken(user.id, refreshToken)

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  })
})

authRouter.post('/refresh', authLimiter, (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' })
  }

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }

  if (isRefreshTokenRevoked(refreshToken)) {
    return res.status(401).json({ error: 'Refresh token has been revoked' })
  }

  revokeRefreshToken(refreshToken)

  const newAccessToken = signAccessToken({ sub: payload.sub, role: payload.role })
  const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role })
  storeRefreshToken(payload.sub, newRefreshToken)

  return res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  })
})

authRouter.post('/logout', (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }

  if (refreshToken) {
    revokeRefreshToken(refreshToken)
  }

  return res.json({ status: 'ok' })
})
