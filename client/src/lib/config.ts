type AppConfig = {
  neonAuthUrl: string
}

let config: AppConfig | null = null

export async function loadConfig(): Promise<void> {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`Failed to load config (${response.status})`)
  }
  config = (await response.json()) as AppConfig
}

export function getConfig(): AppConfig {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() before using config.')
  }
  return config
}
