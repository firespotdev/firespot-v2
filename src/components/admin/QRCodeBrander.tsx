'use client'

import { useEffect } from 'react'
import { useQRKits, useQRCodeSVG, useQRBrandStore } from '@/services/qr'
import { useAdminLogout, getAdminInfo } from '@/services/admin'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'

export default function QRCodeBrander() {
  const logout = useAdminLogout()
  const adminInfo = getAdminInfo()

  const {
    selectedQRKit,
    brandedSvg,
    gradientStart,
    gradientEnd,
    logoUrl,
    logoSize,
    setSelectedQRKit,
    setOriginalSvg,
    setBrandedSvg,
  } = useQRBrandStore()

  // Fetch Kits list
  const {
    data: qrKitsData,
    isLoading: isLoadingList,
    error: qrKitsError,
  } = useQRKits({
    limit: 100,
  })

  // Fetch SVG when QRKit is selected
  const { data: svgData, isLoading: isLoadingSvg } = useQRCodeSVG(
    selectedQRKit?.qrCodeSvgUrl || undefined,
  )

  // Update original SVG when fetched
  useEffect(() => {
    if (svgData) {
      setOriginalSvg(svgData)
      // Auto-apply branding when SVG loads
      const branded = applyBrandingToSVG(
        svgData,
        gradientStart,
        gradientEnd,
        logoUrl,
        logoSize,
      )
      setBrandedSvg(branded)
    }
  }, [
    svgData,
    setOriginalSvg,
    setBrandedSvg,
    gradientStart,
    gradientEnd,
    logoUrl,
    logoSize,
  ])

  // Download branded SVG
  const handleDownload = () => {
    if (!brandedSvg) return

    const blob = new Blob([brandedSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${selectedQRKit?.serialNumber || 'branded'}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSelectQRKit = (qrKit: typeof selectedQRKit) => {
    setOriginalSvg(null)
    setBrandedSvg(null)
    setSelectedQRKit(qrKit)
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black">QR Code Brander</h1>
          {adminInfo && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {adminInfo.name} ({adminInfo.adminId})
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* QR Codes List */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Available QR Codes
            </h2>

            {isLoadingList && (
              <div className="text-sm text-gray-600">Loading QR codes...</div>
            )}

            {qrKitsError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                Error loading QR codes:{' '}
                {qrKitsError instanceof Error
                  ? qrKitsError.message
                  : 'Unknown error'}
              </div>
            )}

            {qrKitsData && qrKitsData.data.length === 0 && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-600">
                No QR codes found. Create some QR codes in the backend first.
              </div>
            )}

            <div className="space-y-2">
              {qrKitsData?.data?.map((qrKit) => (
                <button
                  key={qrKit._id}
                  onClick={() => handleSelectQRKit(qrKit)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedQRKit?._id === qrKit._id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {qrKit.serialNumber}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Status: {qrKit.activationStatus}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Preview
            </h2>

            {isLoadingSvg && selectedQRKit && (
              <div className="text-sm text-gray-600">Loading QR code...</div>
            )}

            {selectedQRKit && brandedSvg ? (
              <div className="rounded-lg bg-white p-8 shadow">
                <div className="flex justify-center">
                  <div
                    className="rounded-3xl p-[4px]"
                    style={{
                      background: `linear-gradient(134.65deg, ${gradientStart} 0.32%, ${gradientEnd} 100.3%)`,
                    }}
                  >
                    <div className="rounded-[1.2rem] bg-white p-4">
                      <div
                        dangerouslySetInnerHTML={{ __html: brandedSvg }}
                        className="h-[300px] w-[300px] [&>svg]:h-full [&>svg]:w-full"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-white transition-colors hover:bg-gray-800"
                >
                  Download Branded SVG
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                Select a QR code to see preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
