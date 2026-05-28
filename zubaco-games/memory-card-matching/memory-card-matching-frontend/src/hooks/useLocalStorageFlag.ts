import { useEffect, useState } from 'react'

/**
 * Persists a boolean flag to localStorage, keeping React state in sync.
 *
 * @param {string} key - The localStorage key to read and write.
 * @param {boolean} defaultValue - Initial value when no stored value exists.
 *
 * @returns {readonly [boolean, Dispatch<SetStateAction<boolean>>]} State value and setter tuple.
 */
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
