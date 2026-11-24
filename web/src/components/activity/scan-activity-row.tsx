'use client'

import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { VerifiedBadge } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { formatMerchantLocation } from '@/lib/utils/customer-sale'
import type { RecentScan } from '@/services/scans'

interface ScanActivityRowProps {
  scan: RecentScan
  onOpen: (scan: RecentScan) => void
}

/** A business the customer scanned but hasn't paid since. */
export function ScanActivityRow({ scan, onOpen }: ScanActivityRowProps) {
  const { merchant } = scan
  const businessName = merchant.businessName || 'Business'

  return (
    <button
      type="button"
      onClick={() => onOpen(scan)}
      className="w-full flex items-center gap-3 text-left cursor-pointer"
    >
      <MerchantAvatar
        profilePhotoUrl={merchant.businessImageUrl}
        alt={businessName}
        size={48}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[14px] font-bold text-black truncate">
            {businessName}
          </p>
          <VerifiedBadge level={merchant.verificationLevel} />
        </div>
        <p className="text-xs font-medium text-[#00000066] truncate mt-0.5">
          You scanned their QR code
          {merchant.mainAddress &&
            ` · ${formatMerchantLocation(merchant.mainAddress)}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-xs font-medium text-[#00000066]">
          {format(new Date(scan.lastScannedAt), 'h:mm a')}
        </p>
        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
      </div>
    </button>
  )
}
