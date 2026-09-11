import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeLocalStorage } from '@/lib/utils/storage'
import type { User } from './interface'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  onboardingCompleted: boolean
  activeProfileMode: 'merchant' | 'personal'
  planPromptDismissedForLogin: string | null
  setAuth: (user: User, token: string, onboardingCompleted?: boolean) => void
  setUser: (user: User) => void
  updateUser: (user: User) => void
  setAccessToken: (token: string) => void
  setOnboardingCompleted: (completed: boolean) => void
  dismissPlanPrompt: (lastLoginAt: string) => void
  setActiveProfileMode: (mode: 'merchant' | 'personal') => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      activeProfileMode: 'merchant',
      planPromptDismissedForLogin: null,
      setAuth: (user, token, onboardingCompleted = true) => {
        safeLocalStorage.setItem('token', token)
        set({
          user,
          token,
          isAuthenticated: true,
          onboardingCompleted,
          activeProfileMode: user.role === 'merchant' ? 'merchant' : 'personal',
        })
      },
      setUser: (user) => set({ user }),
      updateUser: (user) => set({ user }),
      setAccessToken: (token) => {
        safeLocalStorage.setItem('token', token)
        set({ token, isAuthenticated: true })
      },
      setOnboardingCompleted: (completed) =>
        set({ onboardingCompleted: completed }),
      dismissPlanPrompt: (lastLoginAt) =>
        set({ planPromptDismissedForLogin: lastLoginAt }),
      setActiveProfileMode: (activeProfileMode) => set({ activeProfileMode }),
      logout: () => {
        safeLocalStorage.removeItem('token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          onboardingCompleted: false,
          activeProfileMode: 'merchant',
          planPromptDismissedForLogin: null,
        })
      },
    }),

    {
      name: 'auth-storage',
    },
  ),
)

/**
 * True once the persisted auth state has been rehydrated from localStorage.
 * Auth guards must wait for this — running them before hydration sees a
 * logged-out store and redirects authenticated users to /login.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    )
    setHydrated(useAuthStore.persist.hasHydrated())
    return unsubscribe
  }, [])

  return hydrated
}
