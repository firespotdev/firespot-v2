'use client'

import * as React from 'react'
import {
  ChevronRight,
  Camera,
  PieChart,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUpRight,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { type InsightsQuery, type DateRangePreset } from '@/services/insights'
import { VerifiedBadge } from '../ui'

interface MerchantInfo {
  businessImageUrl?: string
  businessName: string
  bankAccountCount: number
  effectiveVerificationLevel?: 'PRO' | 'PROMAX' | null
}

interface MerchantInfoStatProps {
  merchantInfo: MerchantInfo
  className?: string
  showCameraButton?: boolean
  onCameraClick?: () => void
  isUploadingPhoto?: boolean
  qrKitStatus?: React.ReactNode
  quickActions?: React.ReactNode
  todaySalesAmount?: number
  confirmedAmount?: number
  unconfirmedAmount?: number
  confirmedCount?: number
  unconfirmedCount?: number
  salesCount?: number
  ordersCount?: number
  owingCount?: number
  isAmountHidden?: boolean
  onToggleVisibility?: () => void
  currentFilter?: InsightsQuery
  onFilterChange?: (filter: InsightsQuery) => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const SALES_PERIOD_LABELS: Record<DateRangePreset, string> = {
  all_time: 'All-time sales',
  today: 'Today’s sales',
  this_week: 'This week’s sales',
  last_7_days: 'Last 7 days’ sales',
  last_30_days: 'Last 30 days’ sales',
  last_90_days: 'Last 90 days’ sales',
  custom: 'Custom sales',
}

export function MerchantInfoStat({
  merchantInfo,
  className,
  showCameraButton = false,
  onCameraClick,
  isUploadingPhoto = false,
  qrKitStatus,
  quickActions,
  todaySalesAmount = 0,
  confirmedAmount,
  unconfirmedAmount,
  confirmedCount,
  unconfirmedCount,
  salesCount = 0,
  isAmountHidden = false,
  onToggleVisibility,
  currentFilter,
  onFilterChange,
}: MerchantInfoStatProps) {
  const { openDrawer } = useDrawerStore()

  const handleOpenDrawer = () => {
    openDrawer({
      type: 'date-range-filter',
      props: {
        currentFilter,
        onApply: onFilterChange,
      },
    })
  }

  const salesPeriodLabel = (() => {
    if (
      currentFilter?.preset === 'custom' &&
      currentFilter.startDate &&
      currentFilter.endDate
    ) {
      try {
        const start = format(new Date(currentFilter.startDate), 'MMM d')
        const end = format(new Date(currentFilter.endDate), 'MMM d')
        return `${start} - ${end} sales`
      } catch {
        return SALES_PERIOD_LABELS.custom
      }
    }
    return SALES_PERIOD_LABELS[currentFilter?.preset || 'today']
  })()

  return (
    <div className={cn('w-full flex flex-col items-center', className)}>
      <div className="flex flex-col items-center w-full mb-6">
        <div className="relative">
          {merchantInfo.businessImageUrl ? (
            <Image
              src={merchantInfo.businessImageUrl}
              alt={merchantInfo.businessName}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover shadow-[0px_4px_8px_0px_#0000000A]"
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

        <Link
          href="/profile"
          className="flex items-center gap-1 mt-4 text-center"
        >
          <h1 className="font-bold text-xl text-black -tracking-[0.4px] leading-none">
            {merchantInfo.businessName}
          </h1>
          <VerifiedBadge
            className="mt-1"
            level={merchantInfo?.effectiveVerificationLevel}
          />
          <div className="bg-[#D9D9D9] rounded-[4px] w-4 h-4 flex justify-center items-center mt-1">
            <ArrowUpRight
              size={12}
              className="text-[#6B7280]"
              strokeWidth={2}
            />
          </div>
        </Link>

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

      {quickActions}

      <div className="border-2 border-[#000000]/8 bg-white rounded-[12px] w-full mb-6">
        <div className="px-4 py-3 flex justify-between items-center border-b-2 border-[#F4F6F8]">
          <div>
            <button
              onClick={handleOpenDrawer}
              className="flex items-center gap-1 mb-2"
            >
              <span className="text-[#00000066] text-xs font-medium">
                {salesPeriodLabel}
                {salesCount > 1 ? ` (${salesCount})` : ''}
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
          <Link
            href="/insights"
            className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#F1F1F1] px-4 text-[10px] font-bold tracking-[1px] text-black"
          >
            <PieChart size={18} strokeWidth={2} />
            INSIGHTS
          </Link>
        </div>

        <div className="grid grid-cols-2 divide-x divide-[#F1F1F1] text-left">
          <Link
            href="/sales?tab=confirmed"
            className="px-4 py-3 transition-colors group"
          >
            <div className="flex items-center gap-1">
              <span className="text-[#00000066] text-xs font-medium">
                Confirmed{' '}
                {(confirmedCount ?? 0) > 1 ? `(${confirmedCount})` : ''}
              </span>{' '}
              <ChevronRight size={12} strokeWidth={2} color="#00000066" />
            </div>
            <h4 className="font-bold text-[14px] text-black leading-none mt-2">
              {isAmountHidden
                ? '₦ ••••••••'
                : `₦ ${formatCurrency(confirmedAmount ?? todaySalesAmount)}`}
            </h4>
          </Link>

          <Link
            href="/sales?tab=unconfirmed"
            className="px-4 py-3.5 transition-colors group"
          >
            <div className="flex items-center gap-1">
              <span className="inline-block text-xs font-medium text-[#BB8123B2]">
                Unconfirmed{' '}
                {(unconfirmedCount ?? 0) > 1 ? `(${unconfirmedCount})` : ''}
              </span>{' '}
              <ChevronRight size={12} strokeWidth={2} color="#BB8123" />
            </div>
            <h4 className="mt-2 text-[#BB8123] text-[14px] font-bold leading-none">
              {isAmountHidden
                ? '₦ ••••••••'
                : `₦ ${formatCurrency(unconfirmedAmount ?? 0)}`}
            </h4>
          </Link>
        </div>
      </div>
    </div>
  )
}
