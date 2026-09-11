'use client'

import { useId } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface GradientQRCodeProps {
  value: string
  size?: number
  /** Gradient stops, top-left → bottom-right. Defaults to the brand gradient. */
  fromColor?: string
  toColor?: string
  className?: string
  centerImageUrl?: string
  centerImageAlt?: string
  centerImageSize?: number
  showFirespotBadge?: boolean
}

/**
 * QR code rendered with the firespot brand gradient as the module fill
 * (linear-gradient(134.65deg, #FB5012, #D72483)) instead of solid black.
 *
 * qrcode.react paints the modules with `fgColor`, which accepts an SVG paint
 * reference — so we point it at a `<linearGradient>` defined alongside it.
 * The id is unique per instance to avoid collisions when several render.
 */
export function GradientQRCode({
  value,
  size = 210,
  fromColor = '#FB5012',
  toColor = '#D72483',
  className,
  centerImageUrl,
  centerImageAlt = 'Merchant',
  centerImageSize = 40,
  showFirespotBadge = false,
}: GradientQRCodeProps) {
  const gradientId = useId()

  return (
    <div className={cn('relative', className)}>
      {/* Gradient definition consumed by the QR fill via url(#id) */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: 'absolute' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={fromColor} />
            <stop offset="1" stopColor={toColor} />
          </linearGradient>
        </defs>
      </svg>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        fgColor={`url(#${gradientId})`}
      />
      {centerImageUrl && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{
            width: centerImageSize,
            height: centerImageSize,
          }}
        >
          <div className="w-full h-full overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
            <Image
              src={centerImageUrl}
              alt={centerImageAlt}
              width={centerImageSize}
              height={centerImageSize}
              className="h-full w-full object-cover"
            />
          </div>
          {showFirespotBadge && (
            <div className="absolute bottom-0 right-0 border-[3px] border-white rounded-[8px] bg-white overflow-hidden shadow-xs">
              <Image
                src="/images/firespot_logo.png"
                alt="Firespot Logo"
                width={18}
                height={18}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
