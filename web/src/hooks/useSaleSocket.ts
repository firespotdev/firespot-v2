import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface SaleSocketHandlers {
  onConfirmed?: (sale: unknown) => void
  onCancelled?: (sale: unknown) => void
  onReceiptUploaded?: (sale: unknown) => void
  onPaymentDeclared?: (sale: unknown) => void
}

/**
 * Public (unauthenticated) socket for the customer pay page. Joins the
 * sale-specific room and surfaces confirmation events. The merchant-side
 * authed socket lives in useSocket — do not merge the two: this one must
 * work for logged-out customers.
 */
export const useSaleSocket = (
  saleId: string | undefined,
  handlers: SaleSocketHandlers,
) => {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!saleId) return

    const url =
      process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
      'http://localhost:3001'

    const socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
    })

    const joinRoom = () => socket.emit('join-sale-room', saleId)

    socket.on('connect', joinRoom)
    socket.on('sale.confirmed', (sale: unknown) =>
      handlersRef.current.onConfirmed?.(sale),
    )
    socket.on('sale.cancelled', (sale: unknown) =>
      handlersRef.current.onCancelled?.(sale),
    )
    socket.on('receipt.uploaded', (sale: unknown) =>
      handlersRef.current.onReceiptUploaded?.(sale),
    )
    socket.on('payment.declared', (sale: unknown) =>
      handlersRef.current.onPaymentDeclared?.(sale),
    )

    return () => {
      socket.disconnect()
    }
  }, [saleId])
}
