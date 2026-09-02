'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  ChevronDown,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  Share2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useSales, useSalesStats } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useUserProfile } from '@/services/users'
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
import { useSafeBack } from '@/hooks/use-safe-back'
import { ChartPieSliceIcon, ScrollIcon } from '@phosphor-icons/react'

type HistoryMode = 'collected' | 'recorded'
type FilterId = 'mode' | 'status' | 'method' | 'qrKit' | 'location'

const getDateGroupLabel = (dateStr: string | Date) => {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy')
}

function HistoryContent() {
  const { openDrawer } = useDrawerStore()
  const handleBack = useSafeBack('/profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')?.toUpperCase() || 'ALL'
  const initialMode: HistoryMode =
    searchParams.get('mode') === 'recorded' ? 'recorded' : 'collected'

  const [selectedMode, setSelectedMode] = useState<HistoryMode>(initialMode)

  // Filter dropdown states
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus)
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL')
  const [selectedQrKit, setSelectedQrKit] = useState<string>('ALL')
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL')

  const [openDropdown, setOpenDropdown] = useState<FilterId | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const filterButtonRefs = useRef<
    Partial<Record<FilterId, HTMLButtonElement | null>>
  >({})
  const [isAmountHidden, setIsAmountHidden] = useState(false)
  const [dateFilter, setDateFilter] = useState<InsightsQuery>({
    preset: 'today',
  })

  // Fetch QR kits for the Qr kit dropdown options
  const { data: qrKitsData } = useUserQRKits()
  const { data: profile } = useUserProfile()
  const qrKits = qrKitsData?.data || []

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!openDropdown) return

    const updateDropdownPosition = () => {
      const button = filterButtonRefs.current[openDropdown]
      if (!button) return

      const rect = button.getBoundingClientRect()
      const menuWidth = 160
      setDropdownPosition({
        top: rect.bottom + 6,
        left: Math.min(
          rect.left,
          Math.max(16, window.innerWidth - menuWidth - 16),
        ),
      })
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [openDropdown])

  // Fetch sales and statistics with the selected mode and dropdown filters applied
  const apiStatusParam = useMemo(() => {
    if (selectedStatus === 'PAID') return 'CONFIRMED'
    if (selectedStatus === 'UNCONFIRMED') return 'PENDING'
    return selectedStatus
  }, [selectedStatus])

  const { data: salesData, isLoading } = useSales({
    mode: selectedMode,
    status: apiStatusParam,
    paymentMethod: selectedMethod,
    qrKitName: selectedQrKit,
    location: selectedLocation,
    limit: '100',
    ...(debouncedSearch && { search: debouncedSearch }),
  })

  const { data: salesStats, isLoading: isLoadingStats } = useSalesStats({
    ...dateFilter,
    mode: selectedMode,
    paymentMethod: selectedMethod,
    qrKitName: selectedQrKit,
    location: selectedLocation,
  })

  const sales: Sale[] = useMemo(() => salesData?.data ?? [], [salesData?.data])
  const todaySalesAmount = salesStats?.todaySalesAmount ?? 0

  // Group sales by day with merchant status filtering
  const groupedSales = useMemo(() => {
    let filtered = sales
    if (selectedStatus !== 'ALL' && selectedStatus !== 'RECORDED') {
      filtered = filtered.filter(
        (s) => getMerchantStatus(s).toUpperCase() === selectedStatus,
      )
    }
    if (searchQuery) {
      filtered = filtered.filter((s) =>
        [
          s.description,
          s.paymentMethod,
          s.customerType,
          s.customerName,
          s.targetBankName,
          s.sourceBankName,
          typeof s.customerId === 'object' ? s.customerId?.name : undefined,
          typeof s.customerId === 'object'
            ? s.customerId?.businessName
            : undefined,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    }

    const groups: Record<string, Sale[]> = {}
    for (const sale of filtered) {
      const key = getDateGroupLabel(sale.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(sale)
    }
    return groups
  }, [sales, searchQuery, selectedStatus])

  const isEmpty = sales.length === 0 && !isLoading
  const hasActiveListFilters =
    Boolean(searchQuery.trim()) ||
    selectedStatus !== 'ALL' ||
    selectedMethod !== 'ALL' ||
    selectedQrKit !== 'ALL' ||
    selectedLocation !== 'ALL'
  const showEmptyState = isEmpty && !hasActiveListFilters

  const handleRecordClick = (sale: Sale) => {
    openDrawer({
      type: 'transaction-details',
      props: { sale, origin: 'history' },
    })
  }

  const filterCapsules: Array<{
    id: FilterId
    label: string
    isActive: boolean
    options: string[]
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }> = [
    {
      id: 'mode',
      label: selectedMode.toUpperCase(),
      isActive: true,
      options: ['RECORDED', 'COLLECTED'],
      value: selectedMode.toUpperCase(),
      onChange: (value) => setSelectedMode(value.toLowerCase() as HistoryMode),
    },
    {
      id: 'status',
      label: selectedStatus === 'ALL' ? 'STATUS' : selectedStatus,
      isActive: selectedStatus !== 'ALL',
      options: ['ALL', 'PAID', 'OWING', 'UNCONFIRMED', 'ARCHIVED'],
      value: selectedStatus,
      onChange: setSelectedStatus,
    },
    {
      id: 'method',
      label: selectedMethod === 'ALL' ? 'METHOD' : selectedMethod,
      isActive: selectedMethod !== 'ALL',
      options: ['ALL', 'Bank Transfer', 'Cash', 'POS', 'Other'],
      value: selectedMethod,
      onChange: setSelectedMethod,
    },
    {
      id: 'qrKit',
      label: selectedQrKit === 'ALL' ? 'QR KIT' : selectedQrKit,
      isActive: selectedQrKit !== 'ALL',
      options: ['ALL', ...qrKits.map((kit) => kit.name || kit.serialNumber)],
      value: selectedQrKit,
      onChange: setSelectedQrKit,
    },
    {
      id: 'location',
      label: selectedLocation === 'ALL' ? 'LOCATION' : selectedLocation,
      isActive: selectedLocation !== 'ALL',
      options: ['ALL'],
      value: selectedLocation,
      onChange: setSelectedLocation,
      disabled: true,
    },
  ]

  const closeDropdown = () => {
    setOpenDropdown(null)
    setDropdownPosition(null)
  }

  const handleDropdownToggle = (id: FilterId) => {
    if (openDropdown === id) {
      closeDropdown()
      return
    }

    const button = filterButtonRefs.current[id]
    if (!button) return

    const rect = button.getBoundingClientRect()
    const menuWidth = 160
    setDropdownPosition({
      top: rect.bottom + 6,
      left: Math.min(
        rect.left,
        Math.max(16, window.innerWidth - menuWidth - 16),
      ),
    })
    setOpenDropdown(id)
  }

  const openCapsule = filterCapsules.find(
    (capsule) => capsule.id === openDropdown,
  )

  const handleShareProfile = () => {
    const firstKit = qrKitsData?.data?.[0]
    if (!firstKit) {
      openDrawer({ type: 'obtain-kit' })
      return
    }

    openDrawer({
      type: 'profile-share',
      props: {
        businessName: profile?.businessName || 'Your Business',
        imageUrl: profile?.businessImageUrl || profile?.profilePhotoUrl,
        serialNumber: firstKit.serialNumber,
      },
    })
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] flex flex-col font-satoshi overflow-hidden relative">
      {/* Click outside overlay to close dropdowns */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={closeDropdown} />
      )}

      <header className="shrink-0 bg-[#F4F6F8] flex items-center justify-between py-2 px-4 z-30">
        <button className="flex p-1.5 items-center justify-center">
          <ScrollIcon size={24} weight="fill" color="black" strokeWidth={2} />
        </button>
        <h1 className="text-base font-bold leading-none text-black">History</h1>
        <button
          type="button"
          onClick={handleBack}
          aria-label="Close history"
          className="flex p-1.5 items-center justify-center"
        >
          <X size={24} strokeWidth={2} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 z-20">
        {showEmptyState ? (
          <div className="py-16 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="text-[64px] mb-10">😢</div>
            <h2 className="text-xl font-bold text-black mb-2 text-center leading-none -tracking-[0.4px]">
              No sales yet
            </h2>
            <p className="text-sm text-[#00000080] font-medium text-center mb-8 leading-[125%]">
              You would see your sales history here when you start recording
              payments with Firespot Lite.
            </p>
            <button
              type="button"
              onClick={() => openDrawer({ type: 'record-sale' })}
              className="bg-black text-white h-9 rounded-full px-4 flex items-center gap-1.5 w-fit"
            >
              <Plus size={14} strokeWidth={2} className="-mt-[1%]" />
              <span className="text-[10px] font-bold leading-none">
                NEW SALE
              </span>
            </button>
            <button
              type="button"
              onClick={handleShareProfile}
              className="mt-3 flex h-9 items-center gap-2 rounded-full border border-[#DFDFDF] bg-[#F1F1F1] px-4 text-[10px] font-bold tracking-[1px] text-black"
            >
              <Share2 size={16} />
              SHARE PROFILE
            </button>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative mb-1.5">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search size={16} color="#00000033" strokeWidth={2} />
              </div>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-11 pr-4 bg-[#E6E8EB99] border border-[#EBEBEB] rounded-full text-sm font-medium placeholder:text-[#00000066] focus:outline-none focus:ring-1 focus:ring-[#0075FF]"
              />
            </div>

            {/* Dropdown Filters capsule layout (Sticky under header) */}
            <div className="sticky top-0 bg-[#F4F6F8] py-2.5 mb-1.5 z-20 -mx-4 px-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {filterCapsules.map((capsule) => {
                  const isOpen = openDropdown === capsule.id
                  return (
                    <div key={capsule.id} className="relative shrink-0">
                      <button
                        ref={(node) => {
                          filterButtonRefs.current[capsule.id] = node
                        }}
                        type="button"
                        disabled={capsule.disabled}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={() => handleDropdownToggle(capsule.id)}
                        className={cn(
                          'px-4 h-9 rounded-full text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all',
                          capsule.isActive || isOpen
                            ? 'bg-[#E5E7EB99] text-[#111827] border border-black'
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
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary Card */}
            <div
              className={cn(
                'w-full overflow-hidden rounded-[12px] border-2 mb-4',
                profile?.planTier
                  ? 'border-[#C5EEDB] bg-[#E0F5EA]'
                  : 'border-[#0000000A]',
              )}
            >
              <div className="border border-[#F4F6F8] px-4 py-3 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] flex justify-between items-center">
                <div>
                  <button
                    type="button"
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
                        : DATE_RANGE_LABELS[
                            dateFilter.preset as DateRangePreset
                          ] || 'Today'}
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
                    <button
                      type="button"
                      onClick={() => setIsAmountHidden((p) => !p)}
                      aria-label={
                        isAmountHidden ? 'Show amount' : 'Hide amount'
                      }
                    >
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
                    href="/insights"
                    aria-label="View insights"
                    className="flex justify-center items-center p-2.5 rounded-full bg-[#E5E7EB]"
                  >
                    <ChartPieSliceIcon
                      size={24}
                      strokeWidth={2}
                      color="#9CA3AF"
                      weight="fill"
                      className="rotate-[90deg]"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openDrawer({ type: 'record-sale' })}
                    aria-label="Create new sale"
                    className="flex justify-center items-center p-2.5 rounded-full bg-[#26B2FF]"
                  >
                    <Plus size={24} strokeWidth={2} color="#ffffff" />
                  </button>
                </div>
              </div>

              {profile?.planTier ? (
                <div className="flex items-center gap-2 rounded-b-[12px] bg-[#24C1661A] p-3 text-[#33A061]">
                  <AlertCircle
                    className="mt-0.5 shrink-0"
                    size={18}
                    strokeWidth={2.5}
                    color="#33A061"
                  />
                  <p className="text-xs font-medium leading-[125%]">
                    Sales are automatically recorded. Payouts may vary after
                    processing fees have been deducted.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-[12px] bg-[#f4f4f4] p-3">
                  <AlertCircle size={18} strokeWidth={2.5} color="#00000066" />
                  <p className="text-xs font-medium text-[#00000066]">
                    You will not receive a payout for these transactions.
                    <br />
                    Sales are recorded for accounting purposes only.
                  </p>
                </div>
              )}
            </div>

            {openCapsule && dropdownPosition && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    className="fixed w-40 bg-white border border-[#E9EBED] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.08)] py-1 z-[60] animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 overflow-y-auto scrollbar-hide"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                    }}
                  >
                    {openCapsule.options.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => {
                          openCapsule.onChange(opt)
                          closeDropdown()
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-[11px] font-medium hover:bg-[#F4F6F8] transition-colors',
                          openCapsule.value === opt
                            ? 'text-black font-bold bg-[#F4F6F8]'
                            : 'text-[#6B7280]',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>,
                  document.body,
                )
              : null}

            {/* Transaction Content */}
            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <LoadingPage />
              </div>
            ) : isEmpty ? (
              <div className="text-center py-12">
                <p className="text-[#9CA3AF] font-medium">
                  No transactions match your filters.
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-8">
                  {Object.keys(groupedSales).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#9CA3AF] font-medium">
                        No transactions match your filters.
                      </p>
                    </div>
                  ) : (
                    Object.entries(groupedSales).map(
                      ([dateGroup, dateSales]) => (
                        <div key={dateGroup}>
                          <h4 className="text-[14px] font-bold text-black mb-2">
                            {dateGroup}
                          </h4>
                          <div className="bg-white rounded-[12px] shadow-[0px_4px_12px_0px_#00000008] border border-[#F4F6F8] overflow-hidden divide-y divide-[#F1F1F1]">
                            {dateSales.map((sale) => (
                              <SaleItem
                                key={sale._id}
                                sale={sale}
                                variant="history"
                                onClick={() => handleRecordClick(sale)}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}

                  {Object.keys(groupedSales).length > 0 && (
                    <p className="text-center text-[#00000066] text-xs font-medium my-6">
                      You&apos;ve reached the end of the list
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
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
