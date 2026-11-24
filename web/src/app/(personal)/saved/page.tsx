'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from '@bprogress/next/app'
import { useDrawerStore } from '@/services/drawer'
import { ArrowLeft, Search } from 'lucide-react'
import { Map1, Scan } from 'iconsax-reactjs'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { CartCheckoutBar } from '@/components/pay/cart-checkout-bar'
import { SavedShops } from '@/components/saved/saved-shops'
import { SavedItems } from '@/components/saved/saved-items'
import { SavedPosts } from '@/components/saved/saved-posts'
import { useFavorites } from '@/services/favorites'
import { useSavedItems, useSavedPosts } from '@/services/saved'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'

type SavedTab = 'ALL' | 'SHOPS' | 'ITEMS' | 'POSTS'
const TABS: SavedTab[] = ['ALL', 'SHOPS', 'ITEMS', 'POSTS']

const NOUN: Record<Exclude<SavedTab, 'ALL'>, [string, string]> = {
  SHOPS: ['shop', 'shops'],
  ITEMS: ['item', 'items'],
  POSTS: ['post', 'posts'],
}

const countLabel = (tab: Exclude<SavedTab, 'ALL'>, count: number) =>
  `${count} ${NOUN[tab][count === 1 ? 0 : 1]} saved`

function Section({
  title,
  onViewAll,
  children,
}: {
  title: string
  onViewAll: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-[#F1F1F1] py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-black">{title}</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-medium text-black underline underline-offset-4"
        >
          View all
        </button>
      </div>
      {children}
    </section>
  )
}

function NothingSaved({ title, details }: { title: string; details: string }) {
  return (
    <div className="flex min-h-[60dvh] items-center">
      <EmptyState
        emoji={
          <span className="text-[64px] leading-none" role="img" aria-label="bookmark">
            🔖
          </span>
        }
        title={title}
        details={details}
        cta={
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/search?type=shops"
              className="inline-flex h-9 items-center gap-1 rounded-full bg-black px-4 text-[10px] font-bold tracking-[1px] text-white"
            >
              <Map1 size={16} color="white" />
              EXPLORE
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#DFDFDF80] bg-[#F1F1F1] px-4 text-[10px] font-bold tracking-[1px] text-black"
            >
              <Scan size={16} color="black" />
              SCAN QR
            </Link>
          </div>
        }
      />
    </div>
  )
}

export default function SavedPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SavedTab>('ALL')
  const shopsQuery = useFavorites()
  const itemsQuery = useSavedItems()
  const postsQuery = useSavedPosts()
  const cartItems = usePurchaseCartStore((state) => state.items)
  const cartSerial = usePurchaseCartStore((state) => state.serialNumber)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const showCheckoutBar = cartItems.length > 0 && Boolean(cartSerial)

  const shops = shopsQuery.data?.favorites ?? []
  const items = itemsQuery.data?.items ?? []
  const posts = postsQuery.data?.posts ?? []
  const isLoading =
    shopsQuery.isLoading || itemsQuery.isLoading || postsQuery.isLoading
  const isError = shopsQuery.isError || itemsQuery.isError || postsQuery.isError
  const counts = { SHOPS: shops.length, ITEMS: items.length, POSTS: posts.length }
  // The order's shop, found through the saved item that was added from it.
  const cartShopId = items.find(
    (item) => item.merchant.serialNumber === cartSerial,
  )?.merchant.id

  const renderTab = (tab: Exclude<SavedTab, 'ALL'>) => {
    if (counts[tab] === 0) {
      return (
        <NothingSaved
          title={`No saved ${NOUN[tab][1]} yet`}
          details={`${NOUN[tab][1][0].toUpperCase()}${NOUN[tab][1].slice(1)} you save will appear here.`}
        />
      )
    }
    return (
      <div className="pt-4">
        <p className="mb-3 text-sm font-medium text-[#00000066]">
          {countLabel(tab, counts[tab])}
        </p>
        {tab === 'SHOPS' && <SavedShops shops={shops} layout="grid" />}
        {tab === 'ITEMS' && <SavedItems items={items} layout="grid" />}
        {tab === 'POSTS' && <SavedPosts posts={posts} layout="grid" />}
        <p className="py-8 text-center text-xs font-medium text-[#00000066]">
          You’ve reached the end of the list
        </p>
      </div>
    )
  }

  const renderAll = () => {
    if (shops.length + items.length + posts.length === 0) {
      return (
        <NothingSaved
          title="Nothing saved yet"
          details="Shops, items and posts you save will appear here."
        />
      )
    }
    return (
      <>
        {shops.length > 0 && (
          <Section title="Shops" onViewAll={() => setActiveTab('SHOPS')}>
            <SavedShops shops={shops} layout="row" />
          </Section>
        )}
        {items.length > 0 && (
          <Section title="Items" onViewAll={() => setActiveTab('ITEMS')}>
            <SavedItems items={items} layout="row" />
          </Section>
        )}
        {posts.length > 0 && (
          <Section title="Posts" onViewAll={() => setActiveTab('POSTS')}>
            <SavedPosts posts={posts} layout="row" />
          </Section>
        )}
      </>
    )
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      {/* Room for the checkout bar only while it's showing. */}
      <div
        className={`mx-auto min-h-dvh max-w-125 ${showCheckoutBar ? 'pb-28' : 'pb-6'}`}
      >
        <PageHeader
          title="Saved"
          className="bg-white"
          leftSlot={
            <Link
              href="/home"
              aria-label="Back to home"
              className="grid h-9 w-9 place-items-center rounded-full active:bg-black/5"
            >
              <ArrowLeft size={22} />
            </Link>
          }
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

        <div className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-[#F1F1F1] px-3 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex h-9 shrink-0 items-center rounded-full px-4 text-[10px] font-bold tracking-[1px] transition-colors ${
                tab === activeTab ? 'bg-black text-white' : 'bg-[#E5E7EB99] text-black'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <main className="px-3">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle />
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm font-medium text-[#00000080]">
              Couldn’t load what you saved. Try again later.
            </p>
          ) : activeTab === 'ALL' ? (
            renderAll()
          ) : (
            renderTab(activeTab)
          )}
        </main>
      </div>

      {showCheckoutBar && (
        <CartCheckoutBar
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-125"
          itemCount={cartItems.length}
          onCheckout={() => router.push(`/pay/${cartSerial}?checkout=cart`)}
          onViewSelection={
            cartShopId
              ? () =>
                  openDrawer({
                    type: 'order-summary',
                    direction: 'bottom',
                    props: { merchantId: cartShopId, serialNumber: cartSerial },
                  })
              : undefined
          }
        />
      )}
    </div>
  )
}
