'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Archive,
  ArrowLeft,
  Bell,
  ChevronRight,
  CircleCheck,
  Phone,
  PlusCircle,
} from 'lucide-react'
import {
  AppCard,
  ClockGradientIcon,
  StatusBadge,
  TabSwitch,
  showNotificationToast,
} from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDrawerStore } from '@/services/drawer'
import { useArchiveCustomerOutstandingSales } from '@/services/sales/hooks'
import type { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'
import { getSaleSubject } from '@/lib/utils/sales'

interface CustomerDebtListProps {
  customerId: string
  customerName: string
  customerPhone: string
  customerAvatar?: string
  customerTotalOwed: number
  unpaidSales: Sale[]
  repaidSales: Sale[]
  onSelectSale: (id: string) => void
  onArchived: () => void
  onBack: () => void
}

type DebtTab = 'unpaid' | 'repaid'

const TAB_OPTIONS = [
  { label: 'UNPAID', value: 'unpaid' },
  { label: 'REPAID', value: 'repaid' },
] satisfies Array<{ label: string; value: DebtTab }>

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CustomerDebtList({
  customerId,
  customerName,
  customerPhone,
  customerAvatar,
  customerTotalOwed,
  unpaidSales,
  repaidSales,
  onSelectSale,
  onArchived,
  onBack,
}: CustomerDebtListProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const archiveOutstanding = useArchiveCustomerOutstandingSales()
  const [activeTab, setActiveTab] = useState<DebtTab>('unpaid')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  const activeSales = activeTab === 'unpaid' ? unpaidSales : repaidSales
  const activeCount = activeSales.length
  const phoneHref = customerPhone
    ? `tel:${customerPhone.replace(/[^\d+]/g, '')}`
    : undefined
  const recordRepaymentHref = `/record-repayment?${new URLSearchParams({
    customerId,
    returnTo: `/outstanding?customerId=${customerId}`,
  }).toString()}`

  const handleSendAggregateReminder = () => {
    if (unpaidSales.length === 0) return

    const simulatedSale = {
      _id: unpaidSales[0]._id,
      customerId: unpaidSales[0].customerId,
      amount: customerTotalOwed,
      amountPaid: 0,
      balanceOwed: customerTotalOwed,
      description: `Sale for ${customerName}`,
      reference: unpaidSales[0].reference || 'repayment',
      recordedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'OUTSTANDING' as const,
      customerPhone,
    }

    openDrawer({
      type: 'send-reminder',
      props: { sale: simulatedSale },
    })
  }

  const handleArchiveOutstanding = async () => {
    try {
      const result = await archiveOutstanding.mutateAsync(customerId)
      showNotificationToast({
        message:
          result.count === 1
            ? '1 outstanding payment archived'
            : `${result.count} outstanding payments archived`,
        mode: 'success',
      })
      onArchived()
    } catch (error: unknown) {
      showNotificationToast({
        message:
          (
            error as {
              response?: { data?: { message?: string } }
            }
          ).response?.data?.message ||
          'Could not archive these payments. Try again.',
        mode: 'error',
      })
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F6F8]">
      <header className="flex justify-between shrink-0 items-center px-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 text-black" />
        </button>

        <TabSwitch
          value={activeTab}
          onChange={setActiveTab}
          options={TAB_OPTIONS}
          bgClassName="bg-[#E6E8EB]"
          maxW="max-w-[220px]"
          className="mx-auto w-full"
        />

        {phoneHref ? (
          <a
            href={phoneHref}
            aria-label={`Call ${customerName}`}
            className="flex h-8 w-8 items-center justify-center"
          >
            <Phone className="h-6 w-6 text-black" strokeWidth={2} />
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Customer phone number unavailable"
            className="flex h-8 w-8 items-center justify-center opacity-30"
          >
            <Phone className="h-6 w-6 text-black" strokeWidth={2} />
          </button>
        )}
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto">
        <section className="flex flex-col items-center px-3 pt-9 text-center">
          <div className="h-24 w-24 rounded-full shadow-[0px_3px_2px_0px_#00000005]">
            <Image
              src={customerAvatar || '/images/default_avatar.png'}
              alt={customerName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-4 text-[32px] font-bold -tracking-[0.4px] text-black">
            {customerName}
          </h1>
        </section>

        <div className="px-3 pt-6">
          <AppCard
            rounded="12"
            padding="md"
            className="flex items-center justify-between py-3.75"
          >
            <span className="text-sm font-medium text-[#00000080]">
              Total outstanding
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-linear-to-br from-[#FB5012] to-[#D72483] bg-clip-text text-sm font-bold text-transparent">
                NGN {formatCurrency(customerTotalOwed)}
              </span>
              <ChevronRight className="h-4 w-4 text-[#F43F5E]" />
            </span>
          </AppCard>
        </div>

        {unpaidSales.length > 0 && (
          <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
            <Link
              href={recordRepaymentHref}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
            >
              <PlusCircle size={18} />
              RECORD REPAYMENT
            </Link>
            <button
              type="button"
              onClick={handleSendAggregateReminder}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
            >
              <Bell size={18} />
              SEND REMINDER
            </button>
            <button
              type="button"
              onClick={() => setArchiveDialogOpen(true)}
              disabled={archiveOutstanding.isPending}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
            >
              <Archive size={18} />
              ARCHIVE
            </button>
          </div>
        )}

        <div className="mx-4 my-5 border-t border-[#F1F1F1]" />

        <section className="px-3">
          <h2 className="mb-3 text-[14px] font-bold -tracking-[0.4px] text-black">
            {activeCount}{' '}
            {activeTab === 'unpaid'
              ? `payment${activeCount === 1 ? '' : 's'} outstanding`
              : `payment${activeCount === 1 ? '' : 's'} repaid`}
          </h2>

          {activeSales.length > 0 ? (
            <AppCard rounded="16" divided>
              {activeSales.map((sale) => {
                const isUnpaid = activeTab === 'unpaid'
                const amount = isUnpaid
                  ? (sale.balanceOwed ??
                    Math.max(0, (sale.amount || 0) - (sale.amountPaid || 0)))
                  : (sale.amountPaid ?? sale.amount ?? 0)
                const dateText = isUnpaid
                  ? sale.dueDate
                    ? `Due on ${formatDate(sale.dueDate)}`
                    : 'No due date'
                  : formatDate(sale.recordedAt || sale.createdAt)

                return (
                  <button
                    key={sale._id}
                    type="button"
                    onClick={() => onSelectSale(sale._id)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-[#F8F9FA]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isUnpaid ? 'bg-[#FEEDEA]' : 'bg-[#24C166]/10'
                      }`}
                    >
                      {isUnpaid ? (
                        <ClockGradientIcon size={20} strokeWidth={2} />
                      ) : (
                        <CircleCheck
                          size={20}
                          className="text-[#24C166]"
                          strokeWidth={2}
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-[#111827]">
                        {getSaleSubject(sale)}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-[#6B7280]">
                        {dateText}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="flex flex-col items-end">
                        <span className="text-[13px] font-bold text-[#111827]">
                          ₦{formatCurrency(amount)}
                        </span>
                        <StatusBadge
                          status={isUnpaid ? 'OUTSTANDING' : 'CONFIRMED'}
                          variant="text"
                        />
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#C1C1C1]" />
                    </span>
                  </button>
                )
              })}
            </AppCard>
          ) : (
            <AppCard
              rounded="16"
              padding="lg"
              className="text-center text-sm font-medium text-[#00000066]"
            >
              {activeTab === 'unpaid'
                ? 'No unpaid payments.'
                : 'No repayments recorded yet.'}
            </AppCard>
          )}

          <p className="my-6 text-center text-xs font-medium text-[#00000066]">
            You’ve reached the end of the list
          </p>
        </section>
      </div>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive outstanding payments?"
        description={`This will remove ${unpaidSales.length} outstanding payment${unpaidSales.length === 1 ? '' : 's'} for ${customerName} from your active records.`}
        confirmLabel="Archive"
        variant="danger"
        isLoading={archiveOutstanding.isPending}
        onConfirm={handleArchiveOutstanding}
      />
    </div>
  )
}
