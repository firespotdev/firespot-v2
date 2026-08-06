'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Receipt,
  Star,
  Users,
} from 'lucide-react'
import { useCustomerDetails } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import {
  ActionList,
  ActionListItem,
  EmptyState,
  GreenSpinner,
  showNotificationToast,
} from '@/components/ui'
import { MerchantAvatar, OverlappingAvatars } from '@/components/layout'
import { useAuthStore } from '@/services/auth'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace('NGN', '₦')
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeAndDate(dateStr?: string | Date) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${time} . ${date}`
}

function groupItemsByMonthYear<T extends { createdAt?: string | Date }>(
  items: T[],
) {
  const groups: Record<string, T[]> = {}
  items.forEach((item) => {
    if (!item.createdAt) return
    const d = new Date(item.createdAt)
    const monthYear = d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    if (!groups[monthYear]) {
      groups[monthYear] = []
    }
    groups[monthYear].push(item)
  })
  return groups
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const customerId = resolvedParams.id

  const user = useAuthStore((state) => state.user)
  const { data, isLoading } = useCustomerDetails(customerId)
  const { openDrawer } = useDrawerStore()

  const [activeTab, setActiveTab] = useState<'history' | 'feedback' | 'about'>(
    'history',
  )

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F4F6F8]">
        <GreenSpinner innerBg="#f4f6f8" />
      </div>
    )
  }

  if (!data || !data.customer) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F6F8] font-satoshi px-4 text-center">
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

  const {
    customer,
    visitCount,
    totalSpent,
    totalOutstanding,
    sales,
    feedback,
  } = data

  const handleMessage = () => {
    if (customer.phoneNumber) {
      window.location.href = `sms:${customer.phoneNumber}`
    } else {
      showNotificationToast({
        message: 'No phone number available to message.',
        mode: 'error',
      })
    }
  }

  const handleCall = () => {
    if (customer.phoneNumber) {
      window.location.href = `tel:${customer.phoneNumber}`
    } else {
      showNotificationToast({
        message: 'No phone number available to call.',
        mode: 'error',
      })
    }
  }

  const handleReengage = () => {
    {
    }
  }

  const groupedSales = groupItemsByMonthYear(sales || [])
  const groupedFeedback = groupItemsByMonthYear(feedback || [])

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-4 pb-12">
        {/* Header */}
        <header className="flex items-center justify-between py-2.5">
          <Link
            href="/customers"
            aria-label="Back to customers"
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <ArrowLeft color="black" strokeWidth={2} size={24} />
          </Link>
          {/* <button
            type="button"
            aria-label="Customer options"
            onClick={() =>
              openDrawer({
                type: 'transaction-options',
                props: { customer },
              })
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <MoreHorizontal size={24} color="black" />
          </button> */}
          <div className="w-6"></div>
        </header>

        {/* Profile Header */}
        <div className="flex flex-col items-start">
          <MerchantAvatar
            profilePhotoUrl={customer.profilePhotoUrl}
            size={96}
            className="mb-4"
          />
          <h1 className="text-[20px] font-bold -tracking-[0.4px] text-black">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#00000080]">
            Visited your store {visitCount}{' '}
            {visitCount === 1 ? 'time' : 'times'}
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex w-full items-center gap-2">
            <button
              type="button"
              onClick={handleReengage}
              className="flex-1 rounded-full bg-black py-2 px-4 text-center text-sm font-medium text-white transition-all hover:bg-black/90 cursor-pointer"
            >
              Re-engage
            </button>
            <button
              type="button"
              onClick={handleMessage}
              className="shrink-0 rounded-full bg-[#E5E7EB] py-2 px-5 text-center text-sm font-medium text-black transition-all hover:bg-black/10 cursor-pointer"
            >
              Message
            </button>
            <button
              type="button"
              onClick={handleCall}
              className="shrink-0 rounded-full bg-[#E5E7EB] py-2 px-5 text-center text-sm font-medium text-black transition-all hover:bg-black/10 cursor-pointer"
            >
              Call
            </button>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="mt-7.5 flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-[13px] font-bold transition-colors relative ${
              activeTab === 'history' ? 'text-black' : 'text-[#00000066]'
            }`}
          >
            History
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-black" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`pb-3 text-[13px] font-bold transition-colors relative ${
              activeTab === 'feedback' ? 'text-black' : 'text-[#00000066]'
            }`}
          >
            Feedback
            {activeTab === 'feedback' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-black" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`pb-3 text-[13px] font-bold transition-colors relative ${
              activeTab === 'about' ? 'text-black' : 'text-[#00000066]'
            }`}
          >
            About
            {activeTab === 'about' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-black" />
            )}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'history' && (
          <div className="mt-4 flex flex-col">
            {/* Metric Summary Card 1: Total Spent */}
            <ActionList rounded="12" className="mb-3">
              <ActionListItem
                icon={
                  <OverlappingAvatars
                    primaryPhotoUrl={customer.profilePhotoUrl}
                    secondaryPhotoUrl={user?.profilePhotoUrl}
                    bankName={user?.bankName}
                  />
                }
                title={
                  <span className="text-[16px] font-bold text-black">
                    {formatCurrency(totalSpent)}
                  </span>
                }
                subtitle="Spent in total at your store"
                className="p-3"
              />
            </ActionList>

            {/* Metric Summary Card 2: Outstanding */}
            <ActionList rounded="12" className="mb-5">
              <ActionListItem
                icon={
                  <OverlappingAvatars
                    primaryPhotoUrl={customer.profilePhotoUrl}
                    secondaryPhotoUrl={user?.profilePhotoUrl}
                    bankName={user?.bankName}
                  />
                }
                title={
                  <span
                    className="text-[16px] font-bold"
                    style={{
                      background:
                        'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {formatCurrency(totalOutstanding)}
                  </span>
                }
                subtitle="Outstanding"
                className="p-3"
              />
            </ActionList>

            {/* Transaction Timeline Grouped by Month */}
            {Object.keys(groupedSales).length === 0 ? (
              <div className="py-6">
                <EmptyState
                  emoji={
                    <div className="relative mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF3FE]">
                      <Receipt
                        className="h-8 w-8 text-[#407BFF]"
                        strokeWidth={1.8}
                      />
                    </div>
                  }
                  title="No transactions yet"
                  details="No transactions recorded for this customer yet."
                  cta={null}
                />
              </div>
            ) : (
              Object.entries(groupedSales).map(([monthYear, monthSales]) => (
                <div key={monthYear} className="mb-4">
                  <h3 className="mb-2 text-[15px] font-bold text-black">
                    {monthYear}
                  </h3>
                  <ActionList rounded="12">
                    {monthSales.map(
                      (sale: {
                        _id: string
                        status?: string
                        balanceOwed?: number
                        amount?: number
                        createdAt?: string | Date
                      }) => {
                        const isPaid = sale.status === 'CONFIRMED'
                        const isUnconfirmed = sale.status === 'PENDING'
                        const isOwing =
                          sale.status === 'OUTSTANDING' ||
                          (sale.balanceOwed && sale.balanceOwed > 0)

                        const statusLabel = isPaid
                          ? 'Paid'
                          : isUnconfirmed
                            ? 'Unconfirmed'
                            : 'Owing'

                        return (
                          <ActionListItem
                            key={sale._id}
                            onClick={() =>
                              openDrawer({
                                type: 'transaction-details',
                                props: { sale },
                              })
                            }
                            icon={
                              <MerchantAvatar
                                profilePhotoUrl={customer.profilePhotoUrl}
                                size={36}
                              />
                            }
                            title={
                              <span className="text-[14px] font-bold text-black">
                                {customer.name}
                              </span>
                            }
                            subtitle={formatDate(sale.createdAt)}
                            className="p-3"
                            trailing={
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-[14px] font-bold text-black">
                                    {formatCurrency(sale.amount || 0)}
                                  </p>
                                  <p
                                    className="text-[11px] font-medium text-right"
                                    style={
                                      isPaid
                                        ? { color: '#24C166' }
                                        : {
                                            background:
                                              'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                          }
                                    }
                                  >
                                    {statusLabel}
                                  </p>
                                </div>
                                <ChevronRight
                                  size={16}
                                  className="text-[#AEAEB2] stroke-[2.5px]"
                                />
                              </div>
                            }
                          />
                        )
                      },
                    )}
                  </ActionList>
                </div>
              ))
            )}

            {Object.keys(groupedSales).length > 0 && (
              <p className="mt-4 mb-4 text-center text-xs font-medium text-[#00000066]">
                You’ve reached the end of the list
              </p>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="mt-5 flex flex-col gap-4">
            {Object.keys(groupedFeedback).length === 0 ? (
              <div className="py-6">
                <EmptyState
                  emoji={
                    <span
                      className="text-[64px] leading-none mb-1"
                      role="img"
                      aria-label="Speech bubble"
                    >
                      💬
                    </span>
                  }
                  cta={null}
                  title="No feedback yet"
                  details="No feedback received from this customer yet."
                />
              </div>
            ) : (
              Object.entries(groupedFeedback).map(([monthYear, fbList]) => (
                <div key={monthYear} className="mt-2">
                  <h3 className="mb-3 text-sm font-bold text-black">
                    {monthYear}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {fbList.map(
                      (fb: {
                        _id: string
                        customerPhotoUrl?: string
                        rating?: number
                        createdAt?: string | Date
                        comment?: string
                      }) => (
                        <div
                          key={fb._id}
                          className="rounded-[16px] border border-[#F1F1F1] bg-white p-4 shadow-[0px_4px_8px_0px_#0000000A]"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <MerchantAvatar
                              profilePhotoUrl={
                                fb.customerPhotoUrl || customer.profilePhotoUrl
                              }
                              size={40}
                            />
                            <div>
                              <p className="text-[15px] font-bold leading-tight text-black">
                                {customer.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {/* Rating Stars */}
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3.5 w-3.5 ${
                                        star <= (fb.rating || 5)
                                          ? 'fill-[#FFB800] text-[#FFB800]'
                                          : 'fill-[#E0E0E0] text-[#E0E0E0]'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-[#00000066]">
                                  {formatTimeAndDate(fb.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm font-medium text-[#000000CC] leading-relaxed mt-2">
                            {fb.comment}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))
            )}

            {Object.keys(groupedFeedback).length > 0 && (
              <p className="mt-6 text-center text-xs font-medium text-[#00000066]">
                You’ve reached the end of the list
              </p>
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="mt-5 rounded-[16px] border border-[#F1F1F1] bg-white p-5 shadow-[0px_4px_8px_0px_#0000000A] space-y-4">
            <div>
              <p className="text-xs font-medium text-[#00000066]">
                Phone number
              </p>
              <p className="text-base font-bold text-black mt-0.5">
                {customer.phoneNumber || 'N/A'}
              </p>
            </div>
            <div className="border-t border-[#EBEBEB] pt-3">
              <p className="text-xs font-medium text-[#00000066]">
                Customer ID
              </p>
              <p className="text-sm font-mono font-medium text-black mt-0.5">
                {customer._id}
              </p>
            </div>
            <div className="border-t border-[#EBEBEB] pt-3">
              <p className="text-xs font-medium text-[#00000066]">Added on</p>
              <p className="text-sm font-medium text-black mt-0.5">
                {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
