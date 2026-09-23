'use client'

import { MapPin, X } from 'lucide-react'
import { Label } from '@/components/ui'
import type { BusinessLocation } from '@/services/business-profile'

interface LocationsContentProps {
  businessName: string
  locations: BusinessLocation[]
  closeDrawer: () => void
}

function LocationRow({ location }: { location: BusinessLocation }) {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            location.isPrimary ? 'bg-[#FB5012]' : 'bg-[#BFBFBF]'
          }`}
        >
          <MapPin size={17} fill="white" color="white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black">
            {location.name}
          </p>
          {(location.address || location.location) && (
            <p className="text-xs font-medium text-[#00000080]">
              {[location.address, location.location]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function LocationsContent({
  businessName,
  locations,
  closeDrawer,
}: LocationsContentProps) {
  const primary = locations.find((location) => location.isPrimary) || locations[0]
  const others = locations.filter((location) => location.id !== primary?.id)

  return (
    <div className="bg-[#F4F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between pb-4">
        <div className="h-8 w-8" />
        <h1 className="text-[1rem] font-bold capitalize">
          {businessName.toLowerCase()} locations
        </h1>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close locations"
          className="grid h-8 w-8 place-items-center"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {primary ? (
        <>
          <Label className="text-[#00000080]">Main location</Label>
          <div className="rounded-lg bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            <LocationRow location={primary} />
          </div>
        </>
      ) : (
        <p className="py-12 text-center text-sm font-medium text-[#00000080]">
          No locations have been added yet.
        </p>
      )}

      {others.length > 0 && (
        <>
          <div className="mt-4">
            <Label className="text-[#00000080]">Other locations</Label>
          </div>
          <div className="divide-y divide-gray-100 rounded-lg bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            {others.map((location) => (
              <LocationRow key={location.id} location={location} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
