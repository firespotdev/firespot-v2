'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ActionList,
  ActionListItem,
  EmptyState,
  LoaderCircle,
} from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Map1, Scan } from 'iconsax-reactjs'
import { useCustomerHistory } from '@/services/sales/hooks'
import { resolveSaleMerchant } from '@/lib/utils/customer-sale'

interface VisitedMerchant {
  id: string
  businessName: string
  businessImageUrl?: string
  businessIndustry?: string
  serialNumber?: string
  lastVisitedAt: number
}

export default function PlacesPage() {
  const { data: sales, isLoading, isError } = useCustomerHistory()
  const places = useMemo(() => {
    const merchants = new Map<string, VisitedMerchant>()

    for (const sale of sales || []) {
      const merchant = resolveSaleMerchant(sale)
      if (!merchant.id) continue

      const lastVisitedAt = new Date(sale.recordedAt || sale.createdAt).getTime()
      const existing = merchants.get(merchant.id)
      if (existing) {
        existing.lastVisitedAt = Math.max(existing.lastVisitedAt, lastVisitedAt)
        if (!existing.serialNumber && sale.serialNumber) {
          existing.serialNumber = sale.serialNumber
        }
        continue
      }

      merchants.set(merchant.id, {
        id: merchant.id,
        businessName: merchant.businessName || 'Merchant',
        businessImageUrl:
          merchant.businessImageUrl || merchant.profilePhotoUrl,
        businessIndustry: merchant.businessIndustry,
        serialNumber: sale.serialNumber,
        lastVisitedAt,
      })
    }

    return Array.from(merchants.values()).sort(
      (a, b) => b.lastVisitedAt - a.lastVisitedAt,
    )
  }, [sales])

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh pb-24">
        <PageHeader
          title="Places you've visited"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
        />

        <main className="px-3">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle />
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm font-medium text-[#00000080]">
              Couldn’t load your places. Try again later.
            </p>
          ) : places.length === 0 ? (
            <div className="flex min-h-[70dvh] items-center">
              <EmptyState
                emoji={
                  <span
                    className="text-[64px] leading-none"
                    role="img"
                    aria-label="map"
                  >
                    🗺️
                  </span>
                }
                title="You haven't visited anywhere"
                details="Shops you've paid through Firespot will appear here."
                cta={
                  <div className="flex items-center gap-3 mt-6">
                    <Link
                      href="/search?type=shops"
                      className="inline-flex items-center gap-1 bg-black text-white text-[10px] font-bold tracking-[1px] rounded-full h-9 px-4"
                    >
                      <Map1 size={16} color="white" />
                      EXPLORE
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 bg-[#F1F1F1] border border-[#DFDFDF80] text-black text-[10px] font-bold tracking-[1px] rounded-full h-9 px-4"
                    >
                      <Scan size={16} color="black" />
                      SCAN QR
                    </Link>
                  </div>
                }
              />
            </div>
          ) : (
            <ActionList>
              {places.map((merchant) => (
                <ActionListItem
                  key={merchant.id}
                  as={merchant.serialNumber ? undefined : 'div'}
                  href={
                    merchant.serialNumber
                      ? `/pay/${merchant.serialNumber}`
                      : undefined
                  }
                  icon={
                    <MerchantAvatar
                      profilePhotoUrl={merchant.businessImageUrl}
                      alt={merchant.businessName}
                      size={48}
                    />
                  }
                  title={merchant.businessName}
                  subtitle={merchant.businessIndustry || 'Shop on Firespot'}
                  trailing={merchant.serialNumber ? undefined : null}
                />
              ))}
            </ActionList>
          )}
        </main>
      </div>
    </div>
  )
}
