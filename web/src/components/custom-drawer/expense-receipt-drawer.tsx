'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Archive,
  Download,
  MoreHorizontal,
  MoreVertical,
  PencilLine,
  PlusCircle,
  Share,
} from 'lucide-react'
import {
  Button,
  CircularIconButton,
  ConfirmDialog,
  LoaderCircle,
  TagFooter,
  showNotificationToast,
} from '@/components/ui'
import {
  ExpenseDetailCards,
  ExpenseHero,
  isExpenseOwing,
} from '@/components/expenses/expense-receipt-parts'
import { useReceiptPNGShare } from '@/hooks/use-receipt-png-share'
import { formatCurrency } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date-time'
import { downloadElementAsPNG } from '@/lib/utils/pdf-download'
import { useDrawerStore } from '@/services/drawer'
import {
  useArchiveExpense,
  useExpense,
  type Expense,
} from '@/services/expenses'

interface Props {
  expenseId: string
  /** Opened straight after recording: shows the "recorded" headline. */
  justRecorded?: boolean
  closeDrawer: () => void
}

const PILL =
  'h-9 w-fit shrink-0 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3.5 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]'

export function ExpenseReceiptDrawer({
  expenseId,
  justRecorded = false,
  closeDrawer,
}: Props) {
  const { data: expense, isLoading, isError, refetch } = useExpense(expenseId)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="h-10 w-10">
          <LoaderCircle innerBg="#FFFFFF" />
        </div>
      </div>
    )
  }

  if (isError || !expense) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white px-6 text-center font-satoshi">
        <p className="text-sm font-medium text-[#6B7280]">
          Couldn&apos;t load this expense.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
          <Button onClick={closeDrawer}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <ExpenseReceipt
      expense={expense}
      justRecorded={justRecorded}
      closeDrawer={closeDrawer}
    />
  )
}

function ExpenseReceipt({
  expense,
  justRecorded,
  closeDrawer,
}: {
  expense: Expense
  justRecorded: boolean
  closeDrawer: () => void
}) {
  const {
    openDrawer,
    closeAllDrawers,
    closeDrawer: closeDrawerOfType,
  } = useDrawerStore()
  const archiveExpense = useArchiveExpense()
  const receiptRef = useRef<HTMLDivElement>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const isOwing = isExpenseOwing(expense)
  const canEdit = !expense.hasBeenEdited && !expense.isArchived
  const filename = `firespot-expense-${expense.reference}.png`

  const { shareReceipt, isPreparingReceipt, isSharingReceipt, isReceiptReady } =
    useReceiptPNGShare({
      receiptRef,
      cacheKey: `${expense._id}:${expense.amountPaid}:${expense.isArchived}`,
      filename,
      title: 'Firespot expense receipt',
      text: `Expense of NGN ${formatCurrency(expense.amount)} on ${formatDateTime(expense.recordedAt, { ordinalDay: true })}`,
    })

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current || isDownloading) return
    setIsDownloading(true)
    try {
      await downloadElementAsPNG(receiptRef.current, {
        filename,
        scale: 3,
        backgroundColor: '#FFFFFF',
      })
      showNotificationToast({ message: 'Receipt downloaded', mode: 'success' })
    } catch {
      showNotificationToast({
        message: 'Could not download the receipt. Please try again.',
        mode: 'error',
      })
    } finally {
      setIsDownloading(false)
    }
  }, [filename, isDownloading])

  const handleEdit = () => {
    closeAllDrawers()
    openDrawer({ type: 'new-expense', props: { expenseId: expense._id } })
  }

  const handleRepayment = () =>
    openDrawer({ type: 'expense-repayment', props: { expense } })

  const handleArchive = async () => {
    try {
      await archiveExpense.mutateAsync(expense._id)
      setConfirmArchive(false)
      showNotificationToast({ message: 'Expense archived', mode: 'success' })
    } catch {
      showNotificationToast({
        message: 'Could not archive this expense. Please try again.',
        mode: 'error',
      })
    }
  }

  const openOptions = () =>
    openDrawer({
      type: 'expense-options',
      props: {
        expense,
        closeDrawer: () => closeDrawerOfType('expense-options'),
        onRecordRepayment: handleRepayment,
        onShareReceipt: shareReceipt,
        onDownloadReceipt: handleDownload,
        isReceiptShareReady: isReceiptReady,
        onEdit: handleEdit,
        onArchive: () => setConfirmArchive(true),
      },
    })

  const shareButtons = (
    <>
      <Button
        variant="outline"
        className={PILL}
        onClick={() => void shareReceipt()}
        disabled={isPreparingReceipt || isSharingReceipt}
      >
        <Share size={16} />
        {isSharingReceipt ? 'SHARING…' : 'SHARE RECEIPT'}
      </Button>
      <Button
        variant="outline"
        className={PILL}
        onClick={() => void handleDownload()}
        disabled={isDownloading}
      >
        <Download size={16} />
        {isDownloading ? 'GENERATING…' : 'DOWNLOAD RECEIPT'}
      </Button>
    </>
  )

  const repaymentButton = (
    <Button variant="outline" className={PILL} onClick={handleRepayment}>
      <PlusCircle size={16} />
      RECORD REPAYMENT
    </Button>
  )

  return (
    <div className="flex h-full flex-col bg-white font-satoshi">
      <div className="flex shrink-0 items-center justify-between bg-white px-3 py-2">
        {justRecorded ? (
          <>
            <CircularIconButton
              icon={<MoreHorizontal size={20} />}
              size="sm"
              onClick={openOptions}
            />
            <span />
            <CircularIconButton icon="x" size="md" onClick={closeDrawer} />
          </>
        ) : (
          <>
            <CircularIconButton
              icon="arrow-left"
              size="md"
              onClick={closeDrawer}
            />
            <h2 className="text-base font-bold">Expense details</h2>
            <CircularIconButton
              icon={<MoreVertical size={20} />}
              size="sm"
              onClick={openOptions}
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div ref={receiptRef} className="flex flex-col items-center px-4 pt-6">
          <ExpenseHero expense={expense} justRecorded={justRecorded} />

          <div
            data-export-exclude
            data-vaul-no-drag
            className="scrollbar-hide mb-6 flex w-full touch-pan-x justify-center-safe gap-2 overflow-x-auto px-1"
          >
            {justRecorded ? (
              <>
                {isOwing ? repaymentButton : shareButtons}
                {canEdit && (
                  <Button variant="outline" className={PILL} onClick={handleEdit}>
                    <PencilLine size={16} />
                    EDIT
                  </Button>
                )}
                {!expense.isArchived && (
                  <Button
                    variant="outline"
                    className={PILL}
                    onClick={() => setConfirmArchive(true)}
                  >
                    <Archive size={16} />
                    ARCHIVE EXPENSE
                  </Button>
                )}
              </>
            ) : isOwing ? (
              <>
                {repaymentButton}
                {/* Stays in place once used up so the row keeps its pair. */}
                <Button
                  variant="outline"
                  className={PILL}
                  onClick={handleEdit}
                  disabled={!canEdit}
                >
                  <PencilLine size={16} />
                  EDIT EXPENSE
                </Button>
              </>
            ) : (
              shareButtons
            )}
          </div>

          <ExpenseDetailCards expense={expense} />
          <TagFooter />
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this expense?"
        description="It will leave your active list but stays in your records."
        confirmLabel="Archive"
        variant="warning"
        isLoading={archiveExpense.isPending}
        onConfirm={handleArchive}
      />
    </div>
  )
}
