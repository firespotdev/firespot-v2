'use client'

import {
  ArrowRightCircle,
  Heart,
  Info,
  MessageCircle,
  MessageSquareHeart,
  Phone,
  Receipt,
  Share,
  X,
} from 'lucide-react'
import { ActionList, ActionListItem } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'

interface OptionsDrawerProps {
  business: PublicBusinessProfile
  isFavorite: boolean
  onToggleFavorite: () => void
  onViewActivity: () => void
  onViewFeedback: () => void
  onViewAbout: () => void
  onShare: () => Promise<void>
  closeDrawer: () => void
}

export function OptionsDrawer({
  business,
  isFavorite,
  onToggleFavorite,
  onViewActivity,
  onViewFeedback,
  onViewAbout,
  onShare,
  closeDrawer,
}: OptionsDrawerProps) {
  const toggleFavorite = () => {
    onToggleFavorite()
    closeDrawer()
  }

  return (
    <div className="bg-[#F4F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between pb-2">
        <div className="h-8 w-8" />
        <h1 className="text-[1rem] font-bold">Select an option</h1>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close options"
          className="grid h-8 w-8 place-items-center"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <ActionList className="mt-4">
        {business.serialNumber && (
          <ActionListItem
            href={`/pay/${business.serialNumber}`}
            icon={<ArrowRightCircle strokeWidth={1.5} size={24} />}
            title={`Pay ${business.businessName}`}
            trailing={null}
            onClick={closeDrawer}
          />
        )}
        <ActionListItem
          icon={<Receipt strokeWidth={1.5} size={24} />}
          title="View receipts"
          trailing={null}
          onClick={() => {
            onViewActivity()
            closeDrawer()
          }}
        />
      </ActionList>

      <ActionList className="mt-4">
        {business.phoneNumber && (
          <>
            <ActionListItem
              href={`tel:${business.phoneNumber}`}
              icon={<Phone strokeWidth={1.5} size={24} />}
              title="Talk to someone"
              trailing={null}
              onClick={closeDrawer}
            />
            <ActionListItem
              href={`sms:${business.phoneNumber}`}
              icon={<MessageCircle strokeWidth={1.5} size={24} />}
              title="Send a message"
              trailing={null}
              onClick={closeDrawer}
            />
          </>
        )}
        <ActionListItem
          icon={<MessageSquareHeart strokeWidth={1.5} size={24} />}
          title="View feedback"
          trailing={null}
          onClick={() => {
            onViewFeedback()
            closeDrawer()
          }}
        />
        <ActionListItem
          icon={
            <Heart
              strokeWidth={1.5}
              size={24}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          }
          title={isFavorite ? 'Remove from Faves' : 'Add to Faves'}
          trailing={null}
          onClick={toggleFavorite}
        />
      </ActionList>

      <ActionList className="mt-4">
        <ActionListItem
          icon={<Info strokeWidth={1.5} size={24} />}
          title={`About ${business.businessName}`}
          trailing={null}
          onClick={() => {
            onViewAbout()
            closeDrawer()
          }}
        />
        <ActionListItem
          icon={<Share strokeWidth={1.5} size={24} />}
          title="Share profile"
          trailing={null}
          onClick={() => void onShare().finally(closeDrawer)}
        />
      </ActionList>
    </div>
  )
}
