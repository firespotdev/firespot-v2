import * as React from 'react'
import { ArrowLeft, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CircularIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: 'x' | 'chevron-down' | 'arrow-left' | React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'filled' | 'bordered'
}

export const CircularIconButton = React.forwardRef<
  HTMLButtonElement,
  CircularIconButtonProps
>(
  (
    {
      icon = 'x',
      size = 'md',
      variant = 'ghost',
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'w-7 h-7 p-1',
      md: 'w-9 h-9',
      lg: 'w-10 h-10 p-2',
    }[size]

    const iconSizeMap = {
      sm: 16,
      md: 24,
      lg: 24,
    }[size]

    const variantClasses = {
      ghost: 'text-black',
      filled: 'bg-gray-100 text-black',
      bordered:
        'border border-[#F1F1F1] bg-white text-black shadow-sm',
    }[variant]

    const renderIcon = () => {
      if (children) return children
      if (React.isValidElement(icon)) return icon

      switch (icon) {
        case 'chevron-down':
          return <ChevronDown size={iconSizeMap} className="stroke-[2px]" />
        case 'arrow-left':
          return <ArrowLeft size={iconSizeMap} className="stroke-[2px]" />
        case 'x':
        default:
          return <X size={iconSizeMap} className="stroke-[2px]" />
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={
          icon === 'x' ? 'Close' : icon === 'arrow-left' ? 'Go back' : icon === 'chevron-down' ? 'Collapse' : undefined
        }
        onClick={onClick}
        className={cn(
          'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
          sizeClasses,
          variantClasses,
          className,
        )}
        {...props}
      >
        {renderIcon()}
      </button>
    )
  },
)

CircularIconButton.displayName = 'CircularIconButton'
