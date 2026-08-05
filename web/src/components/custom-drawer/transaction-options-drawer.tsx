'use client'

import {
  Archive,
  Download,
  PencilLine,
  Share,
  Mail,
  Wallet,
  RotateCcw,
  PlusCircle,
  Bell,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
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
}

export function TransactionOptionsDrawer({
  sale,
  closeDrawer,
}: TransactionOptionsDrawerProps) {
  const router = useRouter()
  const { openDrawer, closeDrawer: storeCloseDrawer } = useDrawerStore()

  const merchantStatus = getMerchantStatus(sale)
  const isPaidCollected =
    (sale.isCollection ||
      sale.source === 'QR scan' ||
      sale.source === 'Link shared') &&
    merchantStatus === 'Paid'

  const isConfirmed = sale.status === 'CONFIRMED' || !sale.status
  const isOutstanding =
    merchantStatus === 'Owing' ||
    (sale.balanceOwed !== undefined &&
      sale.balanceOwed > 0 &&
      !sale.isPaidInFull)
  const isArchived = merchantStatus === 'Archived'
  const creationDate = new Date(
    sale.createdAt || sale.recordedAt || Date.now(),
  ).getTime()
  const isEditWindowOpen =
    !sale.hasBeenEdited && Date.now() - creationDate <= 24 * 60 * 60 * 1000
  const isEditable = isConfirmed && isEditWindowOpen && !isArchived

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
                closeDrawer()
                router.push(`/record-repayment?id=${sale._id}`)
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
              onClick={() => {
                closeDrawer()
                if (navigator.share) {
                  navigator.share({
                    title: 'Firespot Receipt',
                    url: window.location.href,
                  })
                }
              }}
            />
            <ActionListItem
              icon={
                <Download size={24} className="text-[#111827] stroke-[2.2px]" />
              }
              title="Download receipt"
              onClick={() => {
                closeDrawer()
                window.print()
              }}
            />
          </ActionList>
        )}

        {/* Card 2: Edit & Archive/Refund Actions */}
        <ActionList>
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
          {isPaidCollected ? (
            <ActionListItem
              icon={
                <RotateCcw
                  size={24}
                  className="text-[#FF3B30] stroke-[2.2px]"
                />
              }
              title="Refund sale"
              danger
              onClick={() => {
                storeCloseDrawer('transaction-options')
                showNotificationToast({
                  message:
                    'Refund feature initiated for this collected payment',
                })
              }}
            />
          ) : (
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
          )}
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
