'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ChevronRight, Search, X } from 'lucide-react'
import { ScrollIcon } from '@phosphor-icons/react'
import { Sort } from 'iconsax-reactjs'
import {
  EmptyState,
  Input,
  LoaderCircle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  StatusBadge,
} from '@/components/ui'
import { usePayouts, type SettlementItem } from '@/services/payouts'
import { useSafeBack } from '@/hooks/use-safe-back'

const payoutStatuses = [
  'All',
  'Incoming',
  'Processing',
  'Paid',
  'Failed',
] as const

type PayoutStatusFilter = (typeof payoutStatuses)[number]

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
  const [statusFilter, setStatusFilter] = useState<PayoutStatusFilter>('All')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const { data: payoutsData, isLoading, isError } = usePayouts()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F4F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  const settlements = payoutsData?.settlements || []
  const nextPayout = payoutsData?.nextPayout
  const hasSubaccount = payoutsData?.hasSubaccount ?? true
  const unavailableReason = payoutsData?.unavailableReason

  // Filter settlements by reference number and status.
  const filteredSettlements = settlements.filter((s) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesReference = !q || s.id.toString().includes(q)
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter

    return matchesReference && matchesStatus
  })

  // Group settlements by month
  const monthGroups = filteredSettlements.reduce<
    Record<string, SettlementItem[]>
  >((groups, item) => {
    const monthKey = item.monthGroup || 'Earlier'
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(item)
    return groups
  }, {})

  return (
    <div className="min-h-dvh bg-[#F4F6F8] font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between py-2.5">
          <span
            className="flex p-1 items-center justify-center"
            aria-hidden="true"
          >
            <ScrollIcon size={24} weight="fill" color="#4B5563" />
          </span>
          <h1 className="text-base font-bold leading-none text-black">
            Payouts
          </h1>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Close payouts"
            className="flex p-1 items-center justify-center"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </header>

        {/* Search and filter */}
        <div className="-mx-1 flex items-center gap-2 p-1 py-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00000066]" />
            <Input
              type="text"
              aria-label="Search payouts by reference number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference number"
              className="h-9 w-full rounded-full border-none bg-[#E6E8EB99] pl-10 pr-4 text-sm font-medium text-black shadow-none placeholder:font-medium placeholder:text-[#00000066] focus-visible:border-ring"
            />
          </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filter payouts by status"
                aria-expanded={isFilterOpen}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6E8EB99] transition-colors"
              >
                <Sort size={20} color="black" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              overlay={false}
              className="w-40 rounded-[12px] border border-[#E6E8EB] bg-white p-1 shadow-md"
            >
              {payoutStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status)
                    setIsFilterOpen(false)
                  }}
                  className={`flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-[1px] transition-colors ${
                    statusFilter === status
                      ? 'bg-[#E6E8EB99] text-black'
                      : 'text-[#00000099] hover:bg-[#F4F6F8]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </PopoverContent>
          </Popover>
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
