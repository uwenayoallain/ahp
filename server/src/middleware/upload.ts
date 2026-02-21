import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')
const uploadDir = path.resolve(serverRoot, 'uploads')

if (fs.existsSync(uploadDir) === false) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'text/plain',
  'text/csv',
  'application/json',
  'application/octet-stream',
])

const MAX_FILE_SIZE = 25 * 1024 * 1024

export const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter(_req, file, callback) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true)
    } else {
      callback(new Error(`File type ${file.mimetype} is not allowed`))
    }
  },
})
