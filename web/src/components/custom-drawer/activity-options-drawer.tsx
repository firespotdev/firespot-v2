'use client'

import { useMemo } from 'react'
import { useRouter } from '@bprogress/next/app'
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
import {
  ArrowClockwiseIcon,
  ClockCounterClockwiseIcon,
  CubeIcon,
  DownloadSimpleIcon,
  ExportIcon,
  HeartIcon,
} from '@phosphor-icons/react'

interface ActivityOptionsDrawerProps {
  sale: CustomerSale
  closeDrawer: () => void
  onShareReceipt?: () => Promise<void> | void
  onDownloadReceipt?: () => Promise<void> | void
  isReceiptShareReady?: boolean
  onViewPastActivity?: () => void
}

export function ActivityOptionsDrawer({
  sale,
  onShareReceipt,
  onDownloadReceipt,
  isReceiptShareReady = false,
  onViewPastActivity,
}: ActivityOptionsDrawerProps) {
  const router = useRouter()
  const {
    openDrawer,
    closeDrawer: storeCloseDrawer,
    closeAllDrawers,
  } = useDrawerStore()

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
      showNotificationToast({
        message: `${businessName} removed from Faves`,
        mode: 'success',
      })
    } else {
      addFavorite.mutate(merchant.id)
      showNotificationToast({
        message: `${businessName} added to Faves`,
        mode: 'success',
      })
    }
    close()
  }

  const handlePayAgain = () => {
    if (!sale.serialNumber) return
    closeAllDrawers()
    router.push(`/pay/${sale.serialNumber}`)
  }

  const handleShareReceipt = async () => {
    if (!onShareReceipt || !isReceiptShareReady) return
    await onShareReceipt()
    close()
  }

  const handleViewPastActivity = () => {
    closeAllDrawers()
    onViewPastActivity?.()
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
          {Boolean(sale.items?.length) && (
            <ActionListItem
              icon={<CubeIcon size={24} className="text-[#111827]" />}
              title="View items"
              onClick={() =>
                openDrawer({ type: 'sale-items', props: { items: sale.items } })
              }
              className="py-[13.5px]"
            />
          )}
          {sale.serialNumber && (
            <ActionListItem
              icon={<ArrowClockwiseIcon size={24} className="text-[#111827]" />}
              title={`Pay ${businessName} again`}
              onClick={handlePayAgain}
              className="py-[13.5px]"
            />
          )}
          <ActionListItem
            icon={
              <HeartIcon
                size={24}
                className="text-[#111827] "
                fill={isFaved ? '#111827' : 'none'}
              />
            }
            title={isFaved ? 'Remove from Faves' : 'Add business to Faves'}
            onClick={handleToggleFave}
            className="py-[13.5px]"
          />
        </ActionList>

        <ActionList>
          <ActionListItem
            icon={<ExportIcon size={24} className="text-[#111827] " />}
            title="Share receipt"
            onClick={handleShareReceipt}
            disabled={!onShareReceipt || !isReceiptShareReady}
          />
          <ActionListItem
            icon={<DownloadSimpleIcon size={24} className="text-[#111827] " />}
            title="Download receipt"
            onClick={async () => {
              await onDownloadReceipt?.()
              close()
            }}
          />
          {onViewPastActivity && (
            <ActionListItem
              icon={
                <ClockCounterClockwiseIcon
                  size={24}
                  className="text-[#111827] "
                />
              }
              title="View past activity"
              onClick={handleViewPastActivity}
            />
          )}
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
