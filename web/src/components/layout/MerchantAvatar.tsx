'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getBankLogo } from '@/lib/utils/bank-registry'
import { cn } from '@/lib/utils'

interface MerchantAvatarProps {
  bankName?: string
  profilePhotoUrl?: string
  alt?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function MerchantAvatar({
  bankName,
  profilePhotoUrl,
  alt = 'Profile photo',
  size = 36,
  className,
  style,
}: MerchantAvatarProps) {
  const avatarSize = size
  const bankLogoSize = Math.max(16, Math.floor(size * 0.45))
  const overlayOffset = Math.max(3, Math.floor(size * 0.08))
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>()
  const photoUrl =
    profilePhotoUrl && profilePhotoUrl !== failedPhotoUrl
      ? profilePhotoUrl
      : '/images/default_avatar.png'

  return (
    <div className={cn('relative shrink-0', className)} style={style}>
      <div 
        className="rounded-full flex items-center justify-center overflow-hidden transition-transform bg-gray-100"
        style={{ width: avatarSize, height: avatarSize }}
      >
        <Image
          src={photoUrl}
          alt={alt}
          width={avatarSize}
          height={avatarSize}
          className="h-full w-full object-cover"
          onError={() => {
            if (profilePhotoUrl) setFailedPhotoUrl(profilePhotoUrl)
          }}
        />
      </div>
      {bankName && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-[4.4px] border border-white bg-white shadow-sm flex items-center justify-center overflow-hidden"
          style={{ 
            width: bankLogoSize, 
            height: bankLogoSize,
            bottom: overlayOffset 
          }}
        >
          <Image
            src={getBankLogo(bankName)}
            alt={bankName}
            className="object-contain"
            width={bankLogoSize}
            height={bankLogoSize}
          />
        </div>
      )}
    </div>
  )
}
