'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
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
import { StatCard, BreakdownItem } from '@/components/insights'
import Image from 'next/image'

const QR_KIT_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6']

export default function InsightsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const [filter, setFilter] = useState<InsightsQuery>({
    preset: 'all_time',
  })

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

  const filterLabel =
    filter.preset === 'custom'
      ? 'Custom'
      : DATE_RANGE_LABELS[filter.preset as DateRangePreset] || 'All time'

  // Prepare donut chart data for traffic
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
      <div className="h-screen bg-[#FFFFFF] flex items-center justify-center">
        <LoaderCircle innerBg="#FFFFFF" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
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
              {/* Traffic Section with Donut Chart */}
              <div className="bg-white pt-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-black">Traffic</h3>
                  <span className="text-sm font-medium text-black">
                    {insights.traffic.totalCustomers}
                  </span>
                </div>

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
              </div>

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
                    color={QR_KIT_COLORS[index % QR_KIT_COLORS.length]}
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
