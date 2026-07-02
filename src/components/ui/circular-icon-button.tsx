import * as React from 'react'
import { ArrowLeft, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CircularIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      md: 'w-9 h-9 p-1.5',
      lg: 'w-10 h-10 p-2',
    }[size]

    const iconSizeMap = {
      sm: 16,
      md: 20,
      lg: 24,
    }[size]

    const variantClasses = {
      ghost: 'hover:bg-gray-100 active:bg-gray-200 text-black',
      filled: 'bg-gray-100 hover:bg-gray-200 text-black',
      bordered: 'border border-[#F1F1F1] bg-white hover:bg-gray-50 text-black shadow-sm',
    }[variant]

    const renderIcon = () => {
      if (children) return children
      if (React.isValidElement(icon)) return icon

      switch (icon) {
        case 'chevron-down':
          return <ChevronDown size={iconSizeMap} className="stroke-[2.5px]" />
        case 'arrow-left':
          return <ArrowLeft size={iconSizeMap} className="stroke-[2.5px]" />
        case 'x':
        default:
          return <X size={iconSizeMap} className="stroke-[2.5px]" />
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-full transition-all flex items-center justify-center shrink-0',
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
