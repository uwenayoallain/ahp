import type { ReactNode } from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { NetworkContext } from './network-context'

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus()
  return <NetworkContext.Provider value={{ isOnline }}>{children}</NetworkContext.Provider>
}
