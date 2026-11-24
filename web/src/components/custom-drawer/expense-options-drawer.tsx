'use client'

import { Archive, Download, PencilLine, PlusCircle, Share } from 'lucide-react'
import { ActionList, ActionListItem, CircularIconButton, TagFooter } from '../ui'
import type { Expense } from '@/services/expenses'

interface ExpenseOptionsDrawerProps {
  expense: Expense
  closeDrawer: () => void
  onRecordRepayment: () => void
  onShareReceipt: () => Promise<void> | void
  onDownloadReceipt: () => Promise<void> | void
  isReceiptShareReady: boolean
  onEdit: () => void
  onArchive: () => void
}

const iconClass = (enabled: boolean) =>
  enabled ? 'text-[#111827] stroke-[2.2px]' : 'text-gray-200 stroke-[2.2px]'

/** The ⋮ menu on an expense's details, laid out like a sale's options. */
export function ExpenseOptionsDrawer({
  expense,
  closeDrawer,
  onRecordRepayment,
  onShareReceipt,
  onDownloadReceipt,
  isReceiptShareReady,
  onEdit,
  onArchive,
}: ExpenseOptionsDrawerProps) {
  const isArchived = Boolean(expense.isArchived)
  const isOwing = expense.status === 'OWING' && !isArchived
  const canEdit = !expense.hasBeenEdited && !isArchived

  return (
    <div className="flex h-full flex-col font-satoshi">
      <header className="relative mb-2 flex h-13 w-full items-center justify-between px-4">
        <div className="w-full text-center">
          <h2 className="text-[17px] leading-none font-bold text-black">
            Select an option
          </h2>
        </div>
        <CircularIconButton icon="x" onClick={closeDrawer} />
      </header>

      <div className="flex flex-col gap-4 px-3">
        {isOwing ? (
          <ActionList>
            <ActionListItem
              icon={<PlusCircle size={24} className={iconClass(true)} />}
              title="Record repayment"
              onClick={() => {
                closeDrawer()
                onRecordRepayment()
              }}
            />
          </ActionList>
        ) : (
          <ActionList>
            <ActionListItem
              icon={<Share size={24} className={iconClass(true)} />}
              title="Share receipt"
              disabled={!isReceiptShareReady}
              onClick={async () => {
                if (!isReceiptShareReady) return
                await onShareReceipt()
                closeDrawer()
              }}
            />
            <ActionListItem
              icon={<Download size={24} className={iconClass(true)} />}
              title="Download receipt"
              onClick={async () => {
                await onDownloadReceipt()
                closeDrawer()
              }}
            />
          </ActionList>
        )}

        <ActionList>
          <ActionListItem
            icon={<PencilLine size={24} className={iconClass(canEdit)} />}
            title="Edit expense"
            disabled={!canEdit}
            onClick={() => {
              closeDrawer()
              onEdit()
            }}
          />
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
            title="Archive expense"
            danger
            disabled={isArchived}
            onClick={() => {
              closeDrawer()
              onArchive()
            }}
          />
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
