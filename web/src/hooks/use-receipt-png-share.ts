'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { showNotificationToast } from '@/components/ui'
import {
  renderElementAsPNG,
  sharePNGBlob,
} from '@/lib/utils/pdf-download'

interface UseReceiptPNGShareOptions {
  receiptRef: RefObject<HTMLElement | null>
  cacheKey: string
  filename: string
  title?: string
  text?: string
  backgroundColor?: string
  scale?: number
}

function isShareCancellation(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useReceiptPNGShare({
  receiptRef,
  cacheKey,
  filename,
  title = 'Firespot Receipt',
  text,
  backgroundColor = '#FFFFFF',
  scale = 3,
}: UseReceiptPNGShareOptions) {
  const blobRef = useRef<Blob | null>(null)
  const generationRef = useRef<Promise<Blob> | null>(null)
  const preparedCacheKeyRef = useRef<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(true)
  const [isSharing, setIsSharing] = useState(false)
  const [readyCacheKey, setReadyCacheKey] = useState<string | null>(null)

  const prepareReceipt = useCallback(async () => {
    if (blobRef.current && preparedCacheKeyRef.current === cacheKey) {
      return blobRef.current
    }
    if (generationRef.current) return generationRef.current
    if (!receiptRef.current) {
      throw new Error('The receipt is not ready yet')
    }

    setIsPreparing(true)
    const generation = renderElementAsPNG(receiptRef.current, {
      scale,
      backgroundColor,
    })
    generationRef.current = generation

    try {
      const blob = await generation
      blobRef.current = blob
      preparedCacheKeyRef.current = cacheKey
      setReadyCacheKey(cacheKey)
      return blob
    } finally {
      generationRef.current = null
      setIsPreparing(false)
    }
  }, [backgroundColor, cacheKey, receiptRef, scale])

  useEffect(() => {
    blobRef.current = null
    generationRef.current = null
    preparedCacheKeyRef.current = null
    let active = true

    void prepareReceipt().catch(() => {
      if (active) setIsPreparing(false)
    })

    return () => {
      active = false
    }
  }, [cacheKey, prepareReceipt])

  const shareReceipt = useCallback(async () => {
    if (isSharing) return
    setIsSharing(true)

    try {
      const blob = blobRef.current || (await prepareReceipt())
      const result = await sharePNGBlob(blob, { filename, title, text })
      if (result === 'downloaded') {
        showNotificationToast({
          message:
            'Receipt image downloaded because file sharing is unavailable.',
          mode: 'success',
        })
      }
    } catch (error) {
      if (!isShareCancellation(error)) {
        showNotificationToast({
          message: 'Failed to share receipt. Please try again.',
          mode: 'error',
        })
      }
    } finally {
      setIsSharing(false)
    }
  }, [filename, isSharing, prepareReceipt, text, title])

  return {
    shareReceipt,
    isPreparingReceipt: isPreparing,
    isSharingReceipt: isSharing,
    isReceiptReady: readyCacheKey === cacheKey && !isPreparing,
  }
}
