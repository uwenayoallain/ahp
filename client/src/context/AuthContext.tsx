import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import { authClient } from '../lib/neon-auth'
import { AuthContext, type AuthContextValue, type UserRole } from './auth-context'

type MeResponse = {
  userId: string
  displayName: string
  role: UserRole
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const me = await apiRequest<MeResponse>('/api/auth/me')
      setUserId(me.userId)
      setUserName(me.displayName)
      setUserRole(me.role)
    } catch {
      setUserId(null)
      setUserName(null)
      setUserRole(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const { data } = await authClient.getSession()
        if (cancelled) return

        if (data?.session) {
          await fetchProfile()
        }
      } catch {
        // No session
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    void checkSession()
    return () => { cancelled = true }
  }, [fetchProfile])

  const login = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  const logout = useCallback(async () => {
    await authClient.signOut()
    setUserId(null)
    setUserName(null)
    setUserRole(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      userId,
      userName,
      userRole,
      isAuthenticated: userId !== null,
      isAuthLoading,
      login,
      logout,
    }),
    [userId, userName, userRole, isAuthLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
