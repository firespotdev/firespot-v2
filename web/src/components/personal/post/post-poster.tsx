'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { VerifiedBadge } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'
import type { Product } from '@/services/products/productsApi'

const compact = (value: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
    .format(value)
    .toLowerCase()

const TIER_LABEL = { PRO: 'PRO', PROMAX: 'PRO MAX' } as const

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-4">
      <span className="text-[16px] font-bold text-black">{value}</span>
      <span className="text-[13px] font-medium text-black">{label}</span>
    </div>
  )
}

/** The shop behind the post: who they are, a few items, and their numbers. */
export function PostPoster({
  business,
  products,
}: {
  business: PublicBusinessProfile
  products: Product[]
}) {
  const href = `/business?businessId=${business.id}`
  const location = [business.mainAddress?.city, business.mainAddress?.state]
    .filter(Boolean)
    .join(', ')
  const photos = products.filter((product) => product.imageUrl).slice(0, 3)
  const tier = business.verificationLevel

  return (
    <section className="border-b border-[#F1F1F1] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-black">About the poster</h2>
        <Link href={href} className="text-[12px] font-medium text-black underline underline-offset-4">
          View shop
        </Link>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-[#F1F1F1] bg-white shadow-[0px_2px_8px_0px_#0000000A]">
        <Link href={href} className="flex items-center gap-3 p-3">
          <span className="rounded-full border-[3px] border-[#D9DEE6] p-0.5">
            <MerchantAvatar
              profilePhotoUrl={business.businessImageUrl}
              alt={business.businessName}
              size={44}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-[16px] font-bold text-black">
                {business.businessName}
              </span>
              <VerifiedBadge level={tier} className="[&_svg]:h-4 [&_svg]:w-4" />
            </span>
            <span className="block truncate text-[13px] font-medium text-[#6B7280]">
              {[location, `${products.length} ${products.length === 1 ? 'item' : 'items'}`]
                .filter(Boolean)
                .join(' • ')}
            </span>
          </span>
          <ChevronRight size={18} className="text-[#9CA3AF]" />
        </Link>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-0.5">
            {photos.map((product) => (
              <div key={product._id} className="relative aspect-square bg-[#F4F6F8]">
                <Image
                  src={product.imageUrl as string}
                  alt={product.name}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex divide-x divide-[#F1F1F1]">
          <Stat value={compact(business.stats.orderCount)} label="Payments" />
          <Stat
            value={
              tier ? (
                <span className="rounded-full bg-[#1D9BF0] px-2.5 py-0.5 text-[13px] text-white">
                  {TIER_LABEL[tier]}
                </span>
              ) : (
                'Lite'
              )
            }
            label="Plan"
          />
          <Stat value={compact(business.stats.favoriteCount)} label="Faves" />
        </div>
      </div>
    </section>
  )
}
