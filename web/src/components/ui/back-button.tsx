'use client'

import type { ButtonHTMLAttributes } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  label?: string
  iconSize?: number
  iconClassName?: string
}

export function BackButton({
  label = 'Back',
  iconSize = 22,
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
        'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center focus-visible:outline-none',
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
