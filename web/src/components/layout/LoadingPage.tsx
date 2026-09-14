'use client'

import { LoaderCircle } from '@/components/ui'

interface LoadingPageProps {
  message?: string
  innerBg?: string
}

export function LoadingPage({ 
  message, 
  innerBg = "#F4F6F8" 
}: LoadingPageProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4" style={{ backgroundColor: innerBg }}>
      <LoaderCircle innerBg={innerBg} />
      {message && (
        <p className="text-sm font-medium text-black/60 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}
