'use client'

import { ArrowLeft, ChevronRight, Link2, Mail, Share } from 'lucide-react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { useDrawerStore } from '@/services/drawer'
import { showNotificationToast } from '@/components/ui'
import { Copy } from 'lucide-react'
import { useMerchantReferralSummary } from '@/services/merchant-referrals'
import { cn } from '@/lib/utils'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface RecommendBusinessDrawerProps {
  businessName: string
  profilePhotoUrl?: string
  closeDrawer: () => void
}

function getRecommendUrl(referralCode?: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'https://firespot.co')
  const url = new URL('/onboarding/merchant/start', appUrl)

  if (referralCode) {
    url.searchParams.set('mref', referralCode)
  }

  return url.toString()
}

export function RecommendBusinessDrawer({
  businessName,
  closeDrawer,
}: RecommendBusinessDrawerProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: referral, isLoading } = useMerchantReferralSummary()
  const referralCode = referral?.referralCode
  const canRefer = Boolean(referral?.eligible && referralCode)
  const recommendUrl = getRecommendUrl(referralCode)

  const handleCopy = () => {
    if (!canRefer) return
    navigator.clipboard.writeText(recommendUrl)
    showNotificationToast({
      message: 'Recommendation link copied',
      mode: 'success',
    })
  }

  const handleShare = async () => {
    if (!canRefer) return
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
    if (!canRefer) return
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
        <button
          type="button"
          onClick={handleShare}
          disabled={!canRefer}
          aria-label="Share recommendation"
        >
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
            {canRefer ? (
              <QRCodeSVG
                value={recommendUrl}
                size={280}
                level="L"
                marginSize={0}
                fgColor="url(#recommend-business-qr-gradient)"
                className="h-auto w-full rounded-[14px]"
              />
            ) : (
              <div
                className={cn(
                  'aspect-square w-full rounded-[14px] bg-[#F4F6F8]',
                  isLoading && 'animate-pulse',
                )}
              />
            )}
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
            <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[10px] border border-[#F1F1F1] bg-white px-3 py-[7px]">
              <p className="whitespace-nowrap text-base font-bold leading-none">
                {referralCode || 'FSM-••••••'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!canRefer || !referralCode) return
                  navigator.clipboard.writeText(referralCode)
                  showNotificationToast({
                    message: 'Referral code copied',
                    mode: 'success',
                  })
                }}
                disabled={!canRefer}
                aria-label="Copy referral code"
              >
                <Copy size={16} color="#6B7280" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-xl font-bold text-black -tracking-[0.4px]">
            Know a business that needs this?
          </h2>
          <p className="mt-1.5 max-w-[360px] text-sm font-medium text-[#00000080]">
            Recommend businesses to firespot and earn after they collect
            ₦50,000 in confirmed payments.
          </p>
          {!isLoading && !referral?.eligible && (
            <p className="mt-2 max-w-[360px] text-xs font-medium text-[#F04438]">
              Complete verification and keep an active plan to use merchant
              referrals.
            </p>
          )}
        </div>

        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!canRefer}
            className={cn(
              'flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]',
              !canRefer && 'opacity-50',
            )}
          >
            <Link2 className="h-6 w-6 text-black" strokeWidth={2} />
            <span className="text-sm font-medium text-black">Copy link</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canRefer}
            className={cn(
              'flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]',
              !canRefer && 'opacity-50',
            )}
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
            disabled={!canRefer}
            className={cn(
              'flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-3.5 shadow-[0px_4px_8px_0px_#0000000A]',
              !canRefer && 'opacity-50',
            )}
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
