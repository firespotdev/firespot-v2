import { useState, useEffect } from 'react'
import { safeLocalStorage } from '@/lib/utils/storage'

export function usePreference(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(defaultValue)

  useEffect(() => {
    const stored = safeLocalStorage.getItem(key)
    if (stored !== null) {
      setValue(stored === 'true')
    }
  }, [key])

  const setPreference = (newValue: boolean) => {
    setValue(newValue)
    safeLocalStorage.setItem(key, String(newValue))
  }

  return [value, setPreference] as const
}

