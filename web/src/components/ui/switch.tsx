'use client'

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = '',
}: SwitchProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onCheckedChange?.(!checked);
        }
      }}
      className={`
        relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full p-1
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-[#26B2FF]' : 'bg-[#E5E5E5]'}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-[0px_3.06px_1.02px_0px_#0000000F, 0px_3.06px_8.16px_0px_#00000026]
          ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-4.5' : 'translate-x-0'}
        `}
      />
    </div>
  )
}
