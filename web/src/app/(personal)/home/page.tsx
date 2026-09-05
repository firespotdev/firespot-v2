'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
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
import { PostCard } from '@/components/posts/post-card'
import { usePostsFeed } from '@/services/posts/hooks'
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
  { label: 'Latest' },
  { label: 'Open now', accent: true },
  { label: 'Nearby' },
  { label: 'For you' },
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
  const postsFeed = usePostsFeed()
  const posts = postsFeed.data?.data || []
  const [activePill, setActivePill] = useState('Latest')

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
          {FILTER_PILLS.map(({ label, accent }) => {
            const isActive = activePill === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (label === 'Latest') {
                    setActivePill('Latest')
                  } else {
                    comingSoon()
                  }
                }}
                className={`shrink-0 px-4 h-9 rounded-full text-sm flex items-center transition-colors ${
                  isActive
                    ? 'bg-black text-white font-bold'
                    : accent
                      ? 'bg-[#E9F6EC] text-[#1F9D50]'
                      : 'bg-[#F1F3F5] text-black'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {postsFeed.isLoading ? (
          <div
            role="status"
            aria-label="Loading posts"
            className="grid grid-cols-2 gap-3 border-t border-[#F1F3F5] px-4 pb-10 pt-4"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="aspect-[0.63] animate-pulse rounded-[14px] bg-[#F1F3F5]"
              />
            ))}
          </div>
        ) : postsFeed.isError ? (
          <div className="border-t border-[#F1F3F5] px-8 pb-10 pt-12 text-center">
            <p className="text-sm font-medium text-[#00000080]">
              Posts could not load right now.
            </p>
            <button
              type="button"
              onClick={() => void postsFeed.refetch()}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Retry
            </button>
          </div>
        ) : posts.length ? (
          <section className="border-t border-[#F1F3F5] px-4 pb-10 pt-4">
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-[#9CA3AF]">
              <span className="h-px w-10 bg-[#E5E7EB]" />
              <span>You&apos;re all caught up</span>
              <span className="h-px w-10 bg-[#E5E7EB]" />
            </div>
          </section>
        ) : (
          <div className="border-t border-[#F1F3F5] px-8 pb-10 pt-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#F1F1F1]">
              <Ghost className="h-7 w-7 text-[#9CA3AF]" strokeWidth={1.5} />
            </span>
            <p className="mt-6 text-base font-bold text-black">
              No new posts from shops
            </p>
            <p className="mt-1 text-sm text-[#00000080]">
              New shop updates will appear here.
            </p>
          </div>
        )}
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
