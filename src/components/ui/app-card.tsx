import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered'
  rounded?: '12' | '16' | '24' | 'xl' | '2xl'
  divided?: boolean
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg'
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  (
    {
      className,
      variant = 'default',
      rounded = '12',
      divided = false,
      padding = 'none',
      children,
      ...props
    },
    ref,
  ) => {
    const roundedStyles = {
      '12': 'rounded-[12px]',
      '16': 'rounded-[16px]',
      '24': 'rounded-[24px]',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
    }[rounded]

    const paddingStyles = {
      none: '',
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }[padding]

    const variantStyles = {
      default:
        'bg-white border border-[#F4F6F8] shadow-[0px_4px_8px_0px_#0000000A]',
      elevated:
        'bg-white shadow-[0px_4px_12px_0px_#00000008] border border-[#F4F6F8]',
      bordered: 'bg-white border border-[#F1F1F1]',
    }[variant]

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden',
          variantStyles,
          roundedStyles,
          paddingStyles,
          divided && 'divide-y divide-[#F1F1F1]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

AppCard.displayName = 'AppCard'
