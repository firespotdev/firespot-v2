'use client'

import {
  X,
  ChevronRight,
  Headphones,
  Clock,
  Share,
  Copy,
  Maximize2,
  AudioLines,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { useUserQRKits } from '@/services/qr'
import { useUserProfile } from '@/services/users'
import { useSalesStats } from '@/services/sales/hooks'
import { showNotificationToast, Switch } from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { cn } from '@/lib/utils'

interface ProfileMenuDrawerProps {
  closeDrawer: () => void
}

export function ProfileMenuDrawer({ closeDrawer }: ProfileMenuDrawerProps) {
  const { data: profile } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()
  const logout = useAuthStore((state) => state.logout)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: salesStats } = useSalesStats()
  const [soundEnabled, setSoundEnabled] = usePreference('soundEnabled', true)

  const pendingSalesCount = salesStats?.pendingSalesCount || 0

  const businessName = profile?.businessName || 'Your Business'
  const initials = businessName
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleBankAccountsClick = () => {
    closeDrawer()
    setTimeout(() => {
      openDrawer({
        type: 'bank-accounts',
        props: { bankAccounts: profile?.bankAccounts || [] },
      })
    }, 300)
  }

  const handleSignOut = () => {
    closeDrawer()
    logout()
    window.location.href = '/'
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${qrKitsData?.data?.[0]?.serialNumber || 'profile'}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    showNotificationToast({ message: 'Link copied to clipboard' })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text: `Check out ${businessName} on Firespot Lite!`,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="h-full flex flex-col font-satoshi overflow-y-auto bg-[#F4F6F8]">
      <header className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/images/lite_logo.png"
            alt="firespot logo"
            width={24}
            height={24}
          />
          <Image
            src="/images/lite_alt.png"
            alt="firespot logo"
            width={89}
            height={24}
          />
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          className="flex items-center justify-center"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </header>

      <div className="px-4 mb-3">
        <Link
          href="/profile"
          onClick={closeDrawer}
          className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[0px_4px_8px_0px_#0000000A]"
        >
          <div className="w-12 h-12 rounded-full bg-[#ced7e1] flex items-center justify-center">
            {profile?.profilePhotoUrl ? (
              <Image
                src={profile.profilePhotoUrl}
                alt="Profile"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <Image
                src="/icons/store_solid.svg"
                alt="store icon"
                width={32}
                height={32}
              />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-black">{businessName}</p>
            <div className="flex items-center">
              <p className="text-xs text-[#00000066] font-medium">
                {profile?.bankAccounts?.length || 0} linked bank accounts .{' '}
                {qrKitsData?.pagination?.total || 0} QR kits
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
        </Link>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-white rounded-[12px] p-4 shadow-[0px_4px_8px_0px_#0000000A] flex items-center gap-4 relative overflow-hidden">
          <div className="flex-1 z-10">
            <h3 className="text-[16px] font-bold text-black mb-1">
              Share your FS profile
            </h3>
            <p className="text-[13px] text-[#00000080] font-medium mb-4">
              Share across platforms or copy the link and share directly.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-[#F4F6F8] flex items-center justify-center text-black border border-white/50 active:scale-95 transition-transform"
              >
                <Share className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className="w-9 h-9 rounded-full bg-[#F4F6F8] flex items-center justify-center text-black border border-white/50 active:scale-95 transition-transform"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  closeDrawer()
                  openDrawer({
                    type: 'profile-share',
                    props: {
                      businessName,
                      profilePhotoUrl: profile?.profilePhotoUrl,
                      serialNumber: qrKitsData?.data?.[0]?.serialNumber,
                    },
                  })
                }}
                className="w-9 h-9 rounded-full bg-[#F4F6F8] flex items-center justify-center text-black border border-white/50 active:scale-95 transition-transform"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QR Code with Gradient Border */}
          <div className="shrink-0 w-[128px] h-[128px] rounded-[6px] bg-linear-to-br from-[#FB5012] to-[#D72483] p-[1.5px] flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[6px] flex items-center justify-center relative">
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient
                    id="qr-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FB5012" />
                    <stop offset="100%" stopColor="#D72483" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative bg-white rounded-[10px]">
                <QRCodeSVG
                  value={shareUrl}
                  size={112}
                  level="H"
                  marginSize={0}
                  fgColor="url(#qr-gradient)"
                  imageSettings={{
                    src:
                      profile?.profilePhotoUrl || '/images/default_avatar.png',
                    x: undefined,
                    y: undefined,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className="w-[48px] h-[48px] rounded-full border-2 border-white bg-[#ced7e1] overflow-hidden shadow-sm flex justify-center items-center">
                      {profile?.profilePhotoUrl ? (
                        <Image
                          src={profile.profilePhotoUrl}
                          alt="Profile"
                          width={30}
                          height={30}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src="/icons/store_solid.svg"
                          alt="store icon"
                          width={30}
                          height={30}
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-[5.5px] bg-white border-2 border-[#F4F6F8]">
                      <Image
                        src="/images/firespot_logo.png"
                        alt="logo"
                        width={18}
                        height={18}
                        className="w-full h-full object-contain rounded-[4px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {salesStats?.pendingSalesCount && salesStats?.pendingSalesCount > 0 ? (
        <div className="px-4 mb-3">
          <Link
            href="/recents"
            onClick={closeDrawer}
            className="w-full flex items-center gap-3 py-3 px-4 bg-white rounded-2xl shadow-[0px_2px_8px_0px_#0000000A] border-[3px] border-[#BB81234D]"
          >
            <Image
              src="/icons/history_brown.svg"
              alt="Recent"
              width={24}
              height={24}
            />
            <div className="flex-1">
              <p className="leading-none text-left text-base font-medium text-[#6B4200]">
                Recent sales
              </p>
              <span className="text-[13px] text-[#BB8123] font-medium">
                {pendingSalesCount} pending confirmations
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </Link>
        </div>
      ) : null}

      {/* Menu Sections */}
      <div className="flex-1 px-4 space-y-3">
        {/* Section 1: Main navigation */}
        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
          <Link
            href="/record-sale"
            onClick={closeDrawer}
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                stroke="#000000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 22h6c5 0 7-2 7-7V9c0-5-2-7-7-7H9C4 2 2 4 2 9v6c0 5 2 7 7 7z"
              ></path>
              <path
                stroke="#000000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 11.51l3 3 3-3M12 14.51v-8M6 16.51c3.89 1.3 8.11 1.3 12 0"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-black">
              Record a sale
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </Link>

          <Link
            href="/history"
            onClick={closeDrawer}
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <Clock size={24} strokeWidth={1.5} color="#000000" />
            <span className="flex-1 text-left text-base font-medium text-black">
              History
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </Link>

          <Link
            href="/insights"
            onClick={closeDrawer}
            className="w-full flex items-center gap-3 py-3.5 px-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18.32 12c2.6 0 3.68-1 2.72-4.28-.65-2.21-2.55-4.11-4.76-4.76C13 2 12 3.08 12 5.68v2.88C12 11 13 12 15 12h3.32Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M20 14.7a9.091 9.091 0 0 1-10.42 7.17c-3.79-.61-6.84-3.66-7.46-7.45A9.1 9.1 0 0 1 9.26 4.01"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-black">
              Insights
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
          <button
            type="button"
            onClick={handleBankAccountsClick}
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="m12.37 2.15 9 3.6c.35.14.63.56.63.93V10c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V6.68c0-.37.28-.79.63-.93l9-3.6c.2-.08.54-.08.74 0ZM22 22H2v-3c0-.55.45-1 1-1h18c.55 0 1 .45 1 1v3ZM4 18v-7M8 18v-7M12 18v-7M16 18v-7M20 18v-7M1 22h22"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-black">
              Bank accounts
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </button>

          <Link
            href="/qr-kits"
            onClick={closeDrawer}
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2 9V6.5C2 4.01 4.01 2 6.5 2H9M15 2h2.5C19.99 2 22 4.01 22 6.5V9M22 16v1.5c0 2.49-2.01 4.5-4.5 4.5H16M9 22H6.5C4.01 22 2 19.99 2 17.5V15M17 9.5v5c0 2-1 3-3 3h-4c-2 0-3-1-3-3v-5c0-2 1-3 3-3h4c2 0 3 1 3 3ZM19 12H5"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-black">
              QR kits
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 py-2.5 px-4 border-b border-[#F1F1F1]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2 10v4c0 2 1 3 3 3h1.43c.37 0 .74.11 1.06.3l2.92 1.83c2.52 1.58 4.59.43 4.59-2.54V7.41c0-2.98-2.07-4.12-4.59-2.54L7.49 6.7c-.32.19-.69.3-1.06.3H5c-2 0-3 1-3 3Z"
                stroke="#000000"
                strokeWidth="1.5"
              ></path>
              <path
                d="M18 8a6.66 6.66 0 0 1 0 8M19.83 5.5a10.83 10.83 0 0 1 0 13"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-black">
              Play sound for pending sales
            </span>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </button>
        </div>

        {/* Section 2: Support */}
        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <Headphones className="w-6 h-6 text-black" />
            <span className="flex-1 text-left text-base font-medium text-black">
              Talk to support
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/images/lite_logo.png"
                alt="Firespot"
                width={24}
                height={24}
              />
              <span className="flex-1 text-left text-base font-medium text-black">
                About Firespot
              </span>
              <Image
                src="/icons/lite.png"
                alt="Firespot"
                width={24}
                height={24}
              />
            </div>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 py-3.5 px-4"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/icons/firespot_logo.svg"
                alt="Firespot"
                width={24}
                height={24}
              />
              <span className="flex-1 text-left text-base font-medium text-black">
                Firespot Business
              </span>
              <Image
                src="/icons/pro.png"
                alt="Firespot"
                width={24}
                height={24}
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="bg-linear-to-br from-[#FB5012] to-[#D72483] bg-clip-text text-transparent font-medium text-xs">
                Recommended
              </p>
              <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
            </div>
          </button>
        </div>

        {/* Section 3: Social */}
        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <span className="text-[22px]">❤️</span>
            <span className="flex-1 text-left text-base font-medium text-black">
              Rate the app
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </button>

          <a
            href="https://twitter.com/firespot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <Image src="/icons/twitter.svg" alt="X" width={24} height={24} />
            <span className="flex-1 text-left text-base font-medium text-black">
              Follow on X
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </a>

          <a
            href="https://instagram.com/firespot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 py-3.5 px-4 border-b border-[#F1F1F1]"
          >
            <Image src="/icons/ig.svg" alt="Instagram" width={24} height={24} />
            <span className="flex-1 text-left text-base font-medium text-black">
              Follow on Instagram
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </a>

          <a
            href="https://facebook.com/firespot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 py-3.5 px-4"
          >
            <Image src="/icons/fb.svg" alt="Facebook" width={24} height={24} />
            <span className="flex-1 text-left text-base font-medium text-black">
              Like on Facebook
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-7">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 py-3.5 px-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                stroke="#ff002e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8.9 7.56c.31-3.6 2.16-5.07 6.21-5.07h.13c4.47 0 6.26 1.79 6.26 6.26v6.52c0 4.47-1.79 6.26-6.26 6.26h-.13c-4.02 0-5.87-1.45-6.2-4.99M15 12H3.62M5.85 8.65L2.5 12l3.35 3.35"
              ></path>
            </svg>
            <span className="flex-1 text-left text-base font-medium text-[#ff002e]">
              Sign out
            </span>
          </button>
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}
