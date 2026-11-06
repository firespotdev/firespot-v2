import { useSyncExternalStore } from 'react'
import { safeLocalStorage } from '@/lib/utils/storage'

const PREFERENCE_CHANGE_EVENT = 'firespot:preference-change'

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(PREFERENCE_CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, listener)
  }
}

export function usePreference(key: string, defaultValue: boolean) {
  const value = useSyncExternalStore(subscribe, () => {
    const stored = safeLocalStorage.getItem(key)
    return stored === null ? defaultValue : stored === 'true'
  }, () => defaultValue)

  const setPreference = (newValue: boolean) => {
    if (safeLocalStorage.setItem(key, String(newValue))) {
      window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT))
    }
  }

  return [value, setPreference] as const
}
