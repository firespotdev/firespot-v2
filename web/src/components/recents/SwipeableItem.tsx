'use client'

import React, { useState, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableItemProps {
  children: React.ReactNode
  onConfirm?: () => void
  onArchive?: () => void
  confirmText?: string
  archiveText?: string
  disabled?: boolean
  className?: string
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  onConfirm,
  onArchive,
  confirmText = 'Confirm',
  archiveText = 'Archive',
  disabled = false,
  className,
}) => {
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const startX = useRef(0)
  const currentX = useRef(0)
  const threshold = 60 // Threshold to trigger action
  const maxSwipe = 100 // Max distance the item can be swiped

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
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
    if (!isSwiping) return
    setIsSwiping(false)

    if (offsetX > threshold) {
      // Swiped right -> Confirm
      onConfirm?.()
    } else if (offsetX < -threshold) {
      // Swiped left -> Archive
      onArchive?.()
    }

    // Always reset
    setOffsetX(0)
  }

  return (
    <div className={cn('relative overflow-hidden select-none touch-pan-y', className)}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between">
        {/* Confirm Action (Left side, revealed when swiping right) */}
        <div
          className={cn(
            'h-full bg-[#24C166] flex items-center justify-start overflow-hidden shrink-0 transition-opacity duration-200',
            !isSwiping && 'transition-all duration-300',
            offsetX > 0 ? 'opacity-100' : 'opacity-0',
          )}
          style={{ width: Math.max(0, offsetX) }}
        >
          <div className="pl-5 flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <Check size={14} className="text-[#24C166]" strokeWidth={3} />
            </div>
            <span className="text-white text-[12px] font-bold">
              {confirmText}
            </span>
          </div>
        </div>

        {/* Archive Action (Right side, revealed when swiping left) */}
        <div
          className={cn(
            'h-full bg-[#6B7280] flex items-center justify-end overflow-hidden shrink-0 transition-opacity duration-200 ml-auto',
            !isSwiping && 'transition-all duration-300',
            offsetX < 0 ? 'opacity-100' : 'opacity-0',
          )}
          style={{ width: Math.max(0, -offsetX) }}
        >
          <div className="pr-5 flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-5 h-5 rounded-full bg-[#E5E7EB] flex items-center justify-center">
              <X
                size={13}
                className="text-[#6B7280]"
                strokeWidth={2.5}
              />
            </div>
            <span className="text-white text-[12px] font-bold">
              {archiveText}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content (The Item) */}
      <div
        className={cn(
          'relative bg-white ease-out',
          !isSwiping && 'transition-transform duration-300',
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
