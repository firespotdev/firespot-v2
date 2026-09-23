'use client'

import Image from 'next/image'
import { ChevronLeft, Ellipsis } from 'lucide-react'
import type { PublicBusinessProfile } from '@/services/business-profile'

interface BannerProps {
  business: PublicBusinessProfile
  onBack: () => void
  onOptions: () => void
}

export function Banner({ business, onBack, onOptions }: BannerProps) {
  return (
    <div className="relative h-[200px] w-full overflow-hidden bg-gray-200">
      <div className="absolute top-4 z-10 flex w-full items-center justify-between px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="grid h-10 w-10 place-items-center rounded-full bg-black/10 text-white backdrop-blur-sm"
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={onOptions}
          aria-label="Business options"
          className="grid h-10 w-10 place-items-center rounded-full bg-black/10 text-white backdrop-blur-sm"
        >
          <Ellipsis size={26} strokeWidth={2.5} />
        </button>
      </div>

      {business.profileBannerUrl && (
        <Image
          src={business.profileBannerUrl}
          alt={`${business.businessName} cover`}
          fill
          priority
          sizes="(max-width: 500px) 100vw, 500px"
          className="object-cover"
        />
      )}
    </div>
  )
}

export default Banner
