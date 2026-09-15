'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Search } from 'lucide-react'
import {
  ActionList,
  ActionListItem,
  EmptyState,
  LoaderCircle,
  showNotificationToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { MerchantAvatar } from '@/components/layout'
import { Map1, Scan } from 'iconsax-reactjs'
import { useFavorites, useRemoveFavorite } from '@/services/favorites'

type SavedTab = 'ALL' | 'SHOPS'
const TABS: SavedTab[] = ['ALL', 'SHOPS']

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<SavedTab>('ALL')
  const { data, isLoading, isError } = useFavorites()
  const removeFavorite = useRemoveFavorite()
  const favorites = data?.favorites || []

  const remove = (merchantId: string, businessName?: string) => {
    removeFavorite.mutate(merchantId, {
      onSuccess: () =>
        showNotificationToast({
          message: `${businessName || 'Business'} removed from Faves`,
          mode: 'success',
        }),
      onError: () =>
        showNotificationToast({
          message: 'Could not remove this business. Try again.',
          mode: 'error',
        }),
    })
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh pb-24">
        <PageHeader
          title="Saved"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <Link
              href="/search?type=shops"
              aria-label="Search shops"
              className="grid h-9 w-9 place-items-center rounded-full active:bg-black/5"
            >
              <Search size={20} />
            </Link>
          }
        />

        <div className="flex gap-2 px-3 pb-4 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 h-9 rounded-full text-[10px] font-bold tracking-[1px] flex items-center transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'bg-[#E5E7EB99] text-black'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <main className="px-3">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle />
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm font-medium text-[#00000080]">
              Couldn’t load your saved shops. Try again later.
            </p>
          ) : favorites.length === 0 ? (
            <div className="flex min-h-[60dvh] items-center">
              <EmptyState
                emoji={
                  <span
                    className="text-[64px] leading-none"
                    role="img"
                    aria-label="heart"
                  >
                    ❤️
                  </span>
                }
                title="No saved shops yet"
                details="Businesses you add to Faves will appear here."
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
              {favorites.map((merchant) => (
                <ActionListItem
                  key={merchant.id}
                  as="div"
                  icon={
                    <MerchantAvatar
                      profilePhotoUrl={
                        merchant.businessImageUrl || merchant.profilePhotoUrl
                      }
                      alt={merchant.businessName || 'Saved business'}
                      size={48}
                    />
                  }
                  title={merchant.businessName || 'Business'}
                  subtitle={merchant.businessIndustry || 'Saved shop'}
                  trailing={
                    <button
                      type="button"
                      onClick={() =>
                        remove(merchant.id, merchant.businessName)
                      }
                      disabled={removeFavorite.isPending}
                      aria-label={`Remove ${merchant.businessName || 'business'} from Faves`}
                      className="grid h-9 w-9 place-items-center rounded-full text-[#E23B4E] disabled:opacity-50 active:bg-[#FBEEEE]"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  }
                />
              ))}
            </ActionList>
          )}
        </main>
      </div>
    </div>
  )
}
