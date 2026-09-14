'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { useCustomerHistory } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import type { CustomerSale } from '@/services/sales/interface'
import { saleItemCount } from '@/lib/utils/customer-sale'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActivityRow, NeedsYouSection } from '@/components/activity'
import { Map1, Scan, Setting2 } from 'iconsax-reactjs'

type ActivityTab =
  | 'ALL'
  | 'ORDERS'
  | 'PAYMENTS'
  | 'BOOKINGS'
  | 'REWARDS'
  | 'COMMENTS'
  | 'ISSUES'
  | 'REPOSTS'
const TABS: ActivityTab[] = [
  'ALL',
  'ORDERS',
  'PAYMENTS',
  'BOOKINGS',
  'REWARDS',
  'COMMENTS',
  'ISSUES',
  'REPOSTS',
]

interface DayGroup {
  key: string
  label: string
  sales: CustomerSale[]
}

function groupByDay(sales: CustomerSale[]): DayGroup[] {
  const groups: DayGroup[] = []
  const index = new Map<string, DayGroup>()

  for (const sale of sales) {
    const raw = sale.recordedAt || sale.createdAt
    const date = raw ? new Date(raw) : new Date()
    const key = format(date, 'yyyy-MM-dd')
    const label = isToday(date)
      ? 'Today'
      : isYesterday(date)
        ? 'Yesterday'
        : format(date, 'MMMM d')

    let group = index.get(key)
    if (!group) {
      group = { key, label, sales: [] }
      index.set(key, group)
      groups.push(group)
    }
    group.sales.push(sale)
  }

  return groups
}

export default function ActivityPage() {
  const { data: sales, isLoading, isError } = useCustomerHistory()
  const openDrawer = useDrawerStore((s) => s.openDrawer)

  const [activeTab, setActiveTab] = useState<ActivityTab>('ALL')

  const allSales = useMemo(() => sales || [], [sales])

  const filteredSales = useMemo(() => {
    switch (activeTab) {
      case 'ORDERS':
        return allSales.filter((s) => saleItemCount(s) > 0)
      case 'BOOKINGS':
        return []
      case 'ALL':
      case 'PAYMENTS':
      default:
        return allSales
    }
  }, [allSales, activeTab])

  const groups = useMemo(() => groupByDay(filteredSales), [filteredSales])

  const handleOpen = (sale: CustomerSale) => {
    openDrawer({ type: 'activity-details', props: { sale } })
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-125 mx-auto min-h-dvh pb-12">
        <PageHeader
          title="Activity"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <button
              type="button"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-gray-200"
            >
              <Setting2 size={24} strokeWidth={2} color="black" />
            </button>
          }
        />

        {/* Tabs */}
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
          ) : filteredSales.length === 0 ? (
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
              title="No Activity yet"
              details="Your orders, bookings, payments, feedback, issues, refunds etc would be listed here."
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
              {/* Needs You Section */}
              <NeedsYouSection />

              {/* Grouped list */}
              {groups.map((group) => (
                <div key={group.key} className="mb-5">
                  <h2 className="text-[15px] font-bold text-black mb-2">
                    {group.label}
                  </h2>
                  <div className="space-y-2 overflow-hidden">
                    {group.sales.map((sale) => (
                      <ActivityRow
                        key={sale._id}
                        sale={sale}
                        onOpen={handleOpen}
                      />
                    ))}
                  </div>
                </div>
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
