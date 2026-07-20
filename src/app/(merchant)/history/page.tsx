'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import {
  ArrowLeft,
  Download,
  Search,
  ChevronDown,
  Eye,
  EyeOff,
  Clock,
  PieChart,
  AlertCircle,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useSales, useSalesStats } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useUserQRKits } from '@/services/qr'
import {
  type InsightsQuery,
  DATE_RANGE_LABELS,
  type DateRangePreset,
} from '@/services/insights'
import { Sale } from '@/services/sales/interface'
import { getMerchantStatus } from '@/lib/utils/sales'
import { SaleItem } from '@/components/sales/SaleItem'
import { LoadingPage } from '@/components/layout/LoadingPage'
import { LoaderCircle, TabSwitch } from '@/components/ui'

const getMonthYearKey = (dateStr: string | Date) => {
  const date = new Date(dateStr)
  return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

function HistoryContent() {
  const { openDrawer } = useDrawerStore()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')
  const initialMode = searchParams.get('mode') as
    | 'collected'
    | 'recorded'
    | null

  // Top tab switch state
  const [activeTab, setActiveTab] = useState<'collected' | 'recorded'>(
    initialMode || 'collected',
  )

  // Filter dropdown states
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialStatus ? initialStatus.toUpperCase() : 'ALL',
  )
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL')
  const [selectedQrKit, setSelectedQrKit] = useState<string>('ALL')
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL')

  const [openDropdown, setOpenDropdown] = useState<
    'status' | 'method' | 'qrKit' | 'location' | null
  >(null)
  const [isAmountHidden, setIsAmountHidden] = useState(false)
  const [dateFilter, setDateFilter] = useState<InsightsQuery>({
    preset: 'today',
  })

  // Synchronize state when searchParams changes
  useEffect(() => {
    const status = searchParams.get('status')
    if (status) {
      setSelectedStatus(status.toUpperCase())
    } else {
      setSelectedStatus('ALL')
    }

    const mode = searchParams.get('mode')
    if (mode === 'collected' || mode === 'recorded') {
      setActiveTab(mode)
    }
  }, [searchParams])

  // Fetch QR kits for the Qr kit dropdown options
  const { data: qrKitsData } = useUserQRKits()
  const qrKits = qrKitsData?.data || []

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch sales and statistics with active tab (mode) and dropdown filters applied
  const apiStatusParam = useMemo(() => {
    if (selectedStatus === 'PAID') return 'CONFIRMED'
    if (selectedStatus === 'UNCONFIRMED') return 'PENDING'
    return selectedStatus
  }, [selectedStatus])

  const { data: salesData, isLoading } = useSales({
    mode: activeTab,
    status: apiStatusParam,
    paymentMethod: selectedMethod,
    qrKitName: selectedQrKit,
    location: selectedLocation,
    limit: '100',
    ...(debouncedSearch && { search: debouncedSearch }),
  })

  const { data: salesStats, isLoading: isLoadingStats } = useSalesStats({
    ...dateFilter,
    mode: activeTab,
    paymentMethod: selectedMethod,
    qrKitName: selectedQrKit,
    location: selectedLocation,
  })

  const sales: Sale[] = salesData?.data ?? []
  const todaySalesAmount = salesStats?.todaySalesAmount ?? 0

  // Group sales by month/year with merchant status filtering
  const groupedSales = useMemo(() => {
    let filtered = sales
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(
        (s) => getMerchantStatus(s).toUpperCase() === selectedStatus,
      )
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          (s.description ?? '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (s.paymentMethod ?? '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (s.customerType ?? '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    }

    const groups: Record<string, Sale[]> = {}
    for (const sale of filtered) {
      const key = getMonthYearKey(sale.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(sale)
    }
    return groups
  }, [sales, searchQuery, selectedStatus])

  const isEmpty = sales.length === 0 && !isLoading

  const handleRecordClick = (sale: Sale) => {
    openDrawer({
      type: 'transaction-details',
      props: { sale },
    })
  }

  const filterCapsules = [
    {
      id: 'status' as const,
      label: selectedStatus === 'ALL' ? 'STATUS' : selectedStatus,
      isActive: selectedStatus !== 'ALL',
      options: ['ALL', 'PAID', 'OWING', 'UNCONFIRMED', 'ARCHIVED'],
      value: selectedStatus,
      onChange: setSelectedStatus,
    },
    {
      id: 'method' as const,
      label: selectedMethod === 'ALL' ? 'METHOD' : selectedMethod,
      isActive: selectedMethod !== 'ALL',
      options: ['ALL', 'Bank Transfer', 'Cash', 'POS', 'Other'],
      value: selectedMethod,
      onChange: setSelectedMethod,
    },
    {
      id: 'qrKit' as const,
      label: selectedQrKit === 'ALL' ? 'QR KIT' : selectedQrKit,
      isActive: selectedQrKit !== 'ALL',
      options: ['ALL', ...qrKits.map((kit) => kit.name || kit.serialNumber)],
      value: selectedQrKit,
      onChange: setSelectedQrKit,
    },
    {
      id: 'location' as const,
      label: selectedLocation === 'ALL' ? 'LOCATION' : selectedLocation,
      isActive: selectedLocation !== 'ALL',
      options: ['ALL'],
      value: selectedLocation,
      onChange: setSelectedLocation,
      disabled: true,
    },
  ]

  return (
    <div className="h-dvh bg-[#F4F6F8] flex flex-col font-satoshi overflow-hidden relative">
      {/* Click outside overlay to close dropdowns */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      <header className="shrink-0 bg-[#F4F6F8] flex items-center justify-between py-3 px-4 z-20">
        <ArrowLeft
          onClick={() => router.back()}
          size={24}
          color="black"
          className="cursor-pointer"
        />

        {/* Similar toggle tab to Record Sale page (COLLECTED / RECORDED) */}
        <TabSwitch
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { label: 'COLLECTED', value: 'collected' },
            { label: 'RECORDED', value: 'recorded' },
          ]}
          bgClassName="bg-[#E6E8EB]"
          maxW="max-w-[190px]"
        />

        <Download size={24} color="black" />
      </header>

      <div className="shrink-0 relative mb-4 px-4 z-20">
        <div className="absolute left-8 top-1/2 -translate-y-1/2">
          <Search size={16} color="#00000033" strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Search by description or payment method"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-11 pr-4 bg-[#E6E8EB99] border border-[#EBEBEB] rounded-full text-sm font-medium placeholder:text-[#00000066] focus:outline-none focus:ring-1 focus:ring-[#0075FF]"
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden px-4 z-20">
        <div className="shrink-0 border-2 border-[#0000000A] rounded-2xl w-full mb-6">
          <div className="border border-[#F4F6F8] px-4 py-3 bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] flex justify-between items-center">
            <div>
              <button
                className="flex items-center gap-1 mb-1"
                onClick={() => {
                  openDrawer({
                    type: 'date-range-filter',
                    props: {
                      currentFilter: dateFilter,
                      onApply: (newFilter: InsightsQuery) =>
                        setDateFilter(newFilter),
                    },
                  })
                }}
              >
                <span className="text-[#00000066] text-xs font-medium">
                  {dateFilter.preset === 'custom' &&
                  dateFilter.startDate &&
                  dateFilter.endDate
                    ? `${format(new Date(dateFilter.startDate), 'MMM d')} - ${format(new Date(dateFilter.endDate), 'MMM d')}`
                    : DATE_RANGE_LABELS[dateFilter.preset as DateRangePreset] ||
                      'Today'}
                </span>{' '}
                <ChevronDown size={14} strokeWidth={2} color="#00000066" />
              </button>
              <div className="flex items-end gap-1.5">
                {isLoadingStats ? (
                  <div className="h-5 w-28 bg-gray-200 animate-pulse rounded-[5px]" />
                ) : (
                  <h3 className="font-bold text-xl leading-none">
                    {isAmountHidden
                      ? '₦ ••••••'
                      : `₦ ${formatCurrency(todaySalesAmount)}`}
                  </h3>
                )}
                <button onClick={() => setIsAmountHidden((p) => !p)}>
                  {isAmountHidden ? (
                    <EyeOff size={16} color="#00000066" strokeWidth={2} />
                  ) : (
                    <Eye size={16} color="#00000066" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/recents"
                className="flex justify-center items-center p-2.5 rounded-full bg-[#E5E7EB]"
              >
                <Clock size={20} strokeWidth={2} color="#6B7280" />
              </Link>
              <Link
                href="/insights"
                className="flex justify-center items-center p-2.5 rounded-full bg-[#26B2FF]"
              >
                <PieChart size={20} strokeWidth={2} color="#ffffff" />
              </Link>
            </div>
          </div>

          <div className="flex items-center bg-[#f4f4f4] p-3 gap-2 rounded-2xl">
            <AlertCircle size={18} strokeWidth={2.5} color="#00000066" />
            <p className="text-xs text-[#00000066] font-medium">
              You will not receive a payout for these transactions.
              <br />
              Sales are recorded for accounting purposes only.
            </p>
          </div>
        </div>

        {/* Dropdown Filters capsule layout */}
        <div className="shrink-0 flex gap-2 mb-6 -mx-1 px-1 relative z-20">
          {filterCapsules.map((capsule) => {
            const isOpen = openDropdown === capsule.id
            return (
              <div key={capsule.id} className="relative">
                <button
                  disabled={capsule.disabled}
                  onClick={() => setOpenDropdown(isOpen ? null : capsule.id)}
                  className={cn(
                    'px-4 py-2.5 rounded-full text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all',
                    capsule.isActive || isOpen
                      ? 'bg-black text-white'
                      : 'bg-[#E5E7EB99] text-[#111827]',
                    capsule.disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span>{capsule.label}</span>
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                    strokeWidth={2.5}
                  />
                </button>

                {isOpen && !capsule.disabled && (
                  <div className="absolute left-0 mt-1.5 w-40 bg-white border border-[#E9EBED] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.08)] py-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 overflow-y-auto no-scrollbar">
                    {capsule.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          capsule.onChange(opt)
                          setOpenDropdown(null)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-[11px] font-medium hover:bg-[#F4F6F8] transition-colors',
                          capsule.value === opt
                            ? 'text-black font-bold bg-[#F4F6F8]'
                            : 'text-[#6B7280]',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <LoadingPage />
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-10 animate-in fade-in zoom-in duration-500 overflow-y-auto">
            <div className="text-[64px] mb-10">😢</div>
            <h2 className="text-xl font-bold text-black mb-2 text-center leading-none -tracking-[0.4px]">
              No sales yet
            </h2>
            <p className="text-sm text-[#00000080] font-medium text-center mb-8 leading-[125%]">
              You would see your sales history here when you start recording
              payments with Firespot Lite.
            </p>
            <Link
              href="/record-sale"
              className="bg-black text-white h-9 rounded-full px-4 flex items-center gap-1.5 w-fit"
            >
              <Plus size={14} strokeWidth={2} className="-mt-[1%]" />
              <span className="text-[10px] font-bold leading-none">
                NEW SALE
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
            <div className="space-y-8">
              {Object.keys(groupedSales).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#9CA3AF] font-medium">
                    No transactions match your search.
                  </p>
                </div>
              ) : (
                Object.entries(groupedSales).map(([monthYear, monthSales]) => (
                  <div key={monthYear}>
                    <h4 className="text-[14px] font-bold text-black mb-2">
                      {monthYear}
                    </h4>
                    <div className="bg-white rounded-2xl shadow-[0px_4px_12px_0px_#00000008] border border-[#F4F6F8] overflow-hidden divide-y divide-[#F1F1F1]">
                      {monthSales.map((sale) => (
                        <SaleItem
                          key={sale._id}
                          sale={sale}
                          onClick={() => handleRecordClick(sale)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}

              <p className="text-center text-[#00000066] text-xs font-medium my-6">
                You&apos;ve reached the end of the list
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <HistoryContent />
    </Suspense>
  )
}
