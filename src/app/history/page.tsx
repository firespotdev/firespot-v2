'use client'

import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  PieChart,
  AlertCircle,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useSales, useSalesStats } from '@/services/sales/hooks'
import { LoaderCircle } from '@/components/ui'
import { getBankLogo } from '@/lib/utils/bank-account'

type TransactionStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED'

interface Sale {
  _id: string
  amount?: number
  description?: string
  paymentMethod?: string
  targetBankName?: string
  status: string
  source?: string
  customerType?: string
  createdAt: string
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getMonthYearKey = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'text-[#24C166]'
    case 'PENDING':
      return 'text-[#BB8123]'
    case 'CANCELLED':
      return 'text-[#9CA3AF]'
    default:
      return 'text-[#6B7280]'
  }
}

const getStatusLabel = (sale: Sale) => {
  if (sale.status === 'CONFIRMED') return 'Confirmed'
  if (sale.status === 'CANCELLED') return 'Cancelled'
  if (sale.source) return `From ${sale.source}`
  return 'Pending'
}

const getAmountLabel = (sale: Sale) => {
  if (sale.status === 'CANCELLED') return 'No sale'
  if (sale.amount) return `₦${formatCurrency(sale.amount)}`
  return 'Enter amount'
}

const getTitle = (sale: Sale) => {
  return `${sale.customerType || 'New'} customer`
}

export default function HistoryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | TransactionStatus>(
    'ALL',
  )
  const [isAmountHidden, setIsAmountHidden] = useState(false)

  const { data: salesData, isLoading } = useSales({
    status: activeFilter,
    limit: '100',
  })
  const { data: salesStats } = useSalesStats()

  const sales: Sale[] = salesData?.data ?? []
  const todaySalesAmount = salesStats?.todaySalesAmount ?? 0

  // Group sales by month/year
  const groupedSales = useMemo(() => {
    const filtered = searchQuery
      ? sales.filter(
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
      : sales

    const groups: Record<string, Sale[]> = {}
    for (const sale of filtered) {
      const key = getMonthYearKey(sale.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(sale)
    }
    return groups
  }, [sales, searchQuery])

  const isEmpty = sales.length === 0 && !isLoading

  return (
    <div className="min-h-dvh bg-[#F4F6F8] flex flex-col font-satoshi">
      <header className="bg-[#F4F6F8] flex items-center justify-between py-3 px-4">
        <ArrowLeft
          onClick={() => router.back()}
          size={24}
          color="black"
          className="cursor-pointer"
        />
        <h1 className="text-lg font-bold text-black">History</h1>
        <Download size={24} color="black" />
      </header>
      <div className="relative mb-4 px-4">
        <div className="absolute left-8 top-1/2 -translate-y-1/2">
          <Search size={16} color="#00000033" strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Search by description or payment method"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-11 pr-4 bg-[#E6E8EB99] border border-[#EBEBEB] rounded-full text-sm font-medium placeholder:text-[#00000066] focus:outline-none focus:ring-1 focus:ring-[#26B2FF]"
        />
      </div>

      <main className="flex-1 flex flex-col px-4">
        <div className="border-2 border-[#0000000A] rounded-[12px] w-full mb-6">
          {!isEmpty && (
            <div className="border border-[#F4F6F8] px-4 py-3 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] flex justify-between items-center">
              <div>
                <button className="flex items-center gap-1 mb-1">
                  <span className="text-[#00000066] text-xs font-medium">
                    Today
                  </span>{' '}
                  <ChevronDown size={14} strokeWidth={2} color="#00000066" />
                </button>
                <div className="flex items-end gap-1.5">
                  <h3 className="font-bold text-xl leading-none">
                    {isAmountHidden
                      ? '₦ ••••••'
                      : `₦ ${formatCurrency(todaySalesAmount)}`}
                  </h3>
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
                <div className="flex justify-center items-center p-2.5 rounded-full bg-[#E5E7EB]">
                  <Clock size={20} strokeWidth={2} color="#6B7280" />
                </div>
                <div className="flex justify-center items-center p-2.5 rounded-full bg-[#26B2FF]">
                  <PieChart size={20} strokeWidth={2} color="#ffffff" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center bg-[#f4f4f4] px-5 py-3 gap-2 rounded-[12px]">
            <AlertCircle size={18} strokeWidth={2.5} color="#00000066" />
            <p className="text-xs text-[#00000066] font-medium">
              You will not receive a payout for these transactions.
              <br />
              Sales are recorded for accounting purposes only.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoaderCircle innerBg="#F4F6F8" />
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-10 animate-in fade-in zoom-in duration-500">
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
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2 overflow-x-auto mb-6 no-scrollbar -mx-1 px-1">
              {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f as any)}
                  className={cn(
                    'px-4 py-2.5 rounded-full text-[10px] font-bold whitespace-nowrap w-fit',
                    activeFilter === f
                      ? 'bg-black text-white'
                      : 'bg-[#E5E7EB99] text-[#111827]',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

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
                        <div
                          key={sale._id}
                          className={cn(
                            'flex items-center gap-2 p-3 group',
                            sale.status === 'CANCELLED' && 'relative',
                          )}
                        >
                          {sale.status === 'CANCELLED' && (
                            <div className="absolute inset-0 bg-[#FAFAFA]/60" />
                          )}
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform">
                              <Image
                                src="/images/default_avatar.png"
                                alt="user"
                                width={36}
                                height={36}
                              />
                            </div>
                            <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-[4.4px] border border-white">
                              <Image
                                src={getBankLogo(sale.targetBankName)}
                                alt="bank"
                                className="rounded-[4.4px] object-cover"
                                width={16}
                                height={16}
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[13px] font-bold text-black truncate mb-1">
                              {getTitle(sale)}
                            </h5>
                            <p className="text-[12px] text-[#6B7280] font-medium">
                              {formatDate(sale.createdAt)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-bold text-black mb-1">
                              {isAmountHidden && sale.amount
                                ? '₦ •••'
                                : getAmountLabel(sale)}
                            </p>
                            <p
                              className={cn(
                                'text-[12px] font-medium',
                                getStatusColor(sale.status),
                                sale.status === 'CANCELLED' && 'font-bold',
                              )}
                            >
                              {getStatusLabel(sale)}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            color="#9CA3AF"
                            className="shrink-0 group-hover:translate-x-0.5 transition-transform"
                          />
                        </div>
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
