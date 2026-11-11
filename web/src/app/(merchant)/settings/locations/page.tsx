'use client'

import { useRouter } from '@bprogress/next/app'
import { StorefrontIcon } from '@phosphor-icons/react'
import { ChevronRight, Plus } from 'lucide-react'
import {
  ActionList,
  ActionListItem,
  BackButton,
  Button,
  LoaderCircle,
  showNotificationToast,
} from '@/components/ui'
import { useSetupStepBack } from '@/hooks/use-setup-step-back'
import { useDrawerStore } from '@/services/drawer'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useSpots, type Spot } from '@/services/spots/spots-api'

const countLabel = (count: number) =>
  count === 0 ? 'No spots yet' : `${count} ${count === 1 ? 'spot' : 'spots'}`

const spotSubtitle = (spot: Spot) =>
  spot.isPrimary
    ? 'Owner · Main address'
    : ['Owner', spot.city || spot.address].filter(Boolean).join(' · ')

function SpotIcon() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D9DEE6]">
      <StorefrontIcon size={24} weight="fill" color="white" />
    </span>
  )
}

function AddSpotIcon() {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white">
      <StorefrontIcon size={24} weight="fill" color="#2F7CF6" />
      <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#4DA3FF]">
        <Plus size={11} strokeWidth={3} className="text-white" />
      </span>
    </span>
  )
}

/** Setup → Add shop locations: the merchant's spots and a way to add more. */
export default function LocationsSettingsPage() {
  const router = useRouter()
  const handleBack = useSetupStepBack()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data, isLoading } = useSpots()
  const { data: catalog } = usePlanCatalog()
  const spots = (data ?? []).filter((spot) => spot.isActive)

  const openSpot = (spot: Spot) =>
    openDrawer({ type: 'spot-form', props: { spot } })

  // The first spot is free; each extra one needs Pro Max and its own charge.
  const addSpot = () => {
    if (spots.length === 0) {
      openDrawer({ type: 'spot-form' })
      return
    }
    if (catalog?.current.effectiveTier !== 'PROMAX') {
      showNotificationToast({ message: 'Extra spots need Firespot Pro Max.' })
      router.push('/plans?tier=PROMAX')
      return
    }
    const proMax = catalog.plans.find((plan) => plan.tier === 'PROMAX')
    openDrawer({
      type: 'spot-form',
      props: { monthlyCharge: proMax?.price },
    })
  }

  return (
    <div className="min-h-dvh bg-linear-to-br from-[#ffffff] to-[#f4f6f8]">
      <div className="mx-auto flex min-h-dvh max-w-125 flex-col">
        <BackButton onClick={handleBack} className="self-start px-4 py-3.5" />

        <div className="flex-1 px-4 pb-6">
          <p className="mt-0.5 text-sm font-medium text-[#00000080]">
            Shop locations
          </p>
          <h1 className="mt-1.5 text-[20px] font-bold -tracking-[0.4px] text-black">
            Where customers can find you
          </h1>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle innerBg="#F4F6F8" />
            </div>
          ) : (
            <>
              <p className="mt-6 mb-2 text-[13px] font-medium text-[#6B7280]">
                {countLabel(spots.length)}
              </p>
              <ActionList rounded="12">
                {spots.map((spot) => (
                  <ActionListItem
                    key={spot._id}
                    className="p-3"
                    icon={<SpotIcon />}
                    title={
                      <span className="text-[14px] font-bold text-black uppercase">
                        {spot.name}
                      </span>
                    }
                    subtitle={spotSubtitle(spot)}
                    onClick={() => openSpot(spot)}
                  />
                ))}
                <ActionListItem
                  className="p-3"
                  icon={<AddSpotIcon />}
                  title={
                    <span className="text-[15px] font-bold text-[#2F7CF6]">
                      Add a Spot
                    </span>
                  }
                  trailing={
                    <ChevronRight size={18} className="text-[#2F7CF6]" />
                  }
                  onClick={addSpot}
                />
              </ActionList>
            </>
          )}
        </div>

        <div className="sticky bottom-0 w-full rounded-t-[12px] border-t border-[#F1F1F1] bg-white p-4">
          <Button
            onClick={handleBack}
            disabled={spots.length === 0}
            className="w-full font-bold"
          >
            Save and continue
          </Button>
        </div>
      </div>
    </div>
  )
}
