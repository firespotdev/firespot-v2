'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  ListFilter,
  Eye,
  EyeOff,
  PieChart,
  ChevronRight,
  Map as MapIcon,
  ScanLine,
} from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { LoaderCircle } from '@/components/ui'
import { useCustomerHistory } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import type { CustomerSale } from '@/services/sales/interface'
import {
  resolveSaleMerchant,
  saleActivitySubtitle,
  saleItemCount,
} from '@/lib/utils/customer-sale'
import { formatCurrency } from '@/lib/utils'

type ActivityTab = 'ALL' | 'ORDERS' | 'BOOKINGS' | 'PAYMENTS'
const TABS: ActivityTab[] = ['ALL', 'ORDERS', 'BOOKINGS', 'PAYMENTS']

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

function ActivityRow({
  sale,
  onOpen,
}: {
  sale: CustomerSale
  onOpen: (sale: CustomerSale) => void
}) {
  const merchant = resolveSaleMerchant(sale)
  const businessName = merchant.businessName || 'Merchant'

  return (
    <button
      type="button"
      onClick={() => onOpen(sale)}
      className="w-full flex items-center gap-3 p-3 border-b border-[#F1F1F1] last:border-b-0 text-left"
    >
      <div className="w-10 h-10 rounded-full bg-[#E9EDF1] border border-[#F1F1F1] overflow-hidden flex items-center justify-center shrink-0">
        {merchant.profilePhotoUrl ? (
          <Image
            src={merchant.profilePhotoUrl}
            alt={businessName}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <Image src="/icons/store_solid.svg" width={16} height={16} alt="" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-black truncate">
          {businessName}
        </p>
        <p className="text-xs font-medium text-[#00000066] truncate mt-0.5">
          {saleActivitySubtitle(sale)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          <p className="text-[14px] font-bold text-black">
            ₦{formatCurrency(sale.amount || 0)}
          </p>
          <p className="text-xs font-medium text-[#24C166] mt-0.5">Paid</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
      </div>
    </button>
  )
}

export default function ActivityPage() {
  const { data: sales, isLoading, isError } = useCustomerHistory()
  const openDrawer = useDrawerStore((s) => s.openDrawer)

  const [activeTab, setActiveTab] = useState<ActivityTab>('ALL')
  const [amountHidden, setAmountHidden] = useState(false)

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

  const spentToday = useMemo(
    () =>
      allSales.reduce((sum, sale) => {
        const raw = sale.recordedAt || sale.createdAt
        const date = raw ? new Date(raw) : null
        return date && isToday(date) ? sum + (sale.amount || 0) : sum
      }, 0),
    [allSales],
  )

  const groups = useMemo(() => groupByDay(filteredSales), [filteredSales])

  const handleOpen = (sale: CustomerSale) => {
    openDrawer({ type: 'activity-details', props: { sale } })
  }

  return (
    <div className="min-h-dvh bg-[#F4F6F8] font-satoshi">
      <div className="max-w-[500px] mx-auto min-h-dvh pb-28">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#F4F6F8] flex items-center justify-between px-4 py-3">
          <Image
            src="/images/firespot_personal.png"
            alt="Firespot"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-lg font-bold text-black">Activity</h1>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Filter">
              <ListFilter className="w-6 h-6 text-black" />
            </button>
            <button type="button" aria-label="Search">
              <Search className="w-6 h-6 text-black" />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-1 pb-3 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 h-9 rounded-full text-xs font-bold tracking-[0.5px] flex items-center transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'bg-white text-[#00000099]'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center pt-24">
            <LoaderCircle />
          </div>
        ) : isError ? (
          <div className="px-8 pt-24 text-center">
            <p className="text-sm text-[#00000080] font-medium">
              Couldn’t load your activity. Pull to refresh or try again later.
            </p>
          </div>
        ) : filteredSales.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="px-4">
            {/* Spent today card */}
            <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] p-4 flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-[#00000066] font-medium mb-1">
                  Spent today
                </p>
                <p className="text-[26px] font-bold text-black -tracking-[0.4px] leading-none">
                  {amountHidden ? '₦ • • • • •' : `₦ ${formatCurrency(spentToday)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAmountHidden((v) => !v)}
                  aria-label={amountHidden ? 'Show amount' : 'Hide amount'}
                  className="w-9 h-9 rounded-full bg-[#E9EBED] flex items-center justify-center"
                >
                  {amountHidden ? (
                    <Eye className="w-4.5 h-4.5 text-[#6B7280]" />
                  ) : (
                    <EyeOff className="w-4.5 h-4.5 text-[#6B7280]" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Breakdown"
                  className="w-9 h-9 rounded-full bg-[#0075FF] flex items-center justify-center"
                >
                  <PieChart className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            </div>

            {/* Grouped list */}
            {groups.map((group) => (
              <div key={group.key} className="mb-5">
                <h2 className="text-[15px] font-bold text-black mb-2">
                  {group.label}
                </h2>
                <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
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
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center px-8 pt-20">
      <span className="text-[64px] leading-none" role="img" aria-label="clock">
        🕐
      </span>
      <p className="font-bold text-lg text-black mt-6">No activity yet</p>
      <p className="text-sm text-[#00000080] mt-1 max-w-[280px]">
        Your orders, bookings, payments, feedback, issues, refunds etc would be
        listed here.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 bg-black text-white text-xs font-bold tracking-[1px] rounded-full h-11 px-5"
        >
          <MapIcon className="w-4.5 h-4.5" />
          EXPLORE
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white text-black text-xs font-bold tracking-[1px] rounded-full h-11 px-5"
        >
          <ScanLine className="w-4.5 h-4.5" />
          SCAN QR
        </Link>
      </div>
    </div>
  )
}
