'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronRight,
  Copy,
  Headphones,
  Maximize2,
  Settings,
  Share,
  Star,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { logoutEverywhere, useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { useUserProfile } from '@/services/users'
import { MerchantAvatar } from '@/components/layout'
import { Button, showNotificationToast, VerifiedBadge } from '@/components/ui'
import {
  Briefcase,
  Gift,
  Instagram,
  Facebook,
  UserAdd,
  Personalcard,
  Setting2,
  Headphone,
} from 'iconsax-reactjs'
import {
  AddressBookIcon,
  CardsThreeIcon,
  StorefrontIcon,
  TwitterLogoIcon,
  UserCircleGearIcon,
} from '@phosphor-icons/react'

interface PersonalProfileMenuDrawerProps {
  closeDrawer: () => void
}

export function PersonalProfileMenuDrawer({
  closeDrawer,
}: PersonalProfileMenuDrawerProps) {
  const authUser = useAuthStore((state) => state.user)
  const { data: profile } = useUserProfile()
  const user = profile || authUser
  const { openDrawer } = useDrawerStore()

  const handleLogout = async () => {
    try {
      closeDrawer()
      await logoutEverywhere()
    } catch {
      // fallback
    }
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Customer'

  const qrUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lite.firespot.co'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl)
    showNotificationToast({
      message: 'Link copied',
      mode: 'success',
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: `Check out ${displayName} on Firespot!`,
          url: qrUrl,
        })
      } catch {
        // User cancelled or share failed.
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-white font-satoshi text-black">
      {/* Section A: Header Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white">
        <div className="flex items-center gap-2">
          <Image
            src="/images/firespot_logo.png"
            alt="Firespot"
            width={32}
            height={32}
            className="h-8 w-auto object-contain"
          />
          <p className="font-bold text-xl leading-none -tracking-[0.4px]">
            firespot
          </p>
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close menu"
          className="flex h-6 w-6 items-center justify-center"
        >
          <X size={24} strokeWidth={2} />
        </button>
      </header>

      <div className="px-3 pb-8 space-y-3">
        {/* Section B: Profile Header & Metrics Card */}
        <div className="flex flex-col items-center pt-5 pb-4 text-center">
          <div className="relative mb-4">
            <MerchantAvatar profilePhotoUrl={user?.profilePhotoUrl} size={96} />
          </div>
          {displayName ? (
            <div className="flex items-center gap-1.5 justify-center">
              <h2 className="text-[20px] font-bold text-black tracking-tight">
                {displayName}
              </h2>
              <VerifiedBadge level="PRO" />
            </div>
          ) : null}
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="mt-1 text-sm font-semibold text-[#00000080] hover:text-black flex items-center gap-1 transition-colors"
          >
            View my public profile
            <ChevronRight size={14} />
          </Link>

          {/* Metrics Row */}
          <div className="mt-4 w-full grid grid-cols-3 divide-x divide-[#0000001A] py-1.5">
            <div className="flex flex-col items-center">
              <span className="text-[16px] font-bold text-black">1.2k</span>
              <span className="text-[13px] font-medium text-[#111827]">
                Purchases
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-[#FDB022] text-[#FDB022]" />
                <span className="text-[16px] font-bold text-black">250</span>
              </div>
              <span className="text-[13px] font-medium text-[#111827]">
                Rewards earned
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[16px] font-bold text-black">33</span>
              <span className="text-[13px] font-medium text-[#111827]">
                Places visited
              </span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="mt-4 w-full flex items-center gap-3">
            <Button className="h-11">Pay</Button>
          </div>
        </div>

        {/* Section E: Spread the Word QR Referral Card (Mirrored from Merchant Profile Menu) */}
        <div className="relative mb-3 flex items-center gap-4 border-2 border-[#F4F6F8] overflow-hidden rounded-[12px] p-4 shadow-[0px_2px_8px_0px_#0000000A]">
          <div className="z-10 flex-1 min-w-0">
            <h3 className="mb-1 text-[16px] font-bold text-black">
              Spread the word
            </h3>
            <p className="mb-4 text-[13px] font-medium text-[#00000080] leading-relaxed">
              Show your friends your QR code or share them a link to start using
              firespot to shop.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share profile link"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95 cursor-pointer"
              >
                <Share className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy profile link"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  closeDrawer()
                  openDrawer({
                    type: 'profile-share',
                    props: {
                      businessName: displayName,
                      profilePhotoUrl: user?.profilePhotoUrl,
                    },
                  })
                }}
                aria-label="Maximize profile share card"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95 cursor-pointer"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* QR Graphic with Gradient & Profile Avatar Overlay */}
          <div className="flex h-[128px] w-[128px] shrink-0 items-center justify-center rounded-[6px] bg-linear-to-br from-[#FB5012] to-[#D72483] p-[1.5px]">
            <div className="relative flex h-full w-full items-center justify-center rounded-[6px] bg-white">
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient
                    id="personal-qr-gradient"
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
              <div className="relative rounded-[10px] bg-white">
                <QRCodeSVG
                  value={qrUrl}
                  size={112}
                  level="L"
                  marginSize={0}
                  fgColor="url(#personal-qr-gradient)"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="flex h-[35px] w-[35px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#CED7E1] shadow-xs">
                      {user?.profilePhotoUrl ? (
                        <Image
                          src={user.profilePhotoUrl}
                          alt="Profile"
                          width={22}
                          height={22}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src="/images/default_avatar.png"
                          alt="Default avatar"
                          width={22}
                          height={22}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-[14px] w-[14px] rounded-[4px] border border-[#F4F6F8] bg-white">
                      <Image
                        src="/images/firespot_logo.png"
                        alt="Firespot"
                        width={12}
                        height={12}
                        className="h-full w-full rounded-[3px] object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section F: Core Account & Navigation Cards */}
        {/* Find Contacts Card */}
        <div className="rounded-[12px] border border-[#F4F6F8] p-3 shadow-[0px_2px_8px_0px_#0000000A] flex items-center gap-3 cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 p-0.5 border-[#D1D5DB] flex items-center justify-center shrink-0">
            <div className="bg-[#0075FF] w-10 h-10 rounded-full flex items-center justify-center">
              <AddressBookIcon size={20} color="white" weight="fill" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-bold text-black leading-tight">
              Find contacts
            </h4>
            <p className="text-xs font-medium text-[#00000080] truncate mt-0.5">
              Sync or find your contacts that are on firespot to enrich your
              experience
            </p>
          </div>
          <ChevronRight size={18} className="text-[#C7C7CC] shrink-0" />
        </div>

        {/* Navigation List Card */}
        <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_8px_0px_#0000000A]">
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <StorefrontIcon size={24} color="black" />
              <span className="text-[16px] font-medium text-black">
                My businesses
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_8px_0px_#0000000A]">
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8] transition-colors"
          >
            <div className="flex items-center gap-3">
              <CardsThreeIcon size={24} color="black" />
              <span className="text-[16px] font-medium text-black">
                Gift Cards
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>

          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <UserCircleGearIcon size={24} color="black" />
              <span className="text-[16px] font-medium text-black">
                Referrals
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_8px_0px_#0000000A]">
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8]"
          >
            <div className="flex items-center gap-3">
              <Headphones size={24} className="text-black" />
              <span className="text-[16px] font-medium text-black">
                Talk to support
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>

          <Link
            href="/profile"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Setting2 size={24} className="text-black" />
              <span className="text-[16px] font-medium text-black">
                Preferences
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>
        </div>

        {/* Section I: System Links & Sign Out */}
        <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_8px_0px_#0000000A]">
          <Link
            href="/about"
            onClick={closeDrawer}
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8]"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/images/firespot_logo.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
              <span className="text-[16px] font-medium text-black">
                About Firespot
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </Link>

          <button
            type="button"
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-[24px]">⭐️</span>
              <span className="text-[16px] font-medium text-black">
                Rate the app
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </button>

          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/icons/twitter.svg"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
              <span className="text-[16px] font-medium text-black">
                Follow on Twitter
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F6F8] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/icons/ig.svg"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
              <span className="text-[16px] font-medium text-black">
                Follow on Instagram
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </a>

          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/icons/fb.svg"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
              <span className="text-[16px] font-medium text-black">
                Like on Facebook
              </span>
            </div>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </a>
        </div>

        {/* Sign Out Card */}
        <div className="rounded-[12px] bg-white p-4 shadow-[0px_2px_8px_0px_#0000000A]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-center text-[#EB5757] font-normal text-[16px] cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
