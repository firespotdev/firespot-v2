'use client'

import * as React from 'react'
import {
  ChevronRight,
  Camera,
  Clock,
  PieChart,
  ChevronDown,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface MerchantInfo {
  profilePhotoUrl?: string
  businessName: string
  bankAccountCount: number
}

interface MerchantInfoStatProps {
  merchantInfo: MerchantInfo
  className?: string
  showCameraButton?: boolean
  onCameraClick?: () => void
  isUploadingPhoto?: boolean
  qrKitStatus?: React.ReactNode
  todaySalesAmount?: number
  isAmountHidden?: boolean
  onToggleVisibility?: () => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function MerchantInfoStat({
  merchantInfo,
  className,
  showCameraButton = false,
  onCameraClick,
  isUploadingPhoto = false,
  qrKitStatus,
  todaySalesAmount = 0,
  isAmountHidden = false,
  onToggleVisibility,
}: MerchantInfoStatProps) {
  return (
    <div className={cn('w-full flex flex-col items-center gap-6', className)}>
      <div className="flex flex-col items-center px-4">
        <div className="relative">
          {merchantInfo.profilePhotoUrl ? (
            <Image
              src={merchantInfo.profilePhotoUrl}
              alt={merchantInfo.businessName}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#CED7E1] flex items-center justify-center">
              <Image
                src="/icons/store_solid.svg"
                alt="store icon"
                width={57}
                height={57}
              />
            </div>
          )}

          {/* Upload overlay when uploading */}
          {isUploadingPhoto && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {showCameraButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCameraClick?.()
              }}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center border-2 border-white disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-black" />
            </button>
          )}
        </div>

        <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
          {merchantInfo.businessName}
        </h1>

        {qrKitStatus ? (
          qrKitStatus
        ) : (
          <span className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1 cursor-pointer">
            {merchantInfo.bankAccountCount} linked bank account
            {merchantInfo.bankAccountCount === 1 ? '' : 's'}
            <ChevronRight className="w-4 h-4 text-[#747576]" />
          </span>
        )}
      </div>

      <div className="border-2 border-[#0000000A] rounded-[12px] w-full">
        <div className="border border-[#F4F6F8] px-4 py-3 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] flex justify-between items-center">
          <div className="">
            <button className="flex items-center gap-1 mb-1">
              <span className="text-[#00000066] text-xs font-medium">
                Today
              </span>{' '}
              <ChevronDown size={14} strokeWidth={2} color="#00000066" />
            </button>
            <div className="flex items-end gap-1.5">
              <h3 className="font-bold text-xl leading-none">
                {isAmountHidden
                  ? '₦ ••••••••'
                  : `₦ ${formatCurrency(todaySalesAmount)}`}
              </h3>
              <button onClick={onToggleVisibility}>
                {isAmountHidden ? (
                  <EyeOff size={16} color="#00000066" strokeWidth={2} />
                ) : (
                  <Eye size={16} color="#00000066" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="flex justify-center items-center p-2.5 rounded-full bg-[#E5E7EB]"
            >
              <Clock size={20} strokeWidth={2} color="#6B7280" />
            </Link>
            <Link
              href="/insights"
              className="flex justify-center items-center p-2.5 rounded-full bg-[#26B2FF]"
            >
              <PieChart size={20} strokeWidth={2} color="#ffffff" />
            </Link>
          </div>
        </div>
        <div className="flex items-center bg-[#f4f4f4] px-5 py-3 gap-2 rounded-[12px]">
          <AlertCircle size={18} strokeWidth={2.5} color="#00000066" />
          <p className="text-xs text-[#00000066] font-medium">
            You will not receive a payout for these transactions.
            <br />
            Sales are recorded for accounting purposes only.
          </p>
        </div>
      </div>
    </div>
  )
}
