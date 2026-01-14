'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Share2,
  Check,
  Copy,
  Download,
  MapPin,
  Share,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/services/auth'
import { useUserQRKit, useQRCodeSVG } from '@/services/qr'
import { Button, LoaderCircle, Switch } from '@/components/ui'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'

// Brand gradient colors (same as admin dashboard)
const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

export default function QRKitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: qrKit, isLoading, error } = useUserQRKit(id)
  const { data: svgContent } = useQRCodeSVG(qrKit?.qrCodeSvgUrl)

  const [collectFeedback, setCollectFeedback] = useState(true)
  const [copied, setCopied] = useState(false)

  // Apply gradient branding to SVG
  const brandedSvg = useMemo(() => {
    if (!svgContent) return null
    return applyBrandingToSVG(svgContent, GRADIENT_START, GRADIENT_END, null, 0)
  }, [svgContent])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoaderCircle innerBg="#FFFFFF" />
      </div>
    )
  }

  if (error || !qrKit) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-satoshi">
        <header className="flex items-center py-4 px-4">
          <Link href="/qr-kits">
            <ArrowLeft className="w-6 h-6 text-black" />
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#00000080] font-medium text-sm">
            QR kit not found
          </p>
        </div>
      </div>
    )
  }

  const isActive = qrKit.activationStatus === 'activated'
  const shareUrl = `https://lite.firespot.co/${qrKit.serialNumber}`
  const displayId = qrKit.serialNumber.slice(-8)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Firespot QR Kit',
          text: 'Pay me with Firespot',
          url: shareUrl,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    } else {
      handleCopyUrl()
    }
  }

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log('Download PDF for:', qrKit._id)
  }

  const handleDeactivate = () => {
    // TODO: Implement deactivation
    console.log('Deactivate:', qrKit._id)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
        {/* Header */}
        <header className="flex flex-col items-center py-4 px-4">
          <div className="w-full flex items-center">
            <Link href="/qr-kits">
              <ArrowLeft className="w-6 h-6 text-black" />
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-base font-bold text-black">Main Address</h1>
              <p className="text-xs text-[#00000066] font-medium">
                Collecting payments
              </p>
            </div>
            <div className="w-6" />
          </div>
        </header>

        {/* QR Code Card with gradient border */}
        <div className="flex-1 pb-8">
          <div className="flex justify-center mb-6 px-4">
            <div
              className="rounded-3xl p-[4px]"
              style={{
                background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
              }}
            >
              <div className="rounded-[1.2rem] bg-white p-4">
                {brandedSvg ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: brandedSvg }}
                    className="h-56 w-56 [&>svg]:h-full [&>svg]:w-full"
                  />
                ) : qrKit.qrCodeSvgUrl ? (
                  <Image
                    src={qrKit.qrCodeSvgUrl}
                    alt="QR Code"
                    width={224}
                    height={224}
                    className="h-56 w-56"
                  />
                ) : (
                  <div className="h-56 w-56 bg-gray-100 flex items-center justify-center rounded-lg">
                    <p className="text-sm text-gray-400">No QR code</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="bg-white py-5 px-4">
          <div className="w-full">
            {/* Share URL */}
            <div className="flex items-center gap-2 border-b border-[#F1F1F1] pb-5">
              <div className="flex-1 min-w-0 border border-[#DFDFDF] rounded-[30px] px-4 py-2.5">
                <p className="text-sm text-[#6B7280] font-medium truncate leading-none">
                  {shareUrl}
                </p>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F1F1F1] rounded-[30px] shrink-0"
              >
                <Share className="w-4 h-4 text-black" />
                <span className="text-[10px] font-bold text-black tracking-[1px] whitespace-nowrap">
                  SHARE
                </span>
              </button>
            </div>

            {/* Info Rows */}
            <div className="space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-5 pt-5">
                <span className="text-sm font-medium text-[#00000080]">
                  Status
                </span>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <>
                      <Check className="w-4 h-4 text-[#34C759]" />
                      <span className="text-sm font-bold text-[#34C759]">
                        Active
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-[#FF3B30]">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Firespot QR ID */}
              <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-5">
                <span className="text-sm font-medium text-[#00000080]">
                  firespot QR ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black">
                    {displayId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qrKit.serialNumber)
                    }}
                    className="p-1"
                  >
                    <Copy className="w-4 h-4 text-[#00000066]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="my-5 bg-[#F0F7FF] rounded-[12px] px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0075FF] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <p className="text-sm text-[#00000080] font-medium">
                Download and print your QR kit to start receiving payments and
                connecting with your customers.
              </p>
            </div>

            <div className="flex items-center gap-2 border-t border-[#F1F1F1] pt-5">
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                className="w-[33%]"
              >
                Deactivate
              </Button>
              <Button
                variant="default"
                onClick={handleDownloadPDF}
                className="w-[65%] flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Download PDF version</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
