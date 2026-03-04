import { useContext } from 'react'
import { NetworkContext } from '../context/network-context'

export function useNetwork() {
  return useContext(NetworkContext)
}
