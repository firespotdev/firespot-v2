'use client'

import { useState, useEffect } from 'react'
import { useQRKits, useQRCodeSVG, useDownloadQRCodePNG } from '@/services/qr'
import type { QRKit, QRKitFilters } from '@/services/qr'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface QRPreviewSmallProps {
  qrKit: QRKit
}

function QRPreviewSmall({ qrKit }: QRPreviewSmallProps) {
  const { data: svgData, isLoading } = useQRCodeSVG(qrKit.qrCodeSvgUrl)
  const [brandedSvg, setBrandedSvg] = useState<string | null>(null)

  useEffect(() => {
    if (svgData) {
      const branded = applyBrandingToSVG(
        svgData,
        GRADIENT_START,
        GRADIENT_END,
        null,
        20,
      )
      setBrandedSvg(branded)
    }
  }, [svgData])

  if (isLoading) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    )
  }

  if (!brandedSvg) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
        —
      </div>
    )
  }

  return (
    <div
      className="w-fit rounded-lg p-[2px]"
      style={{
        background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
      }}
    >
      <div className="rounded-[0.4rem] bg-white p-1">
        <div
          dangerouslySetInnerHTML={{ __html: brandedSvg }}
          className="h-10 w-10 [&>svg]:h-full [&>svg]:w-full"
        />
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  type,
}: {
  status: string
  type: 'activation' | 'payment'
}) {
  const getStyles = () => {
    if (type === 'activation') {
      switch (status) {
        case 'activated':
          return 'bg-emerald-100 text-emerald-700'
        case 'deactivated':
          return 'bg-gray-100 text-gray-700'
        default:
          return 'bg-amber-100 text-amber-700'
      }
    } else {
      switch (status) {
        case 'successful':
          return 'bg-emerald-100 text-emerald-700'
        case 'failed':
          return 'bg-red-100 text-red-700'
        default:
          return 'bg-amber-100 text-amber-700'
      }
    }
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStyles()}`}
    >
      {status}
    </span>
  )
}

interface QRKitsListProps {
  onSelectQRKit?: (qrKit: QRKit) => void
}

export default function QRKitsList({ onSelectQRKit }: QRKitsListProps) {
  const [filters, setFilters] = useState<QRKitFilters>({
    page: 1,
    limit: 20,
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, error, refetch } = useQRKits(filters)
  const downloadPNG = useDownloadQRCodePNG()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      page: 1,
    }))
  }

  const handleFilterChange = (
    key: keyof QRKitFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  const handleDownloadPNG = (qrKit: QRKit) => {
    downloadPNG.mutate({ id: qrKit._id, serialNumber: qrKit.serialNumber })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QR Kits</h2>
          <p className="mt-1 text-gray-500">
            {data?.pagination.total || 0} total QR kits
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Serial number..."
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              />
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Search
              </button>
            </div>
          </form>

          {/* Activation Status Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Activation Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="activated">Activated</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Status
            </label>
            <select
              value={filters.paymentStatus || ''}
              onChange={(e) =>
                handleFilterChange('paymentStatus', e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(filters.status || filters.paymentStatus || filters.search) && (
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20 })
                setSearchInput('')
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-red-600">
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to load QR kits'}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No QR kits found
          </h3>
          <p className="mt-1 text-gray-500">
            {filters.search || filters.status || filters.paymentStatus
              ? 'Try adjusting your filters'
              : 'Create some QR kits to get started'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  QR Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Serial Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Activation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((qrKit) => (
                <tr
                  key={qrKit._id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <QRPreviewSmall qrKit={qrKit} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      onClick={() => onSelectQRKit?.(qrKit)}
                      className="font-mono text-sm font-medium text-gray-900 hover:text-[#FB5012]"
                    >
                      {qrKit.serialNumber}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      status={qrKit.activationStatus}
                      type="activation"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={qrKit.paymentStatus} type="payment" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(qrKit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectQRKit?.(qrKit)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="View details"
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadPNG(qrKit)}
                        disabled={downloadPNG.isPending}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                        title="Download PNG"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
            {Math.min(
              data.pagination.page * data.pagination.limit,
              data.pagination.total,
            )}{' '}
            of {data.pagination.total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(data.pagination.page - 1)}
              disabled={data.pagination.page === 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(data.pagination.page + 1)}
              disabled={data.pagination.page === data.pagination.totalPages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
