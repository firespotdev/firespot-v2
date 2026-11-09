'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from '@bprogress/next/app'
import { X } from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { useCustomerHistory } from '@/services/sales/hooks'
import { useMyRecentScans, type RecentScan } from '@/services/scans'
import { useDrawerStore } from '@/services/drawer'
import type { CustomerSale } from '@/services/sales/interface'
import {
  resolveSaleMerchant,
  saleItemCount,
} from '@/lib/utils/customer-sale'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ActivityRow,
  NeedsYouSection,
  ScanActivityRow,
} from '@/components/activity'
import { Map1, Scan, Setting2 } from 'iconsax-reactjs'

type ActivityTab = 'ALL' | 'ORDERS' | 'PAYMENTS' | 'RECENTS'

const TABS: ActivityTab[] = ['ALL', 'ORDERS', 'PAYMENTS', 'RECENTS']

interface DayGroup<T> {
  key: string
  label: string
  items: T[]
}

interface MerchantFilter {
  id: string
  name: string
}

type FeedItem =
  | { kind: 'sale'; key: string; at: string | Date; sale: CustomerSale }
  | { kind: 'scan'; key: string; at: string; scan: RecentScan }

const dayDetails = (raw?: string | Date) => {
  const date = raw ? new Date(raw) : new Date()
  return {
    key: format(date, 'yyyy-MM-dd'),
    label: isToday(date)
      ? 'Today'
      : isYesterday(date)
        ? 'Yesterday'
        : format(date, 'MMMM d'),
  }
}

function groupByDay<T>(items: T[], getDate: (item: T) => string | Date) {
  const groups: DayGroup<T>[] = []
  const index = new Map<string, DayGroup<T>>()

  for (const item of items) {
    const { key, label } = dayDetails(getDate(item))
    let group = index.get(key)
    if (!group) {
      group = { key, label, items: [] }
      index.set(key, group)
      groups.push(group)
    }
    group.items.push(item)
  }

  return groups
}

function ActivityContent() {
  const router = useRouter()
  const { data: sales, isLoading, isError } = useCustomerHistory()
  // Scans only add to the feed; if they fail to load, payments still show.
  const { data: recentScans } = useMyRecentScans()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [activeTab, setActiveTab] = useState<ActivityTab>('ALL')
  // A business profile can open this already filtered to that business.
  const searchParams = useSearchParams()
  const [merchantFilter, setMerchantFilter] = useState<MerchantFilter | null>(
    () => {
      const id = searchParams.get('merchantId')
      return id
        ? { id, name: searchParams.get('merchantName') || 'this business' }
        : null
    },
  )

  const allSales = useMemo(() => sales || [], [sales])
  const scopedSales = useMemo(
    () =>
      merchantFilter
        ? allSales.filter(
            (sale) => resolveSaleMerchant(sale).id === merchantFilter.id,
          )
        : allSales,
    [allSales, merchantFilter],
  )
  const filteredSales = useMemo(() => {
    switch (activeTab) {
      case 'ORDERS':
        return scopedSales.filter((sale) => saleItemCount(sale) > 0)
      case 'PAYMENTS':
        return scopedSales.filter((sale) => saleItemCount(sale) === 0)
      // RECENTS lists only the businesses scanned recently.
      case 'RECENTS':
        return []
      case 'ALL':
      default:
        return scopedSales
    }
  }, [scopedSales, activeTab])

  // Scans aren't orders or payments, so only ALL and RECENTS show them.
  const feedItems = useMemo(() => {
    const saleItems: FeedItem[] = filteredSales.map((sale) => ({
      kind: 'sale',
      key: sale._id,
      at: sale.recordedAt || sale.createdAt,
      sale,
    }))
    const scanItems: FeedItem[] =
      activeTab === 'ALL' || activeTab === 'RECENTS'
        ? (recentScans || [])
            .filter(
              (scan) =>
                !merchantFilter || scan.merchant._id === merchantFilter.id,
            )
            .map((scan) => ({
              kind: 'scan',
              key: `scan-${scan.merchant._id}`,
              at: scan.lastScannedAt,
              scan,
            }))
        : []
    return [...saleItems, ...scanItems].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    )
  }, [filteredSales, recentScans, activeTab, merchantFilter])

  const feedGroups = useMemo(
    () => groupByDay(feedItems, (item) => item.at),
    [feedItems],
  )

  const openScannedBusiness = (scan: RecentScan) =>
    router.push(
      `/business?businessId=${encodeURIComponent(scan.merchant._id)}`,
    )
  const handleOpen = (sale: CustomerSale) => {
    const merchant = resolveSaleMerchant(sale)
    openDrawer({
      type: 'activity-details',
      props: {
        sale,
        onViewPastActivity: merchant.id
          ? () => {
              setMerchantFilter({
                id: merchant.id!,
                name: merchant.businessName || 'this business',
              })
              setActiveTab('ALL')
            }
          : undefined,
      },
    })
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-125 mx-auto min-h-dvh pb-12">
        <PageHeader
          title="Activity"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full cursor-pointer"
            >
              <Setting2 size={24} strokeWidth={2} color="black" />
            </Link>
          }
        />

        {!isLoading && (
          <>
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
                        : 'bg-[#E5E7EB99] text-[#000000]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {merchantFilter && (
              <div className="mx-3 mb-4 flex items-center justify-between rounded-[12px] bg-[#F4F6F8] px-3 py-2">
                <p className="min-w-0 truncate text-[13px] font-medium text-black">
                  Past activity with {merchantFilter.name}
                </p>
                <button
                  type="button"
                  onClick={() => setMerchantFilter(null)}
                  aria-label="Clear merchant filter"
                  className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full active:bg-black/5"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col justify-center items-center">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#00000080] font-medium">
                Couldn’t load your activity. Pull to refresh or try again later.
              </p>
            </div>
          ) : feedItems.length === 0 ? (
            <EmptyState
              emoji={
                <span
                  className="text-[64px] leading-none"
                  role="img"
                  aria-label="clock"
                >
                  🕗
                </span>
              }
              title="No activity yet"
              details={
                merchantFilter
                  ? `No matching activity with ${merchantFilter.name}.`
                  : activeTab === 'RECENTS'
                    ? 'Businesses you scan will appear here.'
                    : 'Your payments, orders and scanned businesses will appear here.'
              }
              cta={
                <div className="flex items-center gap-3 mt-6">
                  <Link
                    href="/home"
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
          ) : (
            <div className="px-3 w-full h-full">
              {activeTab === 'ALL' && !merchantFilter && <NeedsYouSection />}
              {feedGroups.map((group) => (
                <section key={group.key} className="mb-5">
                  <h2 className="text-[15px] font-bold text-black mb-2">
                    {group.label}
                  </h2>
                  <div className="space-y-2 overflow-hidden">
                    {group.items.map((item) =>
                      item.kind === 'sale' ? (
                        <ActivityRow
                          key={item.key}
                          sale={item.sale}
                          onOpen={handleOpen}
                        />
                      ) : (
                        <ScanActivityRow
                          key={item.key}
                          scan={item.scan}
                          onOpen={openScannedBusiness}
                        />
                      ),
                    )}
                  </div>
                </section>
              ))}

              <p className="text-center text-xs text-[#00000066] font-medium py-4">
                You’ve reached the end of the list
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-white">
          <LoaderCircle />
        </div>
      }
    >
      <ActivityContent />
    </Suspense>
  )
}
