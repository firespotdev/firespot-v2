import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppCard } from './app-card'

export interface ActionListProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: '12' | '16' | '24' | 'xl' | '2xl'
}

export const ActionList = React.forwardRef<HTMLDivElement, ActionListProps>(
  ({ className, rounded = '12', children, ...props }, ref) => {
    return (
      <AppCard
        ref={ref}
        rounded={rounded}
        divided
        className={cn('w-full', className)}
        {...props}
      >
        {children}
      </AppCard>
    )
  },
)

ActionList.displayName = 'ActionList'

export interface ActionListItemProps {
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  trailing?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  href?: string
  className?: string
}

export function ActionListItem({
  icon,
  title,
  subtitle,
  badge,
  trailing = <ChevronRight size={16} className="text-[#AEAEB2] stroke-[2.5px]" />,
  danger = false,
  disabled = false,
  onClick,
  href,
  className,
}: ActionListItemProps) {
  const baseClasses = cn(
    'w-full flex items-center justify-between p-4 text-left font-bold text-[14px] transition-colors',
    danger
      ? 'text-[#FF3B30] hover:bg-red-50 active:bg-red-100'
      : 'text-black hover:bg-gray-50 active:bg-gray-100',
    disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent active:bg-transparent',
    className,
  )

  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="flex flex-col min-w-0">
          <span className="truncate">{title}</span>
          {subtitle && (
            <span className="text-xs font-normal text-gray-500 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge}
        {trailing}
      </div>
    </>
  )

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onClick} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
    >
      {content}
    </button>
  )
}
