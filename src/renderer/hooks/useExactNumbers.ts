import { createContext, useContext } from 'react'

export const ExactNumbersContext = createContext(false)

export function useExactNumbers(): boolean {
  return useContext(ExactNumbersContext)
}
