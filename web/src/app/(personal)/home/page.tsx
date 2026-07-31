'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Mic,
  Ghost,
  Store,
  Package,
  BriefcaseBusiness,
  MapPinned,
  Ticket,
  WalletCards,
  Banknote,
  Gift,
} from 'lucide-react'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { PageHeader } from '@/components/layout/PageHeader'

const QUICK_ACTIONS = [
  { label: 'Shops', Icon: Store },
  { label: 'Products', Icon: Package },
  { label: 'Services', Icon: BriefcaseBusiness },
  { label: 'Places', Icon: MapPinned },
  { label: 'Events', Icon: Ticket },
  { label: 'Gift Cards', Icon: WalletCards },
  { label: 'Cash', Icon: Banknote },
  { label: 'Rewards', Icon: Gift },
]

const FILTER_PILLS = [
  { label: 'For you', active: true },
  { label: 'Open now', accent: true },
  { label: 'Nearby' },
  { label: 'Latest' },
]

function comingSoon() {
  toast('Coming soon')
}

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasOpenedBusinessIntro = useRef(false)
  const user = useAuthStore((state) => state.user)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  useEffect(() => {
    if (
      searchParams.get('businessIntro') !== '1' ||
      hasOpenedBusinessIntro.current
    ) {
      return
    }

    hasOpenedBusinessIntro.current = true
    openDrawer({ type: 'business-intro' })
    router.replace('/home', { scroll: false })
  }, [openDrawer, router, searchParams])

  // Auth + onboarding are enforced by the (personal) route-group layout.

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.businessName ||
    user?.fullPhoneNumber ||
    ''

  const handleAccountSwitch = () => {
    openDrawer({ type: 'account-switch', props: { mode: 'personal' } })
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-125 mx-auto pb-28">
        <PageHeader
          title={displayName}
          subtitle="No location set"
          showDropdown
          onTitleClick={handleAccountSwitch}
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <button
              type="button"
              onClick={comingSoon}
              aria-label="Add"
              className="h-9 w-9 flex items-center justify-center"
            >
              <Plus className="w-6 h-6 text-black" />
            </button>
          }
        />

        {/* Search */}
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={comingSoon}
            className="w-full h-11 bg-[#F1F3F5] rounded-full flex items-center gap-2 px-4"
          >
            <Search className="w-4.5 h-4.5 text-[#9CA3AF]" />
            <span className="flex-1 text-left text-[15px] text-[#9CA3AF]">
              Find anything on Firespot
            </span>
            <Mic className="w-4.5 h-4.5 text-[#9CA3AF]" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-x-3 gap-y-4 px-4 mt-5">
          {QUICK_ACTIONS.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={comingSoon}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="w-full aspect-square rounded-3xl bg-[#FBEEEE] flex items-center justify-center">
                <Icon className="w-7 h-7 text-[#E23B4E]" strokeWidth={1.75} />
              </span>
              <span className="text-xs text-black">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 mt-6 overflow-x-auto scrollbar-hide">
          {FILTER_PILLS.map(({ label, active, accent }) => (
            <button
              key={label}
              type="button"
              onClick={active ? undefined : comingSoon}
              className={`shrink-0 px-4 h-9 rounded-full text-sm flex items-center ${
                active
                  ? 'bg-black text-white font-bold'
                  : accent
                    ? 'bg-[#E9F6EC] text-[#1F9D50]'
                    : 'bg-[#F1F3F5] text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-[#F1F3F5] mt-4 pt-16 pb-10 flex flex-col items-center px-8 text-center">
          <span className="w-16 h-16 rounded-[12px] bg-[#F1F3F5] flex items-center justify-center">
            <Ghost className="w-7 h-7 text-[#9CA3AF]" strokeWidth={1.5} />
          </span>
          <p className="font-bold text-base text-black mt-6">
            No new posts from shops in this area
          </p>
          <p className="text-sm text-[#00000080] mt-1">
            Explore a broader region or another location entirely.
          </p>
          <button
            type="button"
            onClick={comingSoon}
            className="bg-black text-white text-sm font-bold rounded-full px-6 h-11 mt-6"
          >
            Change location
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <HomePageContent />
    </Suspense>
  )
}
