import { getAccessToken } from './auth'

type ApiOptions = RequestInit & {
  fallbackData?: unknown
}

type ApiErrorPayload = {
  error?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function toUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${API_BASE_URL}${path}`
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
  const token = await getAccessToken()
  const response = await doFetch(path, options, token)

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
