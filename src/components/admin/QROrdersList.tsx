'use client'

import { useState } from 'react'
import {
  useAdminQROrders,
  useUpdateQROrderStatus,
} from '@/services/qr-orders/qr-orderApi'
import type { QROrder, QROrderFilters } from '@/services/qr-orders/interface'
import { adminToast } from './AdminToast'

export default function QROrdersList() {
  const [filters, setFilters] = useState<QROrderFilters>({})
  const { data: orders, isLoading, error, refetch } = useAdminQROrders(filters)
  const updateStatus = useUpdateQROrderStatus()

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus })
      adminToast.success(`Order status updated to ${newStatus}`)
    } catch (err) {
      adminToast.error('Failed to update order status')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-600">
        Error:{' '}
        {error instanceof Error ? error.message : 'Failed to load orders'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kit Orders</h2>
          <p className="mt-1 text-gray-500">
            {orders?.length || 0} total orders
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Order Status
            </label>
            <select
              value={filters.orderStatus || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  orderStatus: e.target.value || undefined,
                }))
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Status
            </label>
            <select
              value={filters.paymentStatus || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentStatus: e.target.value || undefined,
                }))
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
            >
              <option value="">All Payments</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {orders?.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Merchant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assigned Kits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map((order) => (
                <tr
                  key={order._id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {order.merchantId.businessName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.merchantId.fullPhoneNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-bold">
                    {order.quantity}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="max-w-xs truncate text-xs text-gray-600"
                      title={order.deliveryAddress}
                    >
                      {order.deliveryAddress}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {order.state}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.paymentStatus === 'SUCCESSFUL'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.paymentStatus === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.orderStatus}
                      disabled={updateStatus.isPending}
                      onChange={(e) =>
                        handleStatusUpdate(order._id, e.target.value)
                      }
                      className={`rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium focus:outline-none ${
                        order.orderStatus === 'COMPLETED'
                          ? 'text-emerald-700'
                          : order.orderStatus === 'CANCELLED'
                            ? 'text-red-700'
                            : 'text-gray-700'
                      }`}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {order.assignedKitIds?.map((kit) => (
                        <span
                          key={kit._id}
                          className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600"
                        >
                          {kit.serialNumber}
                        </span>
                      ))}
                      {(!order.assignedKitIds ||
                        order.assignedKitIds.length === 0) && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
