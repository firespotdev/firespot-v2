'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Share } from 'lucide-react'
import { ItemDetails } from '@/components/personal/business/item-details'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { useSafeBack } from '@/hooks/use-safe-back'
import { useBusinessProfile } from '@/services/business-profile'
import { usePublicCatalogue } from '@/services/products/hooks'

const MORE_FROM_SELLER = 8

async function shareItem(title: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href })
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    showNotificationToast({ message: 'Item link copied', mode: 'success' })
  } catch (error) {
    if ((error as DOMException).name !== 'AbortError') {
      showNotificationToast({
        message: 'Could not share this item.',
        mode: 'error',
      })
    }
  }
}

function ItemPageContent() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('businessId') || ''
  const productId = searchParams.get('productId') || ''
  const goBack = useSafeBack(
    businessId
      ? `/business?businessId=${encodeURIComponent(businessId)}`
      : '/home',
  )
  const profileQuery = useBusinessProfile(businessId)
  const catalogueQuery = usePublicCatalogue(businessId)

  const business = profileQuery.data
  const products = (catalogueQuery.data?.products || []).filter(
    (product) => !product.isArchived,
  )
  const product = products.find((candidate) => candidate._id === productId)
  const isLoading = profileQuery.isLoading || catalogueQuery.isLoading

  return (
    <div className="mx-auto min-h-dvh max-w-125 bg-white font-satoshi">
      <header className="sticky top-0 z-40 flex h-13 items-center justify-between bg-white px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-black transition-colors active:bg-gray-100"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-[16px] font-bold text-black">Item details</h1>
        <button
          type="button"
          onClick={() => product && void shareItem(product.name)}
          disabled={!product}
          aria-label="Share item"
          className="flex h-9 w-9 items-center justify-center rounded-full text-black transition-colors active:bg-gray-100 disabled:opacity-40"
        >
          <Share size={20} strokeWidth={1.75} />
        </button>
      </header>

      {isLoading ? (
        <div className="flex min-h-[60dvh] items-center justify-center">
          <LoaderCircle />
        </div>
      ) : !business || !product ? (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
          <h2 className="text-[20px] font-bold text-black">
            Item unavailable
          </h2>
          <p className="mt-1 text-sm font-medium text-[#00000080]">
            This item may have been removed, or the business is no longer live.
          </p>
          <button
            type="button"
            onClick={goBack}
            className="mt-6 h-11 rounded-full bg-black px-6 text-sm font-bold text-white"
          >
            Go back
          </button>
        </div>
      ) : (
        <ItemDetails
          // Remount per product so option and quantity picks don't carry over
          // when moving between items from "More from this seller".
          key={product._id}
          business={business}
          product={product}
          otherProducts={products
            .filter((candidate) => candidate._id !== product._id)
            .slice(0, MORE_FROM_SELLER)}
          onDone={goBack}
        />
      )}
    </div>
  )
}

export default function ItemPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <ItemPageContent />
    </Suspense>
  )
}
