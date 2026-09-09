'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { GreenSpinner } from '@/components/ui'

function RecentsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    const target = tab ? `/sales?tab=${tab}` : '/sales'
    router.replace(target)
  }, [router, searchParams])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F4F6F8]">
      <GreenSpinner size={6} innerBg="#F4F6F8" />
    </div>
  )
}

export default function RecentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F4F6F8]">
          <GreenSpinner size={6} innerBg="#F4F6F8" />
        </div>
      }
    >
      <RecentsRedirect />
    </Suspense>
  )
}
