import { useState, useEffect } from 'react'

export function usePreference(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(defaultValue)

  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      setValue(stored === 'true')
    }
  }, [key])

  const setPreference = (newValue: boolean) => {
    setValue(newValue)
    localStorage.setItem(key, String(newValue))
  }

  return [value, setPreference] as const
}
