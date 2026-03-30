import { createContext } from 'react'

export type UserRole = 'participant' | 'admin'

export type AuthContextValue = {
  userId: string | null
  userName: string | null
  userRole: UserRole | null
  userEmail: string | null
  userAvatar: string | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
