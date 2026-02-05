'use client'

import { ChevronDown, Share } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { useUserQRKits } from '@/services/qr'
import { showNotificationToast } from '@/components/ui'

interface PageHeaderProps {
  title: string
  showDropdown?: boolean
  onTitleClick?: () => void
  onShareClick?: () => void
  onLogoClick?: () => void
}

export function PageHeader({
  title,
  showDropdown = false,
  onTitleClick,
  onShareClick,
  onLogoClick,
}: PageHeaderProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  
  // Only fetch QR kits when user is authenticated to avoid 401 on public pages
  const { data: qrKitsData } = useUserQRKits({ enabled: isAuthenticated })

  const qrKits = qrKitsData?.data || []
  const hasQRKits = qrKits.length > 0
  const firstSerialNumber = hasQRKits ? qrKits[0].serialNumber : null

  const handleLeftButtonClick = () => {
    if (onLogoClick) {
      onLogoClick()
      return
    }

    if (isAuthenticated) {
      openDrawer({ type: 'profile-menu' })
    }
  }

  const handleShareClick = () => {
    if (firstSerialNumber) {
      const merchantUrl = `https://lite.firespot.co/pay/${firstSerialNumber}`
      navigator.clipboard.writeText(merchantUrl)
      showNotificationToast({
        message: 'Link copied to clipboard!',
        duration: 2000,
      })
    }
  }

  return (
    <header className="flex items-center justify-between py-2 px-3 sticky top-0 z-50 bg-[#F4F6F8]">
      <div className="h-9 w-9 flex items-center justify-center rounded-2xl border border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A]">
        {onLogoClick ? (
          <button onClick={handleLeftButtonClick} type="button">
            <Image
              src="/images/firespot_alt.png"
              alt="firespot logo"
              width={20}
              height={20}
            />
          </button>
        ) : isAuthenticated ? (
          <button onClick={handleLeftButtonClick} type="button">
            <Image
              src="/images/firespot_alt.png"
              alt="firespot logo"
              width={20}
              height={20}
            />
          </button>
        ) : (
          <Link href="/">
            <Image
              src="/images/firespot_alt.png"
              alt="firespot logo"
              width={20}
              height={20}
            />
          </Link>
        )}
      </div>

      <button
        onClick={onTitleClick}
        type="button"
        className="flex items-center gap-1 text-[#000000] font-bold text-base leading-[100%]"
      >
        {title}
        {showDropdown && (
          <ChevronDown className="w-4 h-4" stroke="#000000" strokeWidth={2} />
        )}
      </button>

      {/* Share button for unauthenticated users with custom onShareClick */}
      {onShareClick && !isAuthenticated && (
        <button
          onClick={onShareClick}
          type="button"
          className="h-9 w-9 bg-[#00000014] rounded-2xl flex items-center justify-center"
        >
          <Share stroke="#868788" size={20} />
        </button>
      )}

      {/* Share button for authenticated merchants with QR kits */}
      {isAuthenticated && hasQRKits && (
        <button
          onClick={handleShareClick}
          type="button"
          className="h-9 w-9 bg-[#00000014] rounded-2xl flex items-center justify-center"
        >
          <Share stroke="#868788" size={20} />
        </button>
      )}

      {/* Spacer when no share button is shown */}
      {!onShareClick && !isAuthenticated && <div className="h-9 w-9" />}
      {isAuthenticated && !hasQRKits && <div className="h-9 w-9" />}
    </header>
  )
}
