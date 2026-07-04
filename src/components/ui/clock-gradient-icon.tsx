import { cn } from '@/lib/utils'

interface ClockGradientIconProps {
  size?: number
  strokeWidth?: number
  className?: string
}

export function ClockGradientIcon({
  size = 80,
  strokeWidth = 1,
  className,
}: ClockGradientIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#owing-clock-gradient)"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-clock', className)}
    >
      <defs>
        <linearGradient
          id="owing-clock-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FB5012" />
          <stop offset="100%" stopColor="#D72483" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}
