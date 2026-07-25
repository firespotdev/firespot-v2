'use client'

import { format } from 'date-fns'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import {
  useMerchantInsights,
  type InsightsQuery,
  type DateRangePreset,
  DATE_RANGE_LABELS,
} from '@/services/insights'
import { useBankAccounts } from '@/services/users'
import { LoaderCircle, TagFooter } from '@/components/ui'
import { DonutChart, DonutChartLegend } from '@/components/ui/donut-chart'
import { StatCard, BreakdownItem, CustomChart } from '@/components/insights'
import { formatCurrency } from '@/lib/utils'
import { useSalesStats } from '@/services/sales/hooks'
import {
  generateMockSalesStats,
  generateMockMerchantInsights,
} from '@/lib/mock-data'

const PAY_METHOD_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
]

export default function InsightsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [filter, setFilter] = useState<InsightsQuery>({
    preset: 'today',
  })

  const { data: salesStats } = useSalesStats(filter)

  const { data: insights, isLoading, error } = useMerchantInsights(filter)

  const { data: bankAccountsData } = useBankAccounts()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (!isAuthenticated) {
    return null
  }

  const handleOpenFilter = () => {
    openDrawer({
      type: 'date-range-filter',
      props: {
        currentFilter: filter,
        onApply: (newFilter: InsightsQuery) => setFilter(newFilter),
      },
    })
  }

  const handleNavigateToBankAccounts = () => {
    openDrawer({
      type: 'bank-accounts',
      props: {
        bankAccounts: bankAccountsData?.bankAccounts || [],
      },
    })
  }

  const handleNavigateToQRKits = () => {
    router.push('/qr-kits')
  }

  let filterLabel =
    DATE_RANGE_LABELS[filter.preset as DateRangePreset] || 'All time'
  if (filter.preset === 'custom' && filter.startDate && filter.endDate) {
    const startStr = format(new Date(filter.startDate), 'MMM d')
    const endStr = format(new Date(filter.endDate), 'MMM d')
    filterLabel = `${startStr} - ${endStr}`
  } else if (filter.preset === 'custom') {
    filterLabel = 'Custom'
  }

  const trafficSegments = insights
    ? [
        {
          value: insights.traffic.customerBreakdown.newCustomers,
          color: '#2ECC71',
          label: 'New customers',
        },
        {
          value: insights.traffic.customerBreakdown.returningCustomers,
          color: '#3498DB',
          label: 'Repeat customers',
        },
      ]
    : []

  if (isLoading) {
    return (
      <div className="h-dvh bg-[#FFFFFF] flex items-center justify-center">
        <LoaderCircle innerBg="#FFFFFF" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#FFFFFF]">
      <div className="max-w-[500px] mx-auto min-h-dvh flex flex-col font-satoshi">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#FFFFFF] px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
            <button
              type="button"
              onClick={handleOpenFilter}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#E9EBED]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M11.995 13.7h.01M8.294 13.7h.01M8.294 16.7h.01"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center p-4">
          <h1 className="text-[32px] font-bold text-black -tracking-[0.4px]">
            Insights
          </h1>
          <p className="text-sm text-[#9CA3AF] font-medium">{filterLabel}</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-8">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-700">
                Failed to load insights. Please try again.
              </p>
            </div>
          )}

          {insights && (
            <>
              <div className="border-2 border-[#0000000A] rounded-[12px] w-full">
                <div className="border border-[#F4F6F8] px-4 py-3 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] flex justify-between items-center">
                  <div className="">
                    <button className="flex items-center gap-1 mb-1">
                      <span className="text-[#00000066] text-xs font-medium">
                        Total
                      </span>
                    </button>
                    <div className="flex items-end gap-1.5">
                      <h3 className="font-bold text-xl leading-none">
                        {`₦ ${formatCurrency(salesStats?.todaySalesAmount || 0)}`}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Link
                      href="/history"
                      className="flex justify-center items-center p-2.5 rounded-full bg-[#E5E7EB]"
                    >
                      <Clock size={20} strokeWidth={2} color="#6B7280" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center bg-[#f4f4f4] px-5 py-3 gap-2 rounded-[12px]">
                  <AlertCircle size={18} strokeWidth={2.5} color="#00000066" />
                  <p className="text-xs text-[#00000066] font-medium">
                    You will not receive a payout for these transactions.
                    <br />
                    Sales are recorded for accounting purposes only.
                  </p>
                </div>
              </div>

              <div className="my-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-[#00000066] capitalize">
                    {filterLabel}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {salesStats?.percentageChange !== undefined && (
                      <>
                        {salesStats.percentageChange >= 0 ? (
                          <TrendingUp
                            size={14}
                            strokeWidth={2}
                            color="#22C55E"
                          />
                        ) : (
                          <TrendingDown
                            size={14}
                            strokeWidth={2}
                            color="#EF4444"
                          />
                        )}
                        <p
                          className={`text-xs font-semibold ${salesStats.percentageChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}
                        >
                          {salesStats.percentageChange >= 0 ? '+' : ''}
                          {salesStats.percentageChange}% from{' '}
                          {salesStats.previousPeriodLabel || 'yesterday'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[15px] text-black font-bold mt-1 mb-3">
                  {salesStats?.todaySalesCount || 0} recorded sale
                  {salesStats?.todaySalesCount !== 1 ? 's' : ''}
                </p>
                {salesStats?.todaySalesCount &&
                salesStats.todaySalesCount > 0 ? (
                  <CustomChart data={salesStats?.trend || []} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 bg-[#f4f4f4] rounded-[12px] mt-4">
                    <div className="text-3xl mb-2">😢</div>
                    <p className="text-[13px] font-semibold mb-1 text-[#111827]">
                      No sales yet
                    </p>
                    <p className="text-xs text-[#00000066] font-medium px-8 text-center">
                      When you record sales, your performance trends will appear
                      here.
                    </p>
                  </div>
                )}
              </div>

              {/* Traffic Section with Donut Chart */}
              <StatCard
                title="Traffic"
                value={insights.traffic.totalCustomers}
                expandable={true}
              >
                {insights.traffic.totalCustomers > 0 ? (
                  <div className="flex flex-col items-center">
                    <DonutChart
                      segments={trafficSegments}
                      size={180}
                      strokeWidth={20}
                      centerLabel="Customers"
                      centerValue={insights.traffic.totalCustomers}
                    />
                    <DonutChartLegend segments={trafficSegments} />
                  </div>
                ) : (
                  <p className="text-sm text-[#00000066] text-center py-8">
                    No traffic data for this period
                  </p>
                )}
              </StatCard>

              {/* Payment Methods Section */}
              <StatCard
                title="Payment methods"
                description="How your customers pay you (based on your recorded sales)."
                value={insights.paymentMethods?.totalSales}
                expandable={
                  (insights.paymentMethods?.breakdown.length || 0) > 0
                }
              >
                {insights.paymentMethods?.breakdown.map((item, index) => (
                  <BreakdownItem
                    key={item.method}
                    label={item.method}
                    count={item.count}
                    total={insights.paymentMethods.totalSales}
                    color={PAY_METHOD_COLORS[index % PAY_METHOD_COLORS.length]}
                  />
                ))}
              </StatCard>

              {/* Stats Section */}
              <StatCard
                title="QR kit scans"
                description="How many times your transfer page was viewed."
                value={insights.qrKitScans.totalScans}
                expandable={insights.qrKitScans.breakdown.length > 0}
              >
                {insights.qrKitScans.breakdown.map((kit, index) => (
                  <BreakdownItem
                    key={kit.qrKitId}
                    label={kit.serialNumber}
                    count={kit.scanCount}
                    total={insights.qrKitScans.totalScans}
                    color="linear-gradient(to bottom right, #FB5012, #D72483)"
                  />
                ))}
              </StatCard>

              {/* Account Number Copied */}
              <StatCard
                title="Account number copied"
                description="How many times your account numbers were copied."
                value={insights.accountCopies.totalCopies}
                expandable={insights.accountCopies.bankBreakdown.length > 0}
              >
                {insights.accountCopies.bankBreakdown.map((bank) => (
                  <BreakdownItem
                    key={bank.bankName}
                    label={bank.bankName}
                    count={bank.count}
                    total={insights.accountCopies.totalCopies}
                    showBankLogo
                  />
                ))}
              </StatCard>

              {/* Linked Bank Accounts */}
              <StatCard
                title="Linked bank accounts"
                value={insights.linkedCounts.bankAccounts}
                navigable
                onNavigate={handleNavigateToBankAccounts}
              />

              {/* Linked QR Kits */}
              <StatCard
                title="Linked QR kits"
                value={insights.linkedCounts.qrKits}
                navigable
                onNavigate={handleNavigateToQRKits}
              />
            </>
          )}
        </div>

        <TagFooter />
      </div>
    </div>
  )
}
