'use client'

import { useState, useEffect } from 'react'
import { useQRCodeSVG, useDownloadQRCodePNG } from '@/services/qr'
import type { QRKit } from '@/services/qr'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface QRKitDetailProps {
  qrKit: QRKit
  onClose: () => void
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
          return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case 'deactivated':
          return 'bg-gray-100 text-gray-700 border-gray-200'
        default:
          return 'bg-amber-100 text-amber-700 border-amber-200'
      }
    } else {
      switch (status) {
        case 'successful':
          return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case 'failed':
          return 'bg-red-100 text-red-700 border-red-200'
        default:
          return 'bg-amber-100 text-amber-700 border-amber-200'
      }
    }
  }

  return (
    <span
      className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium capitalize ${getStyles()}`}
    >
      {status}
    </span>
  )
}

export default function QRKitDetail({ qrKit, onClose }: QRKitDetailProps) {
  const { data: svgData, isLoading } = useQRCodeSVG(qrKit.qrCodeSvgUrl)
  const [brandedSvg, setBrandedSvg] = useState<string | null>(null)
  const downloadPNG = useDownloadQRCodePNG()

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

  const handleDownloadSVG = () => {
    if (!brandedSvg) return

    const blob = new Blob([brandedSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${qrKit.serialNumber}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPNG = () => {
    downloadPNG.mutate({ id: qrKit._id, serialNumber: qrKit.serialNumber })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100) // assuming amount is in kobo
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">QR Kit Details</h2>
            <p className="font-mono text-sm text-gray-500">
              {qrKit.serialNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
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

        <div className="p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* QR Code Preview */}
            <div className="flex flex-col items-center">
              {isLoading ? (
                <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-gray-100">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
                </div>
              ) : brandedSvg ? (
                <div
                  className="rounded-3xl p-[4px]"
                  style={{
                    background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                  }}
                >
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <div
                      dangerouslySetInnerHTML={{ __html: brandedSvg }}
                      className="h-56 w-56 [&>svg]:h-full [&>svg]:w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  No QR code available
                </div>
              )}

              {/* Download buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleDownloadSVG}
                  disabled={!brandedSvg}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                  SVG
                </button>
                <button
                  onClick={handleDownloadPNG}
                  disabled={downloadPNG.isPending}
                  className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadPNG.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Downloading...
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
                      PNG (Print Ready)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  <div>
                    <p className="mb-1 text-xs text-gray-400">Activation</p>
                    <StatusBadge
                      status={qrKit.activationStatus}
                      type="activation"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-400">Payment</p>
                    <StatusBadge status={qrKit.paymentStatus} type="payment" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs text-gray-400">Serial Number</dt>
                    <dd className="font-mono text-sm font-medium text-gray-900">
                      {qrKit.serialNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Activation Amount</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(qrKit.activationAmount)}
                    </dd>
                  </div>
                  {qrKit.merchantId && (
                    <div>
                      <dt className="text-xs text-gray-400">Merchant ID</dt>
                      <dd className="font-mono text-sm text-gray-900">
                        {qrKit.merchantId}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Timestamps
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs text-gray-400">Created</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(qrKit.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Last Updated</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(qrKit.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
