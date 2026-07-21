import { ReactNode } from 'react'

interface EmptyStateProps {
  emoji: ReactNode
  title: string
  details: string
  cta: ReactNode
}

export function EmptyState({ emoji, title, details, cta }: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center text-center">
      {emoji}
      <p className="font-bold text-xl text-black mt-3 -tracking-[0.4px]">
        {title}
      </p>
      <p className="text-sm text-[#00000080] mt-2 max-w-70">{details}</p>
      {cta}
    </div>
  )
}
