'use client'

import { cn } from '@/lib/utils'

interface TabSwitchOption<T extends string> {
  label: string
  value: T
}

interface TabSwitchProps<T extends string> {
  value: T
  onChange: (value: T) => void
  /** Two or more options (the plans screen uses three). */
  options: TabSwitchOption<T>[]
  bgClassName?: string
  maxW?: string
  className?: string
  /** Styling for the selected pill — overridable for dark surfaces. */
  activeClassName?: string
  inactiveClassName?: string
}

export function TabSwitch<T extends string>({
  value,
  onChange,
  options,
  bgClassName = 'bg-[#F4F6F8]',
  maxW = 'max-w-[178px]',
  className,
  activeClassName = 'bg-white text-black shadow-[0px_4px_8px_0px_#0000000A] font-bold',
  inactiveClassName = 'text-black/60 font-medium',
}: TabSwitchProps<T>) {
  return (
    <div
      className={cn(
        'flex rounded-full p-[3px] select-none flex-1 mx-3 transition-all duration-200',
        bgClassName,
        maxW,
        className
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 text-center py-2 w-fit text-[10px] tracking-[1.1px] font-bold rounded-full transition-all duration-200',
              isActive ? activeClassName : inactiveClassName
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
