import type { NextFunction, Request, Response } from 'express'

type RateLimitEntry = {
  timestamps: number[]
}

type RateLimitOptions = {
  windowMs: number
  maxRequests: number
}

export function rateLimit(options: RateLimitOptions) {
  if (process.env.NODE_ENV === 'test') {
    return function noopRateLimit(_req: Request, _res: Response, next: NextFunction) {
      return next()
    }
  }

  const store = new Map<string, RateLimitEntry>()

  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, options.windowMs)

  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const now = Date.now()

    let entry = store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      store.set(key, entry)
    }

    entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs)

    if (entry.timestamps.length >= options.maxRequests) {
      const retryAfter = Math.ceil((entry.timestamps[0] + options.windowMs - now) / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Too many requests, try again later' })
    }

    entry.timestamps.push(now)
    return next()
  }
}
