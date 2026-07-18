'use client'

import { useMemo } from 'react'
import {
  Package,
  RotateCcw,
  Heart,
  Info,
  Share,
  Download,
  Clock,
  Flag,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrawerStore } from '@/services/drawer'
import { CustomerSale } from '@/services/sales/interface'
import {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
} from '@/services/favorites'
import {
  ActionList,
  ActionListItem,
  CircularIconButton,
  TagFooter,
  showNotificationToast,
} from '../ui'
import { resolveSaleMerchant } from '@/lib/utils/customer-sale'

interface ActivityOptionsDrawerProps {
  sale: CustomerSale
  closeDrawer: () => void
}

export function ActivityOptionsDrawer({ sale }: ActivityOptionsDrawerProps) {
  const router = useRouter()
  const { closeDrawer: storeCloseDrawer, closeAllDrawers } = useDrawerStore()

  const merchant = resolveSaleMerchant(sale)
  const businessName = merchant.businessName || 'this business'

  const { data: favoritesData } = useFavorites()
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const isFaved = useMemo(
    () =>
      Boolean(
        merchant.id &&
          favoritesData?.favorites?.some((f) => f.id === merchant.id),
      ),
    [favoritesData, merchant.id],
  )

  const close = () => storeCloseDrawer('activity-options')

  const handleToggleFave = () => {
    if (!merchant.id) {
      showNotificationToast({ message: 'This business can’t be saved yet' })
      close()
      return
    }
    if (isFaved) {
      removeFavorite.mutate(merchant.id)
      showNotificationToast({ message: `${businessName} removed from Faves` })
    } else {
      addFavorite.mutate(merchant.id)
      showNotificationToast({ message: `${businessName} added to Faves` })
    }
    close()
  }

  const handlePayAgain = () => {
    if (sale.serialNumber) {
      closeAllDrawers()
      router.push(`/pay/${sale.serialNumber}`)
    } else {
      showNotificationToast({ message: 'Coming soon' })
      close()
    }
  }

  const handleShareReceipt = () => {
    close()
    if (navigator.share) {
      navigator.share({ title: 'Firespot Receipt', url: window.location.href })
    }
  }

  return (
    <div className="flex flex-col h-full font-satoshi">
      <header className="px-4 mb-2 flex justify-between items-center relative w-full h-13">
        <div className="w-full text-center">
          <h2 className="text-[17px] font-bold text-black leading-none">
            Select an option
          </h2>
        </div>
        <CircularIconButton icon="x" onClick={close} />
      </header>

      <div className="flex flex-col gap-4 px-3 pb-2">
        <ActionList>
          <ActionListItem
            icon={<Package size={24} className="text-[#111827] stroke-[2.2px]" />}
            title="View items"
            onClick={() => {
              showNotificationToast({ message: 'Coming soon' })
              close()
            }}
          />
          <ActionListItem
            icon={
              <RotateCcw size={24} className="text-[#111827] stroke-[2.2px]" />
            }
            title={`Pay ${businessName} again`}
            onClick={handlePayAgain}
          />
          <ActionListItem
            icon={
              <Heart
                size={24}
                className="text-[#111827] stroke-[2.2px]"
                fill={isFaved ? '#111827' : 'none'}
              />
            }
            title={isFaved ? 'Remove from Faves' : 'Add business to Faves'}
            onClick={handleToggleFave}
          />
          <ActionListItem
            icon={<Info size={24} className="text-[#111827] stroke-[2.2px]" />}
            title={`About ${businessName}`}
            onClick={() => {
              showNotificationToast({ message: 'Coming soon' })
              close()
            }}
          />
        </ActionList>

        <ActionList>
          <ActionListItem
            icon={<Share size={24} className="text-[#111827] stroke-[2.2px]" />}
            title="Share receipt"
            onClick={handleShareReceipt}
          />
          <ActionListItem
            icon={
              <Download size={24} className="text-[#111827] stroke-[2.2px]" />
            }
            title="Download receipt"
            onClick={() => {
              close()
              window.print()
            }}
          />
          <ActionListItem
            icon={<Clock size={24} className="text-[#111827] stroke-[2.2px]" />}
            title="View past activity"
            onClick={close}
          />
          <ActionListItem
            icon={
              <Flag size={24} className="text-[#FF3B30] stroke-[2.2px]" />
            }
            title="Report issue"
            danger
            onClick={() => {
              showNotificationToast({ message: 'Coming soon' })
              close()
            }}
          />
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
