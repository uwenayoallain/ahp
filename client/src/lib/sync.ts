import { readAccessToken } from './auth'
import {
  enqueueSyncAction,
  getQueuedSyncActions,
  markQueueItemFailed,
  markQueueItemSynced,
  updateSubmissionStatus,
} from './db'

type SyncRegistration = ServiceWorkerRegistration & {
  sync: {
    register: (tag: string) => Promise<void>
  }
}

export async function queueSubmissionSync(localId: string, payload: unknown) {
  await enqueueSyncAction({
    action: 'submission',
    payload,
  })

  await updateSubmissionStatus(localId, 'queued')
}

export async function flushSyncQueue() {
  const queued = await getQueuedSyncActions()
  const accessToken = readAccessToken()
  const now = new Date().toISOString()
  let processed = 0

  for (const item of queued) {
    if (item.nextRetryAt && item.nextRetryAt > now) continue

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ action: item.action, payload: item.payload }),
      })

      if (item.id === undefined) continue

      if (response.ok) {
        await markQueueItemSynced(item.id)
        processed++
      } else {
        console.error(`[sync] Server rejected queue item ${item.id}: ${response.status}`)
        await markQueueItemFailed(item.id)
      }
    } catch (err) {
      console.error('[sync] Failed to process queue item', err)
      if (item.id !== undefined) {
        await markQueueItemFailed(item.id)
      }
    }
  }

  return { success: true, processed }
}

export async function requestBackgroundSync() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready

  if ('sync' in registration) {
    const syncRegistration = registration as unknown as SyncRegistration
    await syncRegistration.sync.register('ahp-sync')
  } else {
    await flushSyncQueue()
  }
}
