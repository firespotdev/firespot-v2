'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ChevronRight, Search } from 'lucide-react'
import { LoaderCircle, StatusBadge, EmptyState } from '@/components/ui'
import { usePayouts, type SettlementItem } from '@/services/payouts'
import { BackButton } from '@/components/ui/back-button'
import { useSafeBack } from '@/hooks/use-safe-back'

function formatNaira(amount: number): string {
  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PayoutsPage() {
  const router = useRouter()
  const handleBack = useSafeBack('/profile')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: payoutsData, isLoading, isError } = usePayouts()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  const settlements = payoutsData?.settlements || []
  const nextPayout = payoutsData?.nextPayout
  const hasSubaccount = payoutsData?.hasSubaccount ?? true
  const unavailableReason = payoutsData?.unavailableReason

  // Filter settlements by reference number or search query
  const filteredSettlements = settlements.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.id.toString().includes(q) ||
      s.amount.toString().includes(q) ||
      s.settlementDate.toLowerCase().includes(q)
    )
  })

  // Group settlements by month
  const monthGroups = filteredSettlements.reduce<Record<string, SettlementItem[]>>(
    (groups, item) => {
      const monthKey = item.monthGroup || 'Earlier'
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(item)
      return groups
    },
    {},
  )

  return (
    <div className="min-h-dvh bg-[#F5F6F8] font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between py-3.5">
          <BackButton onClick={handleBack} className="-m-2.5" />
          <h1 className="text-[20px] font-bold -tracking-[0.4px] text-black">
            Payouts
          </h1>
          <span className="h-6 w-6" aria-hidden="true" />
        </header>

        {/* Search */}
        <div className="py-2 flex gap-2">
          <label className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[#E6E8EB99] px-4">
            <Search size={16} className="shrink-0 text-[#9B9B9B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settlement number"
              className="min-w-0 flex-1 text-base font-medium text-black outline-none placeholder:text-[#00000066]"
            />
          </label>
        </div>

        {isError && (
          <div className="mt-6 rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-medium text-[#991B1B]">
            Payout history is temporarily unavailable. Please try again.
          </div>
        )}

        {/* Next Payout Row (if available) */}
        {nextPayout && (
          <div className="mt-3 bg-white rounded-[16px] border border-[#E6E8EB] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#64748B] font-bold uppercase tracking-[0.5px]">
                  Next Payout
                </p>
                <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
                  {nextPayout.dateLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="font-bold text-base text-[#0F172A]">
                    + ₦{formatNaira(nextPayout.amount)}
                  </p>
                  <div className="flex justify-end mt-0.5">
                    <StatusBadge status="PENDING" label={nextPayout.status} />
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9CA3AF] shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isError && (!hasSubaccount || filteredSettlements.length === 0) ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 text-center my-12">
            <EmptyState
              emoji={<span className="text-[64px] leading-none">😢</span>}
              title={
                unavailableReason === 'no_bank'
                  ? 'Add a payout account'
                  : unavailableReason === 'no_plan'
                    ? 'Choose a business plan'
                    : unavailableReason === 'provisioning_failed'
                      ? 'Payout setup is delayed'
                      : 'No payouts yet'
              }
              details={
                unavailableReason === 'no_bank'
                  ? 'Add a verified bank account so Paystack can settle your collections directly.'
                  : unavailableReason === 'no_plan'
                    ? 'Payouts are available on every Firespot Business plan, including LITE.'
                    : unavailableReason === 'provisioning_failed'
                      ? 'We could not finish setting up your payout account. Please try again shortly.'
                      : 'You would see your payout history here when you start collecting payments with Firespot.'
              }
              cta={null}
            />
          </div>
        ) : (
          /* Settlement Groups by Month */
          <div className="flex flex-col gap-6 mt-4">
            {Object.entries(monthGroups).map(([monthName, items]) => (
              <div key={monthName} className="flex flex-col gap-2">
                <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-[0.5px] px-1">
                  {monthName}
                </h2>

                <div className="bg-white rounded-[16px] border border-[#E6E8EB] overflow-hidden shadow-xs divide-y divide-[#F1F5F9]">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/payouts/${item.id}`)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors text-left"
                    >
                      <div>
                        <p className="font-bold text-base text-[#0F172A]">
                          EOD Settlement
                        </p>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">
                          {new Date(item.settlementDate).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' },
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <p className="font-bold text-base text-[#0F172A]">
                            + ₦{formatNaira(item.amount)}
                          </p>
                          <div className="flex justify-end mt-0.5">
                            <StatusBadge
                              status={
                                item.status === 'Paid'
                                  ? 'PAID'
                                  : item.status === 'Incoming'
                                    ? 'PENDING'
                                    : 'EDITED'
                              }
                              label={item.status}
                            />
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#9CA3AF] shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
