'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MoreHorizontal, TrendingUp } from 'lucide-react'
import {
  useCustomerDetails,
  useSetCustomerFavorite,
} from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import {
  ActionList,
  ActionListItem,
  GreenSpinner,
  showNotificationToast,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { CustomerProfileHeader } from '@/components/customers/customer-profile-header'
import { CustomerActivityTab } from '@/components/customers/customer-activity-tab'
import { CustomerFeedbackTab } from '@/components/customers/customer-feedback-tab'
import {
  customerStats,
  lastVisitedLabel,
} from '@/components/customers/customer-stats'

type CustomerTab = 'activity' | 'feedback'

const TABS: Array<{ value: CustomerTab; label: string }> = [
  { value: 'activity', label: 'Activity' },
  { value: 'feedback', label: 'Feedback' },
]

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: customerId } = use(params)
  const { data, isLoading } = useCustomerDetails(customerId)
  const setFavorite = useSetCustomerFavorite(customerId)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [activeTab, setActiveTab] = useState<CustomerTab>('activity')

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F4F6F8]">
        <GreenSpinner innerBg="#f4f6f8" />
      </div>
    )
  }

  if (!data?.customer) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F6F8] px-4 text-center font-satoshi">
        <h2 className="text-lg font-bold text-black">Customer not found</h2>
        <Link
          href="/customers"
          className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white"
        >
          Back to customers
        </Link>
      </div>
    )
  }

  const { customer, sales = [], feedback = [] } = data
  const stats = customerStats(sales)
  const firstName = customer.name.trim().split(/\s+/)[0]

  const openPhone = (scheme: 'tel' | 'sms') => {
    if (!customer.phoneNumber) {
      showNotificationToast({
        message: 'This customer has no phone number.',
        mode: 'error',
      })
      return
    }
    window.location.href = `${scheme}:${customer.phoneNumber}`
  }

  const recordSale = (startPartPaid = false) =>
    openDrawer({ type: 'record-sale', props: { customer, startPartPaid } })

  const toggleSaved = async () => {
    const next = !customer.isFavorite
    try {
      await setFavorite.mutateAsync(next)
      showNotificationToast({
        message: next ? `${firstName} saved` : `${firstName} removed from saved`,
        mode: 'success',
      })
    } catch {
      showNotificationToast({
        message: 'Could not update this customer. Please try again.',
        mode: 'error',
      })
    }
  }

  const openOptions = () =>
    openDrawer({
      type: 'customer-options',
      props: {
        onCall: () => openPhone('tel'),
        onMessage: () => openPhone('sms'),
        onRecordSale: () => recordSale(),
        onRecordOutstanding: () => recordSale(true),
      },
    })

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-4 pb-12">
        <header className="flex items-center justify-between py-2.5">
          <Link
            href="/customers"
            aria-label="Back to customers"
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <ArrowLeft color="black" strokeWidth={2} size={24} />
          </Link>
          <button
            type="button"
            aria-label="Customer options"
            onClick={openOptions}
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <MoreHorizontal size={24} color="black" />
          </button>
        </header>

        <CustomerProfileHeader
          customer={customer}
          purchases={stats.purchases}
          isSaving={setFavorite.isPending}
          onQuickSale={() => recordSale()}
          onToggleSaved={() => void toggleSaved()}
          onCall={() => openPhone('tel')}
          onMessage={() => openPhone('sms')}
        />

        {/* Re-engage has no action yet; the card only shows the last visit. */}
        <ActionList rounded="12" className="mt-6">
          <ActionListItem
            as="div"
            className="cursor-default p-3 hover:bg-white active:bg-white"
            icon={
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#38B6FF]">
                <TrendingUp size={22} strokeWidth={2.4} className="text-white" />
              </span>
            }
            title={
              <span className="text-[15px] font-bold text-black">
                Re-engage <span className="capitalize">{firstName}</span>
              </span>
            }
            subtitle={lastVisitedLabel(stats.lastVisitAt)}
          />
        </ActionList>

        <div
          className="mt-6 flex border-b border-[#E5E7EB]"
          role="tablist"
          aria-label="Customer sections"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'relative mr-6 pb-3 text-[15px] transition-colors',
                  isActive
                    ? 'font-bold text-black'
                    : 'font-medium text-[#8E8E93] hover:text-black',
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-black" />
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'activity' ? (
          <CustomerActivityTab customer={customer} sales={sales} stats={stats} />
        ) : (
          <CustomerFeedbackTab customer={customer} feedback={feedback} />
        )}
      </div>
    </div>
  )
}
