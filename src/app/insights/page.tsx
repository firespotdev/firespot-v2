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
import { LoaderCircle } from '@/components/ui'
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
      props: {},
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
      <div className="h-screen bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#F4F6F8] px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
            <h1 className="text-2xl font-bold text-black">Insights</h1>
            <button
              type="button"
              onClick={handleOpenFilter}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-[#E5E7EB] bg-white"
            >
              <Calendar className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Date Range Display */}
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleOpenFilter}
              className="text-sm text-[#3498DB] font-medium"
            >
              {filterLabel}
            </button>
          </div>
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
              <div className="bg-white rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-black">Traffic</h3>
                  <span className="text-base font-bold text-black">
                    {insights.traffic.totalCustomers}
                  </span>
                </div>

                {insights.traffic.totalCustomers > 0 ? (
                  <div className="flex flex-col items-center">
                    <DonutChart
                      segments={trafficSegments}
                      size={180}
                      strokeWidth={24}
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
              <div className="bg-white rounded-2xl px-4">
                {/* QR Kit Scans */}
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

                {/* Transfer Attempts */}
                <StatCard
                  title="Transfer attempts"
                  description="How many times a customer selected a bank app to transfer from."
                  value={insights.transferAttempts.totalAttempts}
                  expandable={insights.transferAttempts.bankBreakdown.length > 0}
                >
                  {insights.transferAttempts.bankBreakdown.map((bank) => (
                    <BreakdownItem
                      key={bank.bankName}
                      label={bank.bankName}
                      count={bank.count}
                      total={insights.transferAttempts.totalAttempts}
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
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="py-6 flex items-center justify-center gap-2">
          <span className="text-xs text-[#00000066]">Powered by</span>
          <Image
            src="/icons/firespot-logo.svg"
            alt="Firespot"
            width={80}
            height={20}
            className="h-5 w-auto"
          />
        </div>
      </div>
    </div>
  )
}
