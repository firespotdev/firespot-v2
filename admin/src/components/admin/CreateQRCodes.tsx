'use client'

import { useState, useEffect } from 'react'
import {
  useCreateQRKit,
  useBulkCreateQRKits,
  useQRCodeSVG,
} from '@/services/qr'
import type { QRKit } from '@/services/qr'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'
import AgentSelect from './AgentSelect'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface QRPreviewProps {
  qrKit: QRKit
}

function QRPreview({ qrKit }: QRPreviewProps) {
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
      <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    )
  }

  if (!brandedSvg) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
        No QR
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-[3px]"
      style={{
        background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
      }}
    >
      <div className="rounded-[0.6rem] bg-white p-2">
        <div
          dangerouslySetInnerHTML={{ __html: brandedSvg }}
          className="h-20 w-20 [&>svg]:h-full [&>svg]:w-full"
        />
      </div>
    </div>
  )
}

export default function CreateQRCodes() {
  const [quantity, setQuantity] = useState(10)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [singleAgentId, setSingleAgentId] = useState<string | null>(null)
  const [createdQRKits, setCreatedQRKits] = useState<QRKit[]>([])

  const createSingle = useCreateQRKit()
  const createBulk = useBulkCreateQRKits()

  const handleCreateSingle = async () => {
    try {
      const qrKit = await createSingle.mutateAsync({
        agentId: singleAgentId || undefined,
      })
      setCreatedQRKits((prev) => [qrKit, ...prev])
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleCreateBulk = async () => {
    try {
      const qrKits = await createBulk.mutateAsync({
        quantity,
        agentId: selectedAgentId || undefined,
      })
      setCreatedQRKits((prev) => [...qrKits, ...prev])
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isCreating = createSingle.isPending || createBulk.isPending

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create QR Codes</h2>
        <p className="mt-1 text-gray-500">
          Generate new QR kits for distribution
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Single Creation */}
        <div className="rounded-[12px] border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-linear-to-br from-[#FB5012] to-[#D72483] p-3">
              <svg
                className="h-6 w-6 text-white"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Single QR Code
              </h3>
              <p className="text-sm text-gray-500">
                Create one QR kit at a time
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="single-agent"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Assign to Agent{' '}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <AgentSelect
              value={singleAgentId}
              onChange={setSingleAgentId}
              placeholder="Select an agent"
              className="rounded-xl py-3"
            />
            <p className="mt-1 text-xs text-gray-400">
              Agent assignment is optional
            </p>
          </div>

          <button
            onClick={handleCreateSingle}
            disabled={isCreating}
            className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createSingle.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </span>
            ) : (
              'Create Single QR Kit'
            )}
          </button>

          {createSingle.isError && (
            <p className="mt-3 text-sm text-red-600">
              {createSingle.error instanceof Error
                ? createSingle.error.message
                : 'Failed to create QR Kit'}
            </p>
          )}
        </div>

        <div className="rounded-[12px] border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-linear-to-br from-[#FB5012] to-[#D72483] p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bulk Creation
              </h3>
              <p className="text-sm text-gray-500">
                Create multiple QR kits (1-200)
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="agent"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Assign to Agent{' '}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <AgentSelect
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              placeholder="Select an agent"
              className="rounded-xl py-3"
            />
            <p className="mt-1 text-xs text-gray-400">
              Agent assignment is optional
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="quantity"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.min(200, Math.max(1, parseInt(e.target.value) || 1)),
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
            />
            <p className="mt-1 text-xs text-gray-400">
              Maximum 200 QR kits per batch
            </p>
          </div>

          <button
            onClick={handleCreateBulk}
            disabled={isCreating || quantity < 1 || quantity > 200}
            className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createBulk.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating {quantity} QR Kits...
              </span>
            ) : (
              `Create ${quantity} QR Kit${quantity > 1 ? 's' : ''}`
            )}
          </button>

          {createBulk.isError && (
            <p className="mt-3 text-sm text-red-600">
              {createBulk.error instanceof Error
                ? createBulk.error.message
                : 'Failed to create QR Kits'}
            </p>
          )}
        </div>
      </div>

      {/* Recently Created */}
      {createdQRKits.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recently Created ({createdQRKits.length})
            </h3>
            <button
              onClick={() => setCreatedQRKits([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {createdQRKits.slice(0, 20).map((qrKit) => (
              <div
                key={qrKit._id}
                className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-4"
              >
                <QRPreview qrKit={qrKit} />
                <p className="mt-3 text-sm font-medium text-gray-900">
                  {qrKit.serialNumber}
                </p>
                <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {qrKit.activationStatus}
                </span>
              </div>
            ))}
          </div>

          {createdQRKits.length > 20 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              And {createdQRKits.length - 20} more...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
