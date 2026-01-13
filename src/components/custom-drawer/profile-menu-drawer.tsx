'use client'

import {
  X,
  ChevronRight,
  Landmark,
  QrCode,
  ChartNoAxesCombined,
  Headphones,
  Heart,
  Twitter,
  Instagram,
  Facebook,
  LogOut,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { useUserProfile } from '@/services/users'

interface ProfileMenuDrawerProps {
  closeDrawer: () => void
}

export function ProfileMenuDrawer({ closeDrawer }: ProfileMenuDrawerProps) {
  const { data: profile } = useUserProfile()
  const logout = useAuthStore((state) => state.logout)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const businessName = profile?.businessName || 'Your Business'
  const initials = businessName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleBankAccountsClick = () => {
    closeDrawer()
    // Small delay to let the current drawer close before opening new one
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
    window.location.href = '/login'
  }

  return (
    <div className="h-full flex flex-col font-satoshi overflow-y-auto bg-[#F4F6F8]">
      <header className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/firespot_logo.svg"
            alt="Firespot"
            width={24}
            height={24}
          />
          <span className="text-base font-bold text-black">firespot_lite</span>
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          className="flex items-center justify-center"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </header>

      <div className="px-4 mb-4">
        <button
          type="button"
          className="w-full bg-white rounded-[12px] p-3 flex items-center gap-3 shadow-[0px_4px_8px_0px_#0000000A]"
        >
          <div className="w-12 h-12 rounded-full bg-[#6366F1] flex items-center justify-center">
            {profile?.profilePhotoUrl ? (
              <Image
                src={profile.profilePhotoUrl}
                alt="Profile"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg">{initials}</span>
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-black">{businessName}</p>
            <p className="text-xs text-[#00000066] font-medium">
              Upgrade to a business profile
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
        </button>
      </div>

      {/* Menu Sections */}
      <div className="flex-1 px-4 space-y-3">
        {/* Section 1: Main navigation */}
        <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
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

          <button
            type="button"
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
          </button>
        </div>

        {/* Section 2: Support */}
        <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
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
            className="w-full flex items-center gap-3 py-3.5 px-4"
          >
            <Image
              src="/firespot_logo.svg"
              alt="Firespot"
              width={20}
              height={20}
            />
            <span className="flex-1 text-left text-base font-medium text-black">
              About Firespot
            </span>
            <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
          </button>
        </div>

        {/* Section 3: Social */}
        <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
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

        {/* Section 4: Sign out */}
        <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
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
