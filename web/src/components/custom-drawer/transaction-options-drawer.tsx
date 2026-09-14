'use client'

import {
  Archive,
  Download,
  PencilLine,
  Share,
  PlusCircle,
  Bell,
} from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'
import { getMerchantStatus } from '@/lib/utils/sales'
import {
  ActionList,
  ActionListItem,
  CircularIconButton,
  TagFooter,
  showNotificationToast,
} from '../ui'

interface TransactionOptionsDrawerProps {
  sale: Sale
  closeDrawer: () => void
  onShareReceipt?: () => Promise<void> | void
  onDownloadReceipt?: () => Promise<void> | void
  isReceiptShareReady?: boolean
}

export function TransactionOptionsDrawer({
  sale,
  closeDrawer,
  onShareReceipt,
  onDownloadReceipt,
  isReceiptShareReady = false,
}: TransactionOptionsDrawerProps) {
  const router = useRouter()
  const {
    openDrawer,
    closeDrawer: storeCloseDrawer,
    closeAllDrawers,
  } = useDrawerStore()

  const merchantStatus = getMerchantStatus(sale)
  const isPaidCollected =
    (sale.isCollection ||
      sale.source === 'QR scan' ||
      sale.source === 'Link shared') &&
    merchantStatus === 'Paid'

  const isCollected = Boolean(
    sale.isCollection ||
      sale.paymentRail === 'paystack' ||
      (sale.reference && sale.reference.startsWith('COL-')),
  )

  const isConfirmed = sale.status === 'CONFIRMED' || !sale.status
  const isOutstanding =
    merchantStatus === 'Owing' ||
    (sale.balanceOwed !== undefined &&
      sale.balanceOwed > 0 &&
      !sale.isPaidInFull)
  const isArchived = merchantStatus === 'Archived'
  const creationSource = sale.createdAt || sale.recordedAt
  const creationDate = creationSource ? new Date(creationSource).getTime() : 0
  // eslint-disable-next-line react-hooks/purity
  const openedAt = Date.now()
  const isEditWindowOpen =
    !sale.hasBeenEdited && openedAt - creationDate <= 24 * 60 * 60 * 1000
  const isEditable =
    isConfirmed && isEditWindowOpen && !isArchived && !isCollected

  return (
    <div className="flex flex-col h-full font-satoshi">
      <header className="px-4 mb-2 flex justify-between items-center relative w-full h-13">
        <div className="w-full text-center">
          <h2 className="text-[17px] font-bold text-black leading-none">
            Select an option
          </h2>
        </div>

        <CircularIconButton
          icon="x"
          onClick={() => storeCloseDrawer('transaction-options')}
        />
      </header>

      <div className="flex flex-col gap-4 px-3">
        {/* Card 1: Record Repayment & Send Reminder OR Share & Download */}
        {isOutstanding ? (
          <ActionList>
            <ActionListItem
              icon={
                <PlusCircle
                  size={24}
                  className="text-[#111827] stroke-[2.2px]"
                />
              }
              title="Record repayment"
              onClick={() => {
                closeAllDrawers()

                const params = new URLSearchParams({ id: sale._id })
                const customerId =
                  typeof sale.customerId === 'string'
                    ? sale.customerId
                    : sale.customerId?._id

                if (customerId) {
                  params.set('customerId', customerId)
                  params.set(
                    'returnTo',
                    `/outstanding?customerId=${customerId}`,
                  )
                }

                router.push(`/record-repayment?${params.toString()}`)
              }}
            />
            <ActionListItem
              icon={
                <Bell size={24} className="text-[#111827] stroke-[2.2px]" />
              }
              title="Send reminder"
              onClick={() => {
                storeCloseDrawer('transaction-options')
                openDrawer({
                  type: 'send-reminder',
                  props: { sale },
                })
              }}
            />
          </ActionList>
        ) : (
          <ActionList>
            <ActionListItem
              icon={
                <Share size={24} className="text-[#111827] stroke-[2.2px]" />
              }
              title="Share receipt"
              disabled={!onShareReceipt || !isReceiptShareReady}
              onClick={async () => {
                if (!onShareReceipt || !isReceiptShareReady) return
                await onShareReceipt()
                closeDrawer()
              }}
            />
            <ActionListItem
              icon={
                <Download size={24} className="text-[#111827] stroke-[2.2px]" />
              }
              title="Download receipt"
              onClick={async () => {
                if (onDownloadReceipt) {
                  await onDownloadReceipt()
                  closeDrawer()
                  return
                }
                storeCloseDrawer('transaction-options')
                openDrawer({
                  type: 'transaction-details',
                  props: { sale, autoDownloadReceipt: true },
                })
              }}
            />
          </ActionList>
        )}

        {/* Card 2: Edit & Archive Actions */}
        <ActionList>
          {!isCollected && (
            <ActionListItem
              icon={
                <PencilLine
                  size={24}
                  className={
                    isEditable
                      ? 'text-[#111827] stroke-[2.2px]'
                      : 'text-gray-200 stroke-[2.2px]'
                  }
                />
              }
              title="Edit sale"
              disabled={!isEditable}
              onClick={() => {
                closeDrawer()
                openDrawer({
                  type: 'record-sale',
                  props: { editId: sale._id, isEditMode: true },
                })
              }}
            />
          )}
          <ActionListItem
            icon={
              <Archive
                size={24}
                className={
                  isArchived
                    ? 'text-red-200 stroke-[2.2px]'
                    : 'text-[#FF3B30] stroke-[2.2px]'
                }
              />
            }
            title="Archive sale"
            danger
            disabled={isArchived}
            onClick={() => {
              storeCloseDrawer('transaction-options')
              openDrawer({
                type: 'confirm-archive',
                props: { sale },
              })
            }}
          />
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
