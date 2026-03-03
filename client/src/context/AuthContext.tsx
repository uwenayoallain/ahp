import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clearTokens, readAccessToken, readRefreshToken, writeTokens } from '../lib/auth'
import { AuthContext, type AuthContextValue, type UserRole } from './auth-context'

function parseRole(token: string | null): UserRole | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const role = payload.role
    if (role === 'admin' || role === 'participant') return role
    return null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(readAccessToken())
  const [isAuthLoading, setIsAuthLoading] = useState(() => !readAccessToken() && Boolean(readRefreshToken()))

  useEffect(() => {
    if (!isAuthLoading) return

    let cancelled = false

    async function attemptRefresh() {
      const refreshToken = readRefreshToken()
      if (!refreshToken) {
        setIsAuthLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (response.ok) {
          const data = (await response.json()) as { accessToken: string; refreshToken: string }
          if (!cancelled) {
            writeTokens(data.accessToken, data.refreshToken)
            setAccessToken(data.accessToken)
          }
        } else {
          if (!cancelled) clearTokens()
        }
      } catch {
        if (!cancelled) clearTokens()
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    void attemptRefresh()
    return () => { cancelled = true }
  }, [isAuthLoading])

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      userRole: parseRole(accessToken),
      isAuthenticated: Boolean(accessToken),
      isAuthLoading,
      login: (newAccessToken, refreshToken) => {
        setAccessToken(newAccessToken)
        writeTokens(newAccessToken, refreshToken ?? null)
      },
      logout: () => {
        setAccessToken(null)
        clearTokens()
      },
    }),
    [accessToken, isAuthLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
