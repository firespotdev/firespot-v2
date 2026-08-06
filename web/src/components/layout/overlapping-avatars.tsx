'use client'

import { MerchantAvatar } from '@/components/layout/MerchantAvatar'

interface OverlappingAvatarsProps {
  primaryPhotoUrl?: string
  secondaryPhotoUrl?: string
  bankName?: string
  size?: number
  className?: string
}

export function OverlappingAvatars({
  primaryPhotoUrl,
  secondaryPhotoUrl,
  bankName,
  size = 36,
  className,
}: OverlappingAvatarsProps) {
  const secondaryOffset = Math.max(24, Math.floor(size * 0.45))
  const containerWidth = size + secondaryOffset

  return (
    <div
      className={`relative flex items-center shrink-0 ${className || ''}`}
      style={{ width: containerWidth, height: size }}
    >
      <MerchantAvatar
        profilePhotoUrl={primaryPhotoUrl}
        size={size}
        className="absolute left-0 z-10"
      />
      <MerchantAvatar
        profilePhotoUrl={secondaryPhotoUrl}
        bankName={bankName}
        size={size}
        className="absolute z-20 border-[2.5px] border-white rounded-full"
        style={{ left: secondaryOffset }}
      />
    </div>
  )
}
