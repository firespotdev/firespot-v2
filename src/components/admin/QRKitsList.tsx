'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQRKits, useQRCodeSVG, useDeleteQRKit, qrKitsApi } from '@/services/qr'
import type { QRKit, QRKitFilters } from '@/services/qr'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'
import { generatePDFBlob, downloadQRKitsAsZip } from '@/lib/utils/batch-pdf-download'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import AgentSelect from './AgentSelect'
import QRKitCard from './QRKitCard'
import { adminToast } from './AdminToast'

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
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  
  // Selection state for batch download
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const cardRenderRef = useRef<HTMLDivElement>(null)
  const [renderingCard, setRenderingCard] = useState<{ brandedSvg: string; serialNumber: string } | null>(null)

  const { data, isLoading, error, refetch } = useQRKits(filters)
  const deleteQRKit = useDeleteQRKit()
  const [deleteTarget, setDeleteTarget] = useState<QRKit | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      page: 1,
    }))
  }

  const handleActivationStatusChange = (value: string) => {
    if (value === 'unassigned') {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        unassigned: true,
        agentId: undefined,
        page: 1,
      }))
      setAgentFilter(null)
      setUnassignedOnly(true)
    } else {
      setFilters((prev) => ({
        ...prev,
        status: value || undefined,
        unassigned: undefined,
        page: 1,
      }))
      setUnassignedOnly(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  const handleDelete = (e: React.MouseEvent, qrKit: QRKit) => {
    e.stopPropagation() // Prevent row click
    setDeleteTarget(qrKit)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteQRKit.mutate(deleteTarget._id)
      setDeleteTarget(null)
    }
  }

  const handleRowClick = (qrKit: QRKit) => {
    onSelectQRKit?.(qrKit)
  }

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data?.data) {
      setSelectedIds(new Set(data.data.map((qr) => qr._id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation()
    const newSet = new Set(selectedIds)
    if (e.target.checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filters])

  // Batch download handler
  const handleBatchDownload = useCallback(async () => {
    if (selectedIds.size === 0 || !data?.data) return

    setIsDownloadingZip(true)
    const selectedQRKits = data.data.filter((qr) => selectedIds.has(qr._id))
    setDownloadProgress({ current: 0, total: selectedQRKits.length })

    try {
      console.log(`Starting batch download for ${selectedQRKits.length} kits`)
      const pdfDataList: { serialNumber: string; pdfBlob: Blob }[] = []

      for (let i = 0; i < selectedQRKits.length; i++) {
        const qrKit = selectedQRKits[i]
        console.log(`Processing ${i + 1}/${selectedQRKits.length}: ${qrKit.serialNumber}`)
        setDownloadProgress({ current: i + 1, total: selectedQRKits.length })

        // Fetch SVG data
        const svgData = await qrKitsApi.fetchQRCodeSVG(qrKit.qrCodeSvgUrl || '')
        if (!svgData) {
          console.warn(`No SVG data for kit ${qrKit.serialNumber}`)
          continue
        }

        const brandedSvg = applyBrandingToSVG(svgData, GRADIENT_START, GRADIENT_END, null, 20)

        // Render the card
        setRenderingCard({ brandedSvg, serialNumber: qrKit.serialNumber })

        // Wait for render and ensure ref is populated
        let count = 0
        while (!cardRenderRef.current && count < 20) {
          await new Promise((resolve) => setTimeout(resolve, 50))
          count++
        }

        // Generate PDF blob
        if (cardRenderRef.current) {
          console.log(`Generating PDF for ${qrKit.serialNumber}`)
          try {
            const pdfBlob = await generatePDFBlob(cardRenderRef.current, {
              scale: 3,
              backgroundColor: '#000000',
            })
            pdfDataList.push({ serialNumber: qrKit.serialNumber, pdfBlob })
          } catch (pdfErr) {
            console.error(`Failed to generate PDF for ${qrKit.serialNumber}:`, pdfErr)
            adminToast.error(`Failed to generate PDF for ${qrKit.serialNumber}`)
          }
        } else {
          console.error(`Failed to find cardRenderRef for serial ${qrKit.serialNumber}`)
        }
      }

      // Clear rendering card
      setRenderingCard(null)

      if (pdfDataList.length === 0) {
        throw new Error('No PDFs were generated successfully')
      }

      // Download as ZIP
      console.log('Bundling ZIP...')
      await downloadQRKitsAsZip(pdfDataList, `firespot-qr-kits-${Date.now()}.zip`)
      adminToast.success(`Downloaded ${pdfDataList.length} QR kits as ZIP`)
      clearSelection()
    } catch (error) {
      console.error('Batch download failed:', error)
      adminToast.error(error instanceof Error ? error.message : 'Failed to download QR kits')
    } finally {
      setIsDownloadingZip(false)
      setRenderingCard(null)
      setDownloadProgress({ current: 0, total: 0 })
    }
  }, [selectedIds, data?.data])

  const isAllSelected = data?.data && data.data.length > 0 && data.data.every((qr) => selectedIds.has(qr._id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QR Kits</h2>
          <p className="mt-1 text-gray-500">
            {(data?.pagination.total || 0).toLocaleString('en-NG')} total QR kits
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

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-black px-4 py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} QR kit{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-400 hover:text-white underline underline-offset-4"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={handleBatchDownload}
            disabled={isDownloadingZip}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            {isDownloadingZip ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                <span>
                  Downloading {downloadProgress.current}/{downloadProgress.total}...
                </span>
              </>
            ) : (
              <>
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
                <span>Download as PDF (ZIP)</span>
              </>
            )}
          </button>
        </div>
      )}

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
            <div className="relative">
              <select
                value={unassignedOnly ? 'unassigned' : filters.status || ''}
                onChange={(e) => handleActivationStatusChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="pending">Pending</option>
                <option value="activated">Activated</option>
                <option value="deactivated">Deactivated</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Status
            </label>
            <div className="relative">
              <select
                value={filters.paymentStatus || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, paymentStatus: e.target.value || undefined, page: 1 }))
                }
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Agent Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Agent
            </label>
            <AgentSelect
              value={agentFilter}
              onChange={(agentId) => {
                setAgentFilter(agentId)
                setUnassignedOnly(false)
                setFilters((prev) => ({
                  ...prev,
                  agentId: agentId || undefined,
                  unassigned: undefined,
                  page: 1,
                }))
              }}
              placeholder="All agents"
              disabled={unassignedOnly}
            />
          </div>

          {/* Clear Filters */}
          {(filters.status || filters.paymentStatus || filters.search || filters.agentId || filters.unassigned) && (
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20 })
                setSearchInput('')
                setAgentFilter(null)
                setUnassignedOnly(false)
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
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                </th>
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
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
               
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((qrKit) => (
                <tr
                  key={qrKit._id}
                  onClick={() => handleRowClick(qrKit)}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedIds.has(qrKit._id) ? 'bg-orange-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(qrKit._id)}
                      onChange={(e) => handleSelectOne(e, qrKit._id)}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <QRPreviewSmall qrKit={qrKit} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {qrKit.serialNumber}
                    </span>
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {qrKit.agentId ? (
                      typeof qrKit.agentId === 'string' ? (
                        <span className="text-gray-500 font-mono text-xs">
                          {qrKit.agentId}
                        </span>
                      ) : (
                        <div>
                          <p className="font-medium text-gray-900">
                            {qrKit.agentId.name}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {qrKit.agentId.agentId}
                          </p>
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(qrKit.createdAt).toLocaleDateString()}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete QR Kit"
        description={`Are you sure you want to delete QR kit ${deleteTarget?.serialNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        isLoading={deleteQRKit.isPending}
      />

      {/* Hidden card render area for PDF generation */}
      <div 
        className="pointer-events-none fixed -left-[5000px] top-0 overflow-hidden" 
        style={{ width: '400px', height: '600px', opacity: 0.01 }}
      >
        {renderingCard && (
          <QRKitCard
            ref={cardRenderRef}
            brandedSvg={renderingCard.brandedSvg}
          />
        )}
      </div>
    </div>
  )
}
