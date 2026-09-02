'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import {
  showNewPaymentToast,
  showReceiptUploadedToast,
  showNotificationToast,
} from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { Sale } from '@/services/sales/interface'
import { requestForToken, onForegroundMessage } from '@/lib/firebase'
import { useAuthReady, useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { userApi } from '@/services/users/userApi'
import { getSaleCustomerPhotoUrl } from '@/lib/utils/sales'
import { useArchiveSale, useConfirmSale } from '@/services/sales/hooks'

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
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const authReady = useAuthReady()
  const [soundEnabled] = usePreference('soundEnabled', true)
  const soundEnabledRef = useRef(soundEnabled)
  const confirmedSaleIdsRef = useRef(new Set<string>())
  const paystackConfirmationMutedUntilRef = useRef(0)
  const { mutate: confirmSale } = useConfirmSale()
  const { mutate: archiveSale } = useArchiveSale()

  const confirmPendingSale = useCallback(
    (saleId: string) =>
      new Promise<void>((resolve, reject) => {
        confirmSale(saleId, {
          onSuccess: () => resolve(),
          onError: (error: unknown) => {
            showNotificationToast({
              message:
                (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ||
                'Failed to confirm payment. Please try again.',
              mode: 'error',
            })
            reject(error)
          },
        })
      }),
    [confirmSale],
  )

  const archivePendingSale = useCallback(
    (saleId: string) =>
      new Promise<void>((resolve, reject) => {
        archiveSale(saleId, {
          onSuccess: () => resolve(),
          onError: (error: unknown) => {
            showNotificationToast({
              message:
                (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ||
                'Failed to archive payment. Please try again.',
              mode: 'error',
            })
            reject(error)
          },
        })
      }),
    [archiveSale],
  )

  // Sync ref with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Register for push notifications on login
  useEffect(() => {
    if (authReady && isAuthenticated && typeof window !== 'undefined') {
      const registerPush = async () => {
        const token = await requestForToken()
        if (token) {
          await userApi.registerFcmToken(token)
        }
      }
      registerPush()
    }
  }, [authReady, isAuthenticated, user?.id])

  // Foreground push message listener — persistent, fires for every message
  useEffect(() => {
    const unsubscribe = onForegroundMessage(async (payload) => {
      if (!payload?.notification) return
      if (payload.data?.type === 'sale.pending') {
        // Foreground pending sales use the same rich eight-second X/checkmark
        // prompt as the socket path. A shared toast id prevents the push and
        // socket deliveries from placing duplicate notifications on screen.
        if (user?.role === 'merchant') {
          const saleId = payload.data?.saleId
          if (saleId) {
            showNewPaymentToast({
              time: formatPaymentTime(),
              toastId: `pending-sale-${saleId}`,
              onConfirm: () => confirmPendingSale(saleId),
              onArchive: () => archivePendingSale(saleId),
            })
          }
          queryClient.invalidateQueries({ queryKey: ['sales'] })
          queryClient.invalidateQueries({ queryKey: ['sales-stats'] })
        }
        return
      }
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
  }, [
    archivePendingSale,
    confirmPendingSale,
    queryClient,
    user?.role,
  ])

  useEffect(() => {
    if (!socket || user?.role !== 'merchant') return

    // True when the merchant already has this sale's collect drawer open.
    const isViewingSale = (saleId?: string) =>
      Boolean(saleId) &&
      useDrawerStore
        .getState()
        .configs.some(
          (c) =>
            c.type === 'collect-payment' &&
            (c.props as { sale?: { _id?: string } } | undefined)?.sale?._id ===
              saleId,
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

    const syncSale = (sale: Sale) => {
      if (!sale._id) return
      queryClient.setQueryData(['sale', String(sale._id)], sale)
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
        time: formatPaymentTime(sale.createdAt),
        profilePhotoUrl: getSaleCustomerPhotoUrl(sale),
        toastId: sale._id ? `pending-sale-${sale._id}` : undefined,
        onConfirm: () => confirmPendingSale(sale._id),
        onArchive: () => archivePendingSale(sale._id),
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

    const handlePaymentDeclared = (sale: Sale) => {
      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }
      showNewPaymentToast({
        message: 'Customer says they have paid',
        time: formatPaymentTime(sale.customerMarkedPaidAt || sale.updatedAt),
        profilePhotoUrl: getSaleCustomerPhotoUrl(sale),
        toastId: sale._id ? `pending-sale-${sale._id}` : undefined,
        onConfirm: () => confirmPendingSale(sale._id),
        onArchive: () => archivePendingSale(sale._id),
      })
      invalidateSales()
    }

    const handleSaleCancelled = (sale: Sale) => {
      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }
      if (sale.cancelledBy === 'customer') {
        showNotificationToast({
          message: 'Customer cancelled this payment',
          duration: 3000,
        })
      }
      invalidateSales()
    }

    const handlePaymentProcessing = (sale: Sale) => {
      syncSale(sale)
      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }
      showNotificationToast({
        message: 'A customer is completing a Paystack payment',
        duration: 3000,
      })
      invalidateSales()
    }

    const handleSaleConfirmed = (sale: Sale) => {
      syncSale(sale)
      const saleId = String(sale._id || '')
      if (saleId && confirmedSaleIdsRef.current.has(saleId)) {
        invalidateSales()
        return
      }
      if (saleId) confirmedSaleIdsRef.current.add(saleId)

      if (Date.now() < paystackConfirmationMutedUntilRef.current) {
        invalidateSales()
        return
      }

      if (isViewingSale(sale._id)) {
        invalidateSales()
        return
      }
      if (sale.paymentRail === 'paystack') {
        showNotificationToast({
          message: 'Paystack payment confirmed and recorded',
          mode: 'success',
          duration: 3500,
          // One active confirmation toast, even if the same Paystack result is
          // delivered through differently shaped sale events.
          toastId: 'paystack-payment-confirmed',
          onDismiss: () => {
            // A duplicate confirmation event must not immediately recreate a
            // notification the merchant deliberately closed.
            paystackConfirmationMutedUntilRef.current = Date.now() + 10_000
          },
        })
      }
      invalidateSales()
    }

    socket.on('sale.pending', handleSalePending)
    socket.on('receipt.uploaded', handleReceiptUploaded)
    socket.on('payment.declared', handlePaymentDeclared)
    socket.on('sale.cancelled', handleSaleCancelled)
    socket.on('payment.processing', handlePaymentProcessing)
    socket.on('sale.confirmed', handleSaleConfirmed)

    return () => {
      socket.off('sale.pending', handleSalePending)
      socket.off('receipt.uploaded', handleReceiptUploaded)
      socket.off('payment.declared', handlePaymentDeclared)
      socket.off('sale.cancelled', handleSaleCancelled)
      socket.off('payment.processing', handlePaymentProcessing)
      socket.off('sale.confirmed', handleSaleConfirmed)
    }
  }, [
    archivePendingSale,
    confirmPendingSale,
    socket,
    queryClient,
    user?.role,
  ])

  return null
}
