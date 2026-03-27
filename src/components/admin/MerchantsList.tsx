'use client'

import { useState } from 'react'
import { useMerchants } from '@/services/merchants'
import type { Merchant, MerchantFilters } from '@/services/merchants'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

interface MerchantsListProps {
  onSelectMerchant?: (merchant: Merchant) => void
}

export default function MerchantsList({
  onSelectMerchant,
}: MerchantsListProps) {
  const [filters, setFilters] = useState<MerchantFilters>({
    page: 1,
    limit: 20,
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, error, refetch } = useMerchants(filters)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      page: 1,
    }))
  }

  const handleFilterChange = (
    key: keyof MerchantFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Merchants</h2>
          <p className="mt-1 text-gray-500">
            {data?.pagination.total || 0} total merchants
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

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
                placeholder="Business name, phone, or slug..."
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

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="relative">
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'status',
                    e.target.value as 'active' | 'inactive' | undefined,
                  )
                }
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.status || filters.search) && (
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
              className="h-16 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-red-600">
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to load merchants'}
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No merchants found
          </h3>
          <p className="mt-1 text-gray-500">
            {filters.search || filters.status
              ? 'Try adjusting your filters'
              : 'No merchants registered yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Bank Accounts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((merchant) => (
                <tr
                  key={merchant._id}
                  onClick={() => onSelectMerchant?.(merchant)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      {merchant.profilePhotoUrl ? (
                        <img
                          src={merchant.profilePhotoUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                          {merchant.businessName?.charAt(0) || 'M'}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {merchant.businessName || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {merchant.fullPhoneNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {merchant.merchantSlug ? (
                      <span className="font-mono text-sm text-gray-900">
                        {merchant.merchantSlug}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {merchant.bankAccounts?.length || 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge isActive={merchant.isActive} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(merchant.createdAt).toLocaleDateString()}
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
