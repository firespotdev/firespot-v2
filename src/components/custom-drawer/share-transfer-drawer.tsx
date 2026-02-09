'use client'

import { Copy } from 'lucide-react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { showNotificationToast, TagFooter } from '@/components/ui'
import { getInitials } from '@/lib/utils'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface ShareTransferDrawerProps {
  businessName: string
  serialNumber: string
  profilePhotoUrl?: string
  closeDrawer: () => void
}

export function ShareTransferDrawer({
  businessName,
  serialNumber,
  profilePhotoUrl,
}: ShareTransferDrawerProps) {
  const shareUrl = `https://lite.firespot.co/pay/${serialNumber}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    showNotificationToast({ message: 'Link copied!' })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${businessName}`,
          text: `Transfer to ${businessName} using this link`,
          url: shareUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopy()
        }
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="flex flex-col items-center px-3 pt-2">
      <div
        className="rounded-[14.5px] p-1"
        style={{
          background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
        }}
      >
        <div className="bg-white p-4 rounded-[6.6px] relative">
          <QRCodeSVG
            value={shareUrl}
            size={150}
            level="H"
            fgColor="#FB5012"
            includeMargin={false}
          />

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full overflow-hidden border-[3px] shadow-lg border-white z-10 bg-white">
            {profilePhotoUrl ? (
              <Image
                src={profilePhotoUrl}
                alt="Business Logo"
                width={72}
                height={72}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="bg-[#FF6B35] w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {getInitials(businessName)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <span className="px-2 rounded-full border border-[#6B7280] text-sm leading-none py-1 font-medium text-[#6B7280] bg-white inline-block mt-6 mb-3">
        Pay4me
      </span>

      <h2 className="text-2xl leading-none font-bold text-black text-center mb-1 -tracking-[0.4px]">
        Share this transfer page
      </h2>

      <p className="text-sm text-[#00000080] font-medium text-center mb-6 max-w-70 leading-[1.3]">
        Can&apos;t pay now? Share this link for someone else to complete the
        transfer.
      </p>

      <div className="w-full flex items-center gap-2 bg-[#F1F1F1] rounded-xl p-2 mb-3">
        <p className="flex-1 text-sm text-[#6B7280] font-medium truncate">
          {shareUrl}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-sm font-semibold text-black bg-white rounded-[24px] shadow-[0px_2px_8px_0px_#00000014] py-2.5 px-4"
        >
          <Copy size={15} />
          <span className="text-[10px] font-bold">COPY</span>
        </button>
      </div>

      <Button className="w-full" onClick={handleShare}>
        Share transfer link
      </Button>

      <TagFooter />
    </div>
  )
}
