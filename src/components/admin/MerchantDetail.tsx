'use client'

import { useState } from 'react'
import { useMerchantSpecificStats, type Merchant } from '@/services/merchants'
import { format } from 'date-fns'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  gradient?: boolean
}

function StatCard({ title, value, subtitle, gradient }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        gradient
          ? 'bg-linear-to-br from-[#FB5012] to-[#D72483] text-white'
          : 'bg-white border border-gray-100'
      }`}
    >
      <p
        className={`text-xs font-medium ${
          gradient ? 'text-white/80' : 'text-gray-500'
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          gradient ? 'text-white' : 'text-gray-900'
        }`}
      >
        {typeof value === 'number' ? value.toLocaleString('en-NG') : value}
      </p>
      {subtitle && (
        <p
          className={`mt-1 text-[10px] ${
            gradient ? 'text-white/70' : 'text-gray-400'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface MerchantDetailProps {
  merchant: Merchant
  onClose: () => void
}

export default function MerchantDetail({
  merchant,
  onClose,
}: MerchantDetailProps) {
  const [preset, setPreset] = useState('all_time')
  const {
    data: stats,
    isLoading,
    error,
  } = useMerchantSpecificStats(merchant._id, { preset })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/10 backdrop-blur-sm transition-opacity">
      <div
        className="h-full w-full max-w-2xl animate-in slide-in-from-right bg-white shadow-2xl duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {merchant.businessName || 'Unnamed Merchant'}
              </h2>
              <p className="text-sm text-gray-500">ID: {merchant._id}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {/* Profile Overview */}
              <section>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Profile Overview
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="font-medium text-gray-900">
                      {merchant.fullPhoneNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Merchant Slug</p>
                    <p className="font-medium text-gray-900">
                      {merchant.merchantSlug || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Joined Date</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(merchant.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        merchant.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {merchant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Analytics */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Analytics
                  </h3>
                  <select
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
                  >
                    <option value="all_time">All Time</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                  </select>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 animate-pulse rounded-2xl bg-gray-100"
                      />
                    ))}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Total Scans"
                      value={stats.scans}
                      subtitle="Volume in period"
                      gradient
                    />
                    <StatCard
                      title="Sales (Confirmed)"
                      value={`₦${stats.sales.confirmedAmount.toLocaleString()}`}
                      subtitle={`${stats.sales.confirmedCount} successful transfers`}
                    />
                    <StatCard
                      title="Unique Customers"
                      value={stats.uniqueCustomers}
                      subtitle="By device fingerprint"
                    />
                    <StatCard
                      title="QR Kits"
                      value={stats.qrKits}
                      subtitle="Total assigned"
                    />
                    <StatCard
                      title="Pending Sales"
                      value={stats.sales.pendingCount}
                      subtitle="Awaiting confirm"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
                    Failed to load analytics
                  </div>
                )}
              </section>

              {/* Pending QR Orders */}
              {!isLoading && stats && stats.pendingOrders.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Pending QR Orders
                  </h3>
                  <div className="divide-y divide-gray-100 rounded-2xl border border-amber-100 bg-amber-50/30 overflow-hidden">
                    {stats.pendingOrders.map((order: any) => (
                      <div key={order._id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {order.quantity} QR Kits
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Ordered{' '}
                              {format(
                                new Date(order.createdAt),
                                'MMM dd, yyyy HH:mm',
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-[#FB5012]">
                            ₦{order.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 items-start text-xs text-gray-600">
                          <svg
                            className="h-4 w-4 shrink-0 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <p>{order.deliveryAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
