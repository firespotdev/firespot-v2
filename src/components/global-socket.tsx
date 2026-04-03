'use client'

import { useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import { showNotificationToast } from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { Sale } from '@/services/sales/interface'
import { requestForToken, onForegroundMessage } from '@/lib/firebase'
import { useAuthStore } from '@/services/auth'
import { userApi } from '@/services/users/userApi'

export function GlobalSocket() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [soundEnabled] = usePreference('soundEnabled', true)
  const soundEnabledRef = useRef(soundEnabled)

  // Sync ref with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Register for push notifications on login
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const registerPush = async () => {
        const token = await requestForToken()
        if (token) {
          await userApi.registerFcmToken(token)
        }
      }
      registerPush()
    }
  }, [isAuthenticated, user?.id])

  // Foreground push message listener — persistent, fires for every message
  useEffect(() => {
    const unsubscribe = onForegroundMessage(async (payload) => {
      if (!payload?.notification) return
      // Use the SW registration to show a real OS-level notification
      // even when the tab is focused (new Notification() is unreliable in some browsers)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        registration.showNotification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/favicon.ico',
          data: payload.data,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] })
    })

    return () => unsubscribe?.()
  }, [queryClient])

  useEffect(() => {
    if (!socket) return

    const handleSalePending = (sale: Sale) => {
      // Play sound if enabled via ref to avoid dependency closures
      if (soundEnabledRef.current) {
        const audio = new Audio('/sound/notification.mp3')
        audio.play().catch((err) => {
          console.warn('Audio playback failed:', err)
        })
      }

      showNotificationToast({
        message: 'New pending sale',
        duration: 3000,
      })

      // Invalidate sales queries to refetch
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] })
    }

    socket.on('sale.pending', handleSalePending)

    return () => {
      socket.off('sale.pending', handleSalePending)
    }
  }, [socket, queryClient])

  return null
}
