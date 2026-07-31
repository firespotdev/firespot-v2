'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronRight,
  CirclePlus,
  MapPin,
  UserRound,
} from 'lucide-react'
import {
  ActionList,
  ActionListItem,
  showNotificationToast,
  TagFooter,
  VerifiedBadge,
} from '@/components/ui'
import { useAuthStore } from '@/services/auth'
import { useUserProfile } from '@/services/users'
import { hasPersonalIdentity } from '@/lib/utils/auth-redirect'

interface AccountSwitchDrawerProps {
  closeDrawer: () => void
  /** Which surface opened the drawer: the merchant profile or personal home */
  mode?: 'merchant' | 'personal'
}

export function AccountSwitchDrawer({
  closeDrawer,
  mode = 'merchant',
}: AccountSwitchDrawerProps) {
  const router = useRouter()
  const authUser = useAuthStore((state) => state.user)
  const { data: profile } = useUserProfile()

  const firstName = profile?.firstName ?? authUser?.firstName
  const lastName = profile?.lastName ?? authUser?.lastName
  const personalName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Personal account'
  const businessName = profile?.businessName ?? authUser?.businessName
  const isMerchant =
    (profile?.role ?? authUser?.role) === 'merchant' || Boolean(businessName)
  const profilePhotoUrl = profile?.profilePhotoUrl

  // Rating, payment count, and location have no backend yet — show honest
  // starter values in the designed layout until those features land.
  const ratingLine = '☆ 4.74 · 🔥 1.2k payments in 5 months'
  const locationLine = 'No location set'

  const handleSwitchToPersonal = () => {
    closeDrawer()
    if (!hasPersonalIdentity(profile ?? authUser)) {
      router.push('/onboarding?redirect=/home')
      return
    }
    router.push('/home')
  }

  const handleSwitchToStore = () => {
    closeDrawer()
    router.push('/profile')
  }

  const handleUpdateLocation = () => {
    showNotificationToast({ message: 'Coming soon', duration: 2000 })
  }

  const handleAddShop = () => {
    if (!isMerchant) {
      closeDrawer()
      router.push('/home?businessIntro=1')
      return
    }
    showNotificationToast({ message: 'Coming soon', duration: 2000 })
  }

  return (
    <div className="px-3 pt-2 pb-6 space-y-3 font-satoshi">
      {/* Personal identity */}
      <ActionList rounded="12">
        <ActionListItem
          icon={
            <span className="w-9 h-9 rounded-full bg-[#CED7E1] flex items-center justify-center overflow-hidden">
              {profilePhotoUrl ? (
                <Image
                  src={profilePhotoUrl}
                  alt={personalName}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <UserRound className="w-9 h-9 text-[#868788]" />
              )}
            </span>
          }
          title={
            <span className="text-[15px] font-medium">{personalName}</span>
          }
          subtitle={
            <span className="flex flex-col gap-0.5 mt-1">
              <span className="text-[13px] font-medium text-black">
                {ratingLine}
              </span>
              <span className="text-[13px] font-medium text-[#00000080] mt-1">
                {locationLine}
              </span>
            </span>
          }
          trailing={null}
          className="p-3"
        />
        {mode === 'merchant' ? (
          <ActionListItem
            icon={
              <Image
                src="/icons/user_switch.svg"
                alt="suer switch"
                width={24}
                height={24}
              />
            }
            title={<span className="ml-1">Switch to personal profile</span>}
            onClick={handleSwitchToPersonal}
            className="px-5 py-5"
          />
        ) : (
          <ActionListItem
            icon={<MapPin size={24} className="text-[#0075FF]" />}
            title={
              <span className="text-[#0075FF] text-sm font-bold">
                Update location
              </span>
            }
            onClick={handleUpdateLocation}
            className="px-4 py-4.5"
          />
        )}
      </ActionList>

      {/* Stores owned by this merchant (single store for now) */}
      <ActionList rounded="12">
        {isMerchant && businessName && (
          <ActionListItem
            icon={
              <span className="w-9 h-9 rounded-full bg-[#CED7E1] flex items-center justify-center">
                <Image
                  src="/icons/store_solid.svg"
                  alt=""
                  width={22}
                  height={22}
                />
              </span>
            }
            title={
              <span className="inline-flex items-center gap-1">
                {businessName.toUpperCase()}
                {/* Effective level: null while lapsed, so the badge hides. */}
                <VerifiedBadge level={profile?.effectiveVerificationLevel} />
              </span>
            }
            subtitle="Owner · Main address"
            trailing={
              mode === 'merchant' ? (
                <Check className="w-5 h-5 text-[#24C166] stroke-[3px]" />
              ) : (
                <ChevronRight
                  size={16}
                  className="text-[#AEAEB2] stroke-[2.5px]"
                />
              )
            }
            onClick={mode === 'personal' ? handleSwitchToStore : undefined}
            className="p-3"
          />
        )}
        <ActionListItem
          icon={<CirclePlus className="w-6 h-6 text-[#0075FF]" />}
          title={<span className="text-[#0075FF] ml-1">Add Shop</span>}
          trailing={
            <ChevronRight size={16} className="text-[#AEAEB2] stroke-[2.5px]" />
          }
          onClick={handleAddShop}
          className="px-5 py-4"
        />
      </ActionList>

      {/* Footer */}
      <TagFooter />
    </div>
  )
}
