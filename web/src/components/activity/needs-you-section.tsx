'use client'

import { ChevronRight } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'

export function NeedsYouSection() {
  return (
    <div className="mb-6">
      <div className="bg-white rounded-[16px] p-4 border-2 border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-black">Needs you</h3>
          <button
            type="button"
            className="text-xs font-medium text-black underline underline-offset-3"
          >
            View all
          </button>
        </div>

        <div className="space-y-2">
          {/* Item 1 */}
          <div className="flex items-center gap-3 py-0.5 transition-colors cursor-pointer">
            <MerchantAvatar
              profilePhotoUrl="/images/default_avatar.png"
              size={48}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-bold text-black truncate">
                  Honeydrop Pastries
                </span>
                <VerifiedBadge level="PROMAX" />
              </div>
              <p className="text-[13px] font-medium text-[#00000066] truncate mt-0.5">
                Same day delivery
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
          </div>

          {/* Item 2 */}
          <div className="flex items-center gap-3 py-0.5 transition-colors">
            <MerchantAvatar
              profilePhotoUrl="/images/default_avatar.png"
              size={48}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-bold text-black truncate">
                Order pending
              </span>
              <p className="text-[13px] font-medium text-[#00000066] truncate mt-0.5">
                Shop will review order in ~2 minutes
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
          </div>

          {/* Item 3 */}
          <div className="flex items-center gap-3 py-0.5 transition-colors">
            <MerchantAvatar
              profilePhotoUrl="/images/default_avatar.png"
              size={48}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-bold text-black truncate">
                Rate your visit
              </span>
              <p className="text-[13px] font-medium text-[#00000066] truncate mt-0.5">
                Leave feedback for Omotola Adewale
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}
