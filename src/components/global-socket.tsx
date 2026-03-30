'use client'

import { useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import { showNotificationToast } from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { Sale } from '@/services/sales/interface'

export function GlobalSocket() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const [soundEnabled] = usePreference('soundEnabled', true)
  const soundEnabledRef = useRef(soundEnabled)

  // Sync ref with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

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
