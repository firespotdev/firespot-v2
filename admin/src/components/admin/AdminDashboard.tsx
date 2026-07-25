'use client'

import { useQRKitStats } from '@/services/qr'
import { useMerchantOverviewStats } from '@/services/merchants'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  gradient?: boolean
}

function StatCard({ title, value, subtitle, gradient }: StatCardProps) {
  return (
    <div
      className={`rounded-[12px] p-6 ${
        gradient
          ? 'bg-linear-to-br from-[#FB5012] to-[#D72483] text-white'
          : 'bg-white border border-gray-100'
      }`}
    >
      <p
        className={`text-sm font-medium ${
          gradient ? 'text-white/80' : 'text-gray-500'
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-2 text-4xl font-bold ${
          gradient ? 'text-white' : 'text-gray-900'
        }`}
      >
        {value.toLocaleString('en-NG')}
      </p>
      {subtitle && (
        <p
          className={`mt-1 text-sm ${
            gradient ? 'text-white/70' : 'text-gray-400'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const {
    data: qrStats,
    isLoading: qrLoading,
    error: qrError,
  } = useQRKitStats()
  const {
    data: merchantStats,
    isLoading: merchantLoading,
    error: merchantError,
  } = useMerchantOverviewStats()

  const isLoading = qrLoading || merchantLoading
  const error = qrError || merchantError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[12px] bg-gray-100"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-600">
        Error loading stats:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-gray-500">Overview of your platform</p>
      </div>

      {/* QR Kit Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">QR Kits</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total QR Kits"
            value={qrStats?.total || 0}
            subtitle="All time"
            gradient
          />
          <StatCard
            title="Pending Activation"
            value={qrStats?.byActivationStatus.pending || 0}
            subtitle="Ready to activate"
          />
          <StatCard
            title="Activated"
            value={qrStats?.byActivationStatus.activated || 0}
            subtitle="In use"
          />
          <StatCard
            title="Deactivated"
            value={qrStats?.byActivationStatus.deactivated || 0}
            subtitle="Disabled"
          />
        </div>
      </div>

      {/* Payment Status */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Payment Status
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {qrStats?.byPaymentStatus.pending || 0}
                </p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {qrStats?.byPaymentStatus.successful || 0}
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {qrStats?.byPaymentStatus.failed || 0}
                </p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
