'use client'

import type { ButtonHTMLAttributes } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string
  iconSize?: number
  iconClassName?: string
}

export function BackButton({
  label = 'Back',
  iconSize = 24,
  iconClassName,
  className,
  type = 'button',
  ...props
}: BackButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      <ArrowLeft
        size={iconSize}
        strokeWidth={2}
        className={cn('text-black', iconClassName)}
      />
    </button>
  )
}
