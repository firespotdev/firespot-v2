'use client'

import { useState } from 'react'
import { useAgents } from '@/services/agents'
import type { Agent, AgentFilters } from '@/services/agents'
import { NIGERIAN_STATES, STATE_LGA_MAP } from '@/lib/utils/nigerian-states-lgas'

function StatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700'
      case 'suspended':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
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

interface AgentsListProps {
  onSelectAgent?: (agent: Agent) => void
  onCreateAgent?: () => void
}

export default function AgentsList({
  onSelectAgent,
  onCreateAgent,
}: AgentsListProps) {
  const [filters, setFilters] = useState<AgentFilters>({
    page: 1,
    limit: 20,
  })
  const [searchInput, setSearchInput] = useState('')
  const [selectedState, setSelectedState] = useState('')

  // Get LGAs for selected state
  const availableLGAs = selectedState ? STATE_LGA_MAP[selectedState] || [] : []

  const { data, isLoading, error, refetch } = useAgents(filters)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      page: 1,
    }))
  }

  const handleFilterChange = (
    key: keyof AgentFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }))
    // Clear LGA filter when state changes
    if (key === 'state') {
      setSelectedState(value || '')
      setFilters((prev) => ({ ...prev, lga: undefined, page: 1 }))
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
          <p className="mt-1 text-gray-500">
            {data?.pagination.total || 0} total agents
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
          {onCreateAgent && (
            <button
              onClick={onCreateAgent}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Agent
            </button>
          )}
        </div>
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
                placeholder="Name, phone, or agent ID..."
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
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* State Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              State
            </label>
            <div className="relative">
              <select
                value={filters.state || ''}
                onChange={(e) => {
                  handleFilterChange('state', e.target.value)
                  setSelectedState(e.target.value)
                }}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              >
                <option value="">All States</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* LGA Filter */}
          {filters.state && (
            <div className="w-full lg:w-48">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                LGA
              </label>
              <div className="relative">
                <select
                  value={filters.lga || ''}
                  onChange={(e) => handleFilterChange('lga', e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
                >
                  <option value="">All LGAs</option>
                  {availableLGAs.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {(filters.status || filters.state || filters.lga || filters.search) && (
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20 })
                setSearchInput('')
                setSelectedState('')
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
          {error instanceof Error ? error.message : 'Failed to load agents'}
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-gray-500">
            {filters.search || filters.status || filters.state || filters.lga
              ? 'Try adjusting your filters'
              : 'Add some agents to get started'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Agent ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((agent) => (
                <tr
                  key={agent._id}
                  onClick={() => onSelectAgent?.(agent)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {agent.agentId}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{agent.name}</span>
                      {agent.subaccountCode && (
                        <span title="Bank details verified with Paystack">
                          <svg
                            className="h-3.5 w-3.5 text-blue-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {agent.phoneNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {agent.state || agent.lga || agent.bustop ? (
                      <div className="space-y-0.5">
                        {agent.state && <div>{agent.state}</div>}
                        {agent.lga && (
                          <div className="text-xs text-gray-400">{agent.lga}</div>
                        )}
                        {agent.bustop && (
                          <div className="text-xs text-gray-400">
                            {agent.bustop}
                          </div>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(agent.createdAt).toLocaleDateString()}
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
