'use client'

import { useEffect } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft, Download, ListFilter, Search } from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import { usePlanCatalog } from '@/services/merchant-plans'
import { Sort } from 'iconsax-reactjs'

export default function PayoutsPage() {
  const router = useRouter()
  const { data: catalog, isLoading } = usePlanCatalog()
  const tier = catalog?.current.effectiveTier
  const hasAccess = tier === 'PRO' || tier === 'PROMAX'

  useEffect(() => {
    if (!isLoading && catalog && !hasAccess) router.replace('/plans')
  }, [catalog, hasAccess, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    )
  }
  if (!hasAccess) return null

  return (
    <div className="min-h-dvh bg-[#F5F6F8] font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3">
        <header className="flex items-center justify-between py-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex items-center justify-center"
          >
            <ArrowLeft className="h-6 w-6 text-black" />
          </button>
          <h1 className="text-[20px] font-bold -tracking-[0.4px] text-black">
            Payouts
          </h1>
          <button
            type="button"
            aria-label="Download payouts"
            className="flex items-center justify-center"
          >
            <Download className="h-6 w-6 text-black" />
          </button>
        </header>

        <div className="py-2 flex gap-2">
          <label className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[#E6E8EB99] px-4">
            <Search size={16} className="shrink-0 text-[#9B9B9B]" />
            <input
              type="search"
              placeholder="Search reference number"
              className="min-w-0 flex-1 text-base font-medium text-black outline-none placeholder:text-[#00000066]"
            />
          </label>
          <button
            type="button"
            aria-label="Filter payouts"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E9EBED]"
          >
            <Sort strokeWidth={2} size={16} className="text-black" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <span
            className="text-[64px] leading-none"
            role="img"
            aria-label="Sad"
          >
            😢
          </span>
          <h2 className="mt-5 text-[23px] font-bold -tracking-[0.4px] text-black">
            No payouts yet
          </h2>
          <p className="mt-1.5 max-w-[360px] text-[15px] font-medium leading-[150%] text-[#00000080]">
            You would see your payout history here when you start collecting
            payments with Firespot.
          </p>
        </div>
      </div>
    </div>
  )
}
