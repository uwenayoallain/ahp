/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

type SyncEvent = Event & {
  tag: string
  waitUntil: (promise: Promise<unknown>) => void
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'ahp-pages',
  }),
)

registerRoute(
  ({ url }) => url.pathname.includes('/api/schedule'),
  new StaleWhileRevalidate({ cacheName: 'ahp-schedule' }),
)

registerRoute(
  ({ url }) => url.pathname.includes('/api/rules'),
  new StaleWhileRevalidate({ cacheName: 'ahp-rules' }),
)

const navigationHandler = new NavigationRoute(
  async ({ request }) => {
    try {
      return await fetch(request)
    } catch {
      const cache = await caches.open('ahp-pages')
      const cached = await cache.match('/index.html')
      return cached ?? Response.error()
    }
  },
  {
    denylist: [/^\/api\//],
  },
)

registerRoute(navigationHandler)

async function notifyClients() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  clients.forEach((client) => client.postMessage({ type: 'AHP_TRIGGER_SYNC' }))
}

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag === 'ahp-sync') {
    syncEvent.waitUntil(notifyClients())
  }
})
