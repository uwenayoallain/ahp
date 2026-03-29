import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { loadConfig } from './lib/config'
import { flushSyncQueue } from './lib/sync'
import './styles/tokens.css'
import './styles/reset.css'
import './styles/global.css'
import './styles/markdown.css'

registerSW({ immediate: true })

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'AHP_TRIGGER_SYNC') {
      void flushSyncQueue()
    }
  })
}

async function bootstrap() {
  await loadConfig()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
