import { createContext } from 'react'

export type UserRole = 'participant' | 'admin'

export type AuthContextValue = {
  accessToken: string | null
  userRole: UserRole | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (accessToken: string, refreshToken?: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
