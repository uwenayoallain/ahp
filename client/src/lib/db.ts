import { openDB } from 'idb'

export type QueueStatus = 'draft' | 'queued' | 'synced'

export type SubmissionRecord = {
  id?: number
  localId: string
  teamName: string
  members: string
  projectTitle: string
  description: string
  category: string
  updatedAt: string
  version: number
  status: QueueStatus
}

export type SyncQueueItem = {
  id?: number
  action: 'submission' | 'skillProgress'
  payload: unknown
  queuedAt: string
  status: 'queued' | 'processing' | 'failed' | 'synced'
  retryCount: number
  nextRetryAt: string | null
}

type AHPDatabase = {
  submissions: {
    key: number
    value: SubmissionRecord
    indexes: { 'by-local-id': string; 'by-status': QueueStatus }
  }
  skillProgress: {
    key: string
    value: { userId: string; moduleId: string; progress: number; updatedAt: string }
    indexes: { 'by-user-id': string }
  }
  syncQueue: {
    key: number
    value: SyncQueueItem
    indexes: { 'by-status': SyncQueueItem['status'] }
  }
  mediaFiles: {
    key: string
    value: { id: string; fileName: string; mimeType: string; blob: Blob; submissionLocalId: string }
    indexes: { 'by-submission-local-id': string }
  }
}

const DB_NAME = 'ahp-db'
const DB_VERSION = 2

const dbPromise = openDB<AHPDatabase>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const submissions = db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true })
      submissions.createIndex('by-local-id', 'localId', { unique: true })
      submissions.createIndex('by-status', 'status', { unique: false })

      const skillProgress = db.createObjectStore('skillProgress', { keyPath: 'moduleId' })
      skillProgress.createIndex('by-user-id', 'userId', { unique: false })

      const syncQueue = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
      syncQueue.createIndex('by-status', 'status', { unique: false })

      const mediaFiles = db.createObjectStore('mediaFiles', { keyPath: 'id' })
      mediaFiles.createIndex('by-submission-local-id', 'submissionLocalId', { unique: false })
    }

    if (oldVersion < 2) {
      // v2: syncQueue gains retryCount + nextRetryAt columns
      // Existing records get defaults via application code (missing fields default to 0 / null)
    }
  },
})

export async function addSubmission(submission: SubmissionRecord) {
  const db = await dbPromise
  return db.add('submissions', submission)
}

export async function updateSubmissionStatus(localId: string, status: QueueStatus) {
  const db = await dbPromise
  const tx = db.transaction('submissions', 'readwrite')
  const index = tx.store.index('by-local-id')
  const existing = await index.get(localId)
  if (!existing) {
    await tx.done
    return false
  }
  existing.status = status
  existing.updatedAt = new Date().toISOString()
  existing.version += 1
  await tx.store.put(existing)
  await tx.done
  return true
}

export async function enqueueSyncAction(item: Omit<SyncQueueItem, 'id' | 'queuedAt' | 'status' | 'retryCount' | 'nextRetryAt'>) {
  const db = await dbPromise
  return db.add('syncQueue', {
    ...item,
    queuedAt: new Date().toISOString(),
    status: 'queued',
    retryCount: 0,
    nextRetryAt: null,
  })
}

export async function getQueuedSyncActions() {
  const db = await dbPromise
  return db.getAllFromIndex('syncQueue', 'by-status', 'queued')
}

export async function markQueueItemSynced(id: number) {
  const db = await dbPromise
  await db.delete('syncQueue', id)
  return true
}

const MAX_RETRIES = 5

export async function markQueueItemFailed(id: number) {
  const db = await dbPromise
  const item = await db.get('syncQueue', id)
  if (!item) return false
  item.retryCount = (item.retryCount ?? 0) + 1
  if (item.retryCount >= MAX_RETRIES) {
    item.status = 'failed'
    item.nextRetryAt = null
  } else {
    item.status = 'queued'
    const delayMs = Math.min(1000 * 2 ** item.retryCount, 60_000)
    item.nextRetryAt = new Date(Date.now() + delayMs).toISOString()
  }
  await db.put('syncQueue', item)
  return true
}
