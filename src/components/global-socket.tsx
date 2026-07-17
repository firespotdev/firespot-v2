'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import {
  showNewPaymentToast,
  showReceiptUploadedToast,
} from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { Sale } from '@/services/sales/interface'
import { requestForToken, onForegroundMessage } from '@/lib/firebase'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { userApi } from '@/services/users/userApi'

function formatPaymentTime(timestamp?: string | Date): string {
  const date = timestamp ? new Date(timestamp) : new Date()
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const isToday = date.toDateString() === new Date().toDateString()
  const day = isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day} . ${time}`
}

export function GlobalSocket() {
  const { socket } = useSocket()
  const router = useRouter()
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

    // True when the merchant already has this sale's collect drawer open.
    const isViewingSale = (saleId?: string) =>
      Boolean(saleId) &&
      useDrawerStore
        .getState()
        .configs.some(
          (c) =>
            c.type === 'collect-payment' &&
            (c.props as any)?.sale?._id === saleId,
        )

    // Opens the collect drawer for a customer-initiated sale (its view adapts
    // to the sale state: confirm / receipt).
    const openCollectDrawer = (sale: Sale) => {
      const { openDrawer, closeAllDrawers } = useDrawerStore.getState()
      openDrawer({
        type: 'collect-payment',
        props: {
          sale,
          onRecordConfirm: () => {
            closeAllDrawers()
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['sales-stats'] })
          },
        },
      })
    }

    const invalidateSales = () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] })
    }

    const handleSalePending = (sale: Sale) => {
      // Merchant-initiated collect sales are handled in their own drawer.
      if (sale.isCollection) return
      // Don't interrupt if the merchant is already looking at this sale.
      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }

      if (soundEnabledRef.current) {
        const audio = new Audio('/sound/notification.mp3')
        audio.play().catch((err) => {
          console.warn('Audio playback failed:', err)
        })
      }

      showNewPaymentToast({
        time: formatPaymentTime((sale as any).createdAt),
        // Checkmark takes the merchant into the confirm flow (prefilled amount
        // + description, records onto this existing sale).
        onView: () => router.push(`/record-sale?confirm=${sale._id}`),
      })

      invalidateSales()
    }

    const handleReceiptUploaded = (sale: Sale) => {
      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }

      showReceiptUploadedToast({
        onView: () => openCollectDrawer(sale),
      })

      invalidateSales()
    }

    socket.on('sale.pending', handleSalePending)
    socket.on('receipt.uploaded', handleReceiptUploaded)

    return () => {
      socket.off('sale.pending', handleSalePending)
      socket.off('receipt.uploaded', handleReceiptUploaded)
    }
  }, [socket, queryClient, router])

  return null
}
