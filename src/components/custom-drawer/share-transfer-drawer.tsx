'use client'

import { Copy, X } from 'lucide-react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { showNotificationToast, TagFooter } from '@/components/ui'
import { getInitials } from '@/lib/utils'
import { useRef, useEffect } from 'react'

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
  closeDrawer,
}: ShareTransferDrawerProps) {
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${serialNumber}`

  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    // Inject gradient defs into the SVG
    const ns = 'http://www.w3.org/2000/svg'
    const existing = svg.querySelector('#qr-gradient')
    if (existing) return

    const defs = document.createElementNS(ns, 'defs')
    const gradient = document.createElementNS(ns, 'linearGradient')
    gradient.setAttribute('id', 'qr-gradient')
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', '100%')
    gradient.setAttribute('y2', '100%')

    const stop1 = document.createElementNS(ns, 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', GRADIENT_START)
    const stop2 = document.createElementNS(ns, 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', GRADIENT_END)

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
    svg.insertBefore(defs, svg.firstChild)

    // Replace all non-white fills with the gradient
    svg.querySelectorAll('path, rect').forEach((el) => {
      const fill = el.getAttribute('fill')
      if (fill && fill.toLowerCase() !== '#ffffff' && fill !== 'white') {
        el.setAttribute('fill', 'url(#qr-gradient)')
      }
    })
  }, [shareUrl])

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
    <div className="flex flex-col items-center px-4 pb-6 pt-3">
      <div className="w-full flex items-center justify-between border-b border-[#F1F1F1] pb-3">
        <div className="w-9 h-9" />
        <span className="border border-black rounded-full text-base leading-none -tracking-[0.4px] font-medium py-1 px-2.5">
          Pay4me
        </span>
        <button
          type="button"
          onClick={closeDrawer}
          className="w-9 h-9 flex items-center justify-center"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </div>
      <div className="px-12 w-full py-6">
        <div
          className="rounded-[24px] p-1 w-full max-w-[280px] mx-auto aspect-square"
          style={{
            background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
          }}
        >
          <div className="bg-white p-4 rounded-[21px] relative">
            <div ref={qrRef} className="rounded-[10px] overflow-hidden">
              <QRCodeSVG
                value={shareUrl}
                size={240}
                level="H"
                fgColor="#000000"
                includeMargin={false}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative w-24 h-24">
                <div className="w-full h-full rounded-full overflow-hidden border-4 shadow-lg border-white bg-white">
                  {profilePhotoUrl ? (
                    <Image
                      src={profilePhotoUrl}
                      alt="Business Logo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-[#FF6B35] w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {getInitials(businessName)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 border-4 border-white rounded-[10.5px]">
                  <Image
                    src="/images/firespot_logo.png"
                    alt="Firespot Logo"
                    width={24}
                    height={24}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl leading-none font-bold text-black text-center mb-1 -tracking-[0.4px]">
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
    </div>
  )
}
