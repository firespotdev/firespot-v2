'use client'

import { useId } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface GradientQRCodeProps {
  value: string
  size?: number
  /** Gradient stops, top-left → bottom-right. Defaults to the brand gradient. */
  fromColor?: string
  toColor?: string
  className?: string
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
}: GradientQRCodeProps) {
  const gradientId = useId()

  return (
    <div className={className}>
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
      <QRCodeSVG value={value} size={size} fgColor={`url(#${gradientId})`} />
    </div>
  )
}
