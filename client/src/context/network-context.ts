import { createContext } from 'react'

export type NetworkContextValue = {
  isOnline: boolean
}

export const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
})
