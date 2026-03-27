'use client'

import React, { useState, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableItemProps {
  children: React.ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [actionTriggered, setActionTriggered] = useState<
    'confirm' | 'cancel' | null
  >(null)

  const startX = useRef(0)
  const currentX = useRef(0)
  const threshold = 80 // Threshold to show the action button fully
  const maxSwipe = 100 // Max distance the item can be swiped

  const handleTouchStart = (e: React.TouchEvent) => {
    if (actionTriggered) return
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || actionTriggered) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Dampen the swipe after threshold
    let newOffset = diff
    if (Math.abs(diff) > maxSwipe) {
      newOffset =
        diff > 0
          ? maxSwipe + (diff - maxSwipe) * 0.2
          : -maxSwipe + (diff + maxSwipe) * 0.2
    }

    setOffsetX(newOffset)
  }

  const handleTouchEnd = () => {
    if (!isSwiping || actionTriggered) return
    setIsSwiping(false)

    if (offsetX > threshold) {
      // Swiped right -> Confirm
      setActionTriggered('confirm')
      setOffsetX(window.innerWidth) // Slide off screen
      setTimeout(() => onConfirm?.(), 300)
    } else if (offsetX < -threshold) {
      // Swiped left -> Cancel
      setActionTriggered('cancel')
      setOffsetX(-window.innerWidth) // Slide off screen
      setTimeout(() => onCancel?.(), 300)
    } else {
      // Reset
      setOffsetX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[12px] select-none touch-pan-y">
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between">
        {/* Confirm Action (Left side, revealed when swiping right) */}
        <div
          className={cn(
            'h-full bg-[#24C166] flex flex-col items-center justify-center transition-all duration-200 overflow-hidden',
            offsetX > 0 ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            width: Math.max(0, offsetX),
          }}
        >
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
              <Check size={13} className="text-[#24C166]" strokeWidth={3} />
            </div>
            <span className="text-white text-[12px] font-bold">
              {confirmText}
            </span>
          </div>
        </div>

        {/* Cancel Action (Right side, revealed when swiping left) */}
        <div
          className={cn(
            'h-full bg-[#6B7280] flex flex-col items-center justify-center transition-all duration-200 overflow-hidden ml-auto',
            offsetX < 0 ? 'opacity-100' : 'opacity-0',
          )}
          style={{ width: Math.max(0, -offsetX) }}
        >
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-4 h-4 rounded-full bg-[#E5E7EB] flex items-center justify-center">
              <X size={13} className="text-[#6B7280]" strokeWidth={3} />
            </div>
            <span className="text-white text-[12px] font-bold">
              {cancelText}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content (The Item) */}
      <div
        className={cn(
          'relative bg-white transition-transform duration-200 ease-out',
          !isSwiping && 'duration-300',
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
