import { useEffect, useState } from 'react'

export function useLocalStorageFlag(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    return stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem(key, String(value))
  }, [key, value])

  return [value, setValue] as const
}
