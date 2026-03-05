import { clearTokens, readAccessToken, readRefreshToken, writeTokens } from './auth'

type ApiOptions = RequestInit & {
  fallbackData?: unknown
}

type ApiErrorPayload = {
  error?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

let refreshPromise: Promise<string | null> | null = null

function toUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(toUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return null
    }

    const data = (await response.json()) as {
      accessToken: string
      refreshToken: string
    }

    writeTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doFetch(path: string, options: ApiOptions, token: string | null): Promise<Response> {
  return fetch(toUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  let token = readAccessToken()
  let response = await doFetch(path, options, token)

  if (response.status === 401 && readRefreshToken()) {
    const newToken = await tryRefresh()
    if (newToken) {
      token = newToken
      response = await doFetch(path, options, token)
    }
  }

  if (!response.ok) {
    if (options.fallbackData !== undefined) {
      return options.fallbackData as T
    }

    let errorMessage = `Request failed (${response.status})`

    try {
      const payload = (await response.json()) as ApiErrorPayload
      if (payload.error) {
        errorMessage = payload.error
      }
    } catch {
      // Ignore parse failure and keep default error message.
    }

    throw new Error(errorMessage)
  }

  return (await response.json()) as T
}
