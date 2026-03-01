import type { Request } from 'express'

type PaginationParams = {
  page: number
  limit: number
  offset: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
