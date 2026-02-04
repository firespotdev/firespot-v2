'use client'

import { ChevronDown, Share } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'

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

  const handleLeftButtonClick = () => {
    if (onLogoClick) {
      onLogoClick()
      return
    }

    if (isAuthenticated) {
      openDrawer({ type: 'profile-menu' })
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

      {onShareClick && !isAuthenticated && (
        <button
          onClick={onShareClick}
          type="button"
          className="h-9 w-9 bg-[#00000014] rounded-2xl flex items-center justify-center"
        >
          <Share stroke="#868788" size={20} />
        </button>
      )}
      {(!onShareClick || isAuthenticated) && (
        <div className="h-9 w-9" />
      )}
    </header>
  )
}
