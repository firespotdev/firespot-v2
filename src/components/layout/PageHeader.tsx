'use client'

import { ChevronDown, Share } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { useUserQRKits } from '@/services/qr'
import { showNotificationToast } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showDropdown?: boolean
  onTitleClick?: () => void
  onShareClick?: () => void
  onLogoClick?: () => void
  /** Custom right-side control; takes precedence over the share button */
  rightSlot?: React.ReactNode
  /** Logo image; personal surfaces use /images/firespot_personal.png */
  logoSrc?: string
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  showDropdown = false,
  onTitleClick,
  onShareClick,
  onLogoClick,
  rightSlot,
  logoSrc = '/images/firespot_alt.png',
  className,
}: PageHeaderProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

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

  const handleShareClick = async () => {
    if (firstSerialNumber) {
      try {
        await navigator.share({
          title: `Share transfer link`,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${firstSerialNumber}`,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(
            `${process.env.NEXT_PUBLIC_APP_URL}/pay/${firstSerialNumber}`,
          )
          showNotificationToast({
            message: 'Link copied to clipboard!',
            duration: 2000,
          })
        }
      }
    }
  }

  return (
    <header
      className={cn(
        'flex items-center justify-between py-2 px-3 sticky top-0 z-50 bg-[#F4F6F8]',
        className,
      )}
    >
      <div className="h-9 w-9 flex items-center justify-center rounded-[12px] border bg-white border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A]">
        {onLogoClick ? (
          <button onClick={handleLeftButtonClick} type="button">
            <Image src={logoSrc} alt="firespot logo" width={20} height={20} />
          </button>
        ) : isAuthenticated ? (
          <button onClick={handleLeftButtonClick} type="button">
            <Image src={logoSrc} alt="firespot logo" width={20} height={20} />
          </button>
        ) : (
          <Link href="/">
            <Image src={logoSrc} alt="firespot logo" width={20} height={20} />
          </Link>
        )}
      </div>

      <button
        onClick={onTitleClick}
        type="button"
        className="flex flex-col items-center min-w-0 px-2"
      >
        <span className="flex items-center gap-1 text-[#000000] font-bold text-sm leading-[100%] max-w-full">
          <span className="truncate">{title}</span>
          {showDropdown && (
            <ChevronDown
              className="w-4 h-4 shrink-0"
              stroke="#000000"
              strokeWidth={2}
            />
          )}
        </span>
        {subtitle && (
          <span className="text-xs font-medium text-center text-[#00000066] leading-none mt-1 truncate max-w-full">
            {subtitle}
          </span>
        )}
      </button>

      {rightSlot}

      {!rightSlot && onShareClick && (
        <button
          onClick={onShareClick}
          type="button"
          className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
        >
          <Share stroke="#868788" size={20} />
        </button>
      )}

      {!rightSlot && !onShareClick && <div className="h-9 w-9" />}
    </header>
  )
}
