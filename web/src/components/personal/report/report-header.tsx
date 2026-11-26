'use client'

import { BackButton } from '@/components/ui'

/** Sticky top bar shared by the report form and dispute status screens. */
export function ReportHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[52px] items-center justify-between border-b border-[#F1F1F1] px-4">
      <BackButton
        label="Go back"
        onClick={onBack}
        iconSize={24}
        className="h-9 w-9 rounded-full"
      />
      <h1 className="text-[16px] font-bold text-black">{title}</h1>
      <span className="w-9" aria-hidden />
    </header>
  )
}
