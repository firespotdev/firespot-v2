export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(key)
        : null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value)
        return true
      }
      return false
    } catch {
      return false
    }
  },
  removeItem(key: string): boolean {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
        return true
      }
      return false
    } catch {
      return false
    }
  },
}

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined'
        ? window.sessionStorage.getItem(key)
        : null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, value)
        return true
      }
      return false
    } catch {
      return false
    }
  },
  removeItem(key: string): boolean {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key)
        return true
      }
      return false
    } catch {
      return false
    }
  },
}
