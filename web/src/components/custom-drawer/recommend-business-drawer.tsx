'use client'

import { ArrowLeft, ChevronRight, Link2, Mail, Share } from 'lucide-react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { useDrawerStore } from '@/services/drawer'
import { showNotificationToast } from '@/components/ui'
import { Copy } from 'lucide-react'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface RecommendBusinessDrawerProps {
  businessName: string
  serialNumber?: string
  profilePhotoUrl?: string
  closeDrawer: () => void
}

function getRecommendUrl(serialNumber?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  const url = new URL('/onboarding/merchant/start', appUrl)

  if (serialNumber) {
    url.searchParams.set('serial', serialNumber)
  }

  return url.toString()
}

export function RecommendBusinessDrawer({
  businessName,
  serialNumber,
  closeDrawer,
}: RecommendBusinessDrawerProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const recommendUrl = getRecommendUrl(serialNumber)

  const handleCopy = () => {
    navigator.clipboard.writeText(recommendUrl)
    showNotificationToast({
      message: 'Recommendation link copied',
      mode: 'success',
    })
  }

  const handleShare = async () => {
    if (!navigator.share) {
      handleCopy()
      return
    }

    try {
      await navigator.share({
        title: 'Join Firespot',
        text: `${businessName} recommends Firespot for your business.`,
        url: recommendUrl,
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        handleCopy()
      }
    }
  }

  const handleSendSms = () => {
    openDrawer({
      type: 'recommend-business-sms',
      props: {
        recommendUrl,
        businessName,
      },
    })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-125 flex-col bg-[#F4F6F8] px-4">
      <header className="flex justify-between items-center py-3.5">
        <button type="button" onClick={closeDrawer} aria-label="Back">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className="text-center text-base font-bold text-black">
          Recommend to a business
        </h1>
        <button type="button" onClick={handleShare} aria-label="Back">
          <Share size={24} strokeWidth={2} />
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-[280px] rounded-[28px] bg-linear-to-br from-[#FB5012] to-[#D72483] p-1">
          <div className="relative rounded-[24px] bg-white p-4">
            <svg aria-hidden className="absolute h-0 w-0">
              <defs>
                <linearGradient
                  id="recommend-business-qr-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={GRADIENT_START} />
                  <stop offset="100%" stopColor={GRADIENT_END} />
                </linearGradient>
              </defs>
            </svg>
            <QRCodeSVG
              value={recommendUrl}
              size={280}
              level="L"
              marginSize={0}
              fgColor="url(#recommend-business-qr-gradient)"
              className="h-auto w-full rounded-[14px]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="flex h-[96px] w-[96px] items-center justify-center overflow-hidden">
                  <Image
                    src="/images/recommend.png"
                    alt="Profile"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="absolute bottom-14 -translate-x-1/2 left-1/2 flex gap-2 items-center border border-[#F1F1F1] bg-white rounded-[10px] py-[7px] px-3">
              <p className="font-bold text-base leading-none">FGH34</p>
              <Copy size={16} color="#6B7280" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-xl font-bold text-black -tracking-[0.4px]">
            Know a business that needs this?
          </h2>
          <p className="mt-1.5 max-w-[360px] text-sm font-medium text-[#00000080]">
            Recommend businesses to firespot and earn when they become paying
            users.
          </p>
        </div>

        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]"
          >
            <Link2 className="h-6 w-6 text-black" strokeWidth={2} />
            <span className="text-sm font-medium text-black">Copy link</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]"
          >
            <Image
              src="/icons/whatsapp.svg"
              alt="whatsapp logo"
              width={24}
              height={24}
            />
            <span className="text-sm font-medium text-[#24C166]">Whatsapp</span>
          </button>
          <button
            type="button"
            onClick={handleSendSms}
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]"
          >
            <Mail className="h-6 w-6 text-black" strokeWidth={2} />
            <span className="text-sm font-medium text-black">Send SMS</span>
          </button>
        </div>

        <button
          type="button"
          className="mt-6 flex items-center gap-0.5 underline underline-offset-4 text-xs font-medium text-black"
        >
          <span>Earn money distributing QR kits</span>
          <ChevronRight className="h-4 w-4 mt-1" strokeWidth={2} />
        </button>
      </main>
    </div>
  )
}
