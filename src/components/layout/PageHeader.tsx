'use client'

import { ChevronDown, Settings, Share } from 'lucide-react'
import Image from 'next/image'

interface PageHeaderProps {
  title: string
  showDropdown?: boolean
  onTitleClick?: () => void
  onSettingsClick?: () => void
  onShareClick?: () => void
  onLogoClick?: () => void
}

export function PageHeader({
  title,
  showDropdown = false,
  onTitleClick,
  onSettingsClick,
  onShareClick,
  onLogoClick,
}: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between py-4 px-3">
      <div className="h-9 w-9 flex items-center justify-center rounded-[12px] border border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A]">
        {onSettingsClick ? (
          <button onClick={onSettingsClick} type="button">
            <Settings className="w-5 h-5 text-[#868788]" />
          </button>
        ) : onLogoClick ? (
          <button onClick={onLogoClick} type="button">
            <Image
              src="/firespot_alt.png"
              alt="firespot logo"
              width={20}
              height={20}
            />
          </button>
        ) : (
          <Image
            src="/firespot_alt.png"
            alt="firespot logo"
            width={20}
            height={20}
          />
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

      <button
        onClick={onShareClick}
        type="button"
        className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
      >
        <Share stroke="#868788" size={20} />
      </button>
    </header>
  )
}
