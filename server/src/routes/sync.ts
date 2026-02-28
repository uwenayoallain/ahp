import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import { nanoid } from 'nanoid'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { getSyncStatus, processSync } from '../services/sync.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')

export const syncRouter = Router()

syncRouter.use(requireAuth)

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

syncRouter.post('/', (req, res) => {
  const userId = req.user?.sub
  if (userId === undefined) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { action, payload } = req.body ?? {}

  if (typeof action !== 'string' || action.length === 0) {
    return res.status(400).json({ error: 'action is required' })
  }

  if (action === 'submission') {
    if (typeof payload !== 'object' || payload === null) {
      return res.status(400).json({ error: 'payload is required for submission action' })
    }
    const p = payload as Record<string, unknown>
    if (typeof p.localId !== 'string' || p.localId.length === 0) {
      return res.status(400).json({ error: 'payload.localId is required' })
    }
    if (typeof p.projectTitle !== 'string' || p.projectTitle.length === 0) {
      return res.status(400).json({ error: 'payload.projectTitle is required' })
    }
    if (typeof p.category !== 'string' || p.category.length === 0) {
      return res.status(400).json({ error: 'payload.category is required' })
    }
    if (typeof p.version !== 'number' || !Number.isInteger(p.version) || p.version < 1) {
      return res.status(400).json({ error: 'payload.version must be a positive integer' })
    }
  }

  const result = processSync(userId, { action: action as 'submission' | 'skillProgress', payload })
  if (result.status === 'conflict') {
    return res.status(409).json(result)
  }

  return res.json(result)
})

syncRouter.get('/status', (req, res) => {
  const userId = req.user?.sub
  if (userId === undefined) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return res.json(getSyncStatus(userId))
})

syncRouter.post('/media', upload.single('chunk'), (req, res) => {
  const chunkIndex = Number(req.header('X-Chunk-Index') ?? '0')
  const totalChunks = Number(req.header('X-Total-Chunks') ?? '1')
  const uploadId = req.body.uploadId ?? nanoid()

  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return res.status(400).json({ error: 'X-Chunk-Index must be a non-negative integer' })
  }

  if (!Number.isInteger(totalChunks) || totalChunks < 1) {
    return res.status(400).json({ error: 'X-Total-Chunks must be a positive integer' })
  }

  if (chunkIndex >= totalChunks) {
    return res.status(400).json({ error: 'X-Chunk-Index must be less than X-Total-Chunks' })
  }

  if (!SAFE_ID_PATTERN.test(uploadId)) {
    return res.status(400).json({ error: 'Invalid uploadId' })
  }

  if (req.file === undefined) {
    return res.status(400).json({ error: 'chunk file is required' })
  }

  const uploadsRoot = path.resolve(serverRoot, 'uploads')
  const tempDir = path.resolve(uploadsRoot, uploadId)

  if (fs.existsSync(tempDir) === false) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const chunkPath = path.join(tempDir, `${chunkIndex}.part`)
  fs.renameSync(req.file.path, chunkPath)

  if (chunkIndex < totalChunks - 1) {
    return res.json({ status: 'chunk-received', chunkIndex, uploadId })
  }

  const outputPath = path.resolve(uploadsRoot, `${uploadId}.bin`)

  for (let index = 0; index < totalChunks; index += 1) {
    const partPath = path.join(tempDir, `${index}.part`)
    const data = fs.readFileSync(partPath)
    fs.appendFileSync(outputPath, data)
    fs.unlinkSync(partPath)
  }

  fs.rmdirSync(tempDir)
  return res.json({ status: 'assembled', uploadId })
})
