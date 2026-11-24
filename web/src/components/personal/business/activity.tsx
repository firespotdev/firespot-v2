'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { useAuthStore } from '@/services/auth'
import { useCustomerMerchantActivity } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import type {
  CustomerActivityStatus,
  CustomerMerchantActivity,
} from '@/services/sales/interface'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date-time'

interface ActivityProps {
  business: PublicBusinessProfile
}

type ActivitySale = CustomerMerchantActivity['data'][number]

const STATUS_LABEL: Record<
  CustomerActivityStatus,
  { text: string; className: string }
> = {
  PAID: { text: 'Paid', className: 'text-[#24C166]' },
  PROCESSING: { text: 'Processing', className: 'text-[#9CA3AF]' },
  FAILED: { text: 'Failed', className: 'text-[#FF002E]' },
}

const CARD_CLASS =
  'rounded-[12px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]'

// A kit without a name is stored under its serial, which isn't a place name.
const KIT_SERIAL = /^FSD?-[A-Z0-9]+$/i

function branchName(sale: ActivitySale, business: PublicBusinessProfile) {
  return sale.qrKitName && !KIT_SERIAL.test(sale.qrKitName)
    ? sale.qrKitName
    : business.businessName
}

function saleAmount(sale: ActivitySale) {
  return sale.amountPaid && sale.amountPaid > 0
    ? sale.amountPaid
    : sale.amount || 0
}

function groupByMonth(sales: ActivitySale[]) {
  const groups = new Map<string, ActivitySale[]>()
  for (const sale of sales) {
    const key = format(new Date(sale.recordedAt || sale.createdAt), 'MMMM yyyy')
    groups.set(key, [...(groups.get(key) || []), sale])
  }
  return Array.from(groups.entries())
}

function ActivityRow({
  sale,
  business,
}: {
  sale: ActivitySale
  business: PublicBusinessProfile
}) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const status = STATUS_LABEL[sale.activityStatus]
  // A payment still in progress has no details to show yet.
  const canOpen = sale.status !== 'PENDING'
  const Row = canOpen ? 'button' : 'div'

  return (
    <Row
      type={canOpen ? 'button' : undefined}
      onClick={
        canOpen
          ? () => openDrawer({ type: 'activity-details', props: { sale } })
          : undefined
      }
      className={cn(
        'flex w-full items-center justify-between border-b border-[#F1F1F1] p-3 text-left last:border-b-0',
        canOpen && 'cursor-pointer active:bg-black/[0.03]',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <MerchantAvatar
          profilePhotoUrl={business.businessImageUrl}
          alt={business.businessName}
          size={40}
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[#111827]">
            {branchName(sale, business)}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#6B7280]">
            {formatDate(sale.recordedAt || sale.createdAt)}
          </p>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="text-[15px] font-bold text-[#111827]">
            ₦{formatCurrency(saleAmount(sale))}
          </p>
          <p className={cn('mt-0.5 text-[13px] font-medium', status.className)}>
            {status.text}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
      </div>
    </Row>
  )
}

/** The signed-in customer's own payments to this business. */
export function Activity({ business }: ActivityProps) {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data, isLoading, isError } = useCustomerMerchantActivity(
    business.id,
    isAuthenticated,
  )

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          emoji={
            <span className="text-[64px] leading-none" role="img" aria-label="Lock">
              🔐
            </span>
          }
          title="Sign in to see your activity"
          details={`Your payments to ${business.businessName} will appear here.`}
          cta={
            <Link
              href={`/login?redirect=${encodeURIComponent(`/business?businessId=${business.id}`)}`}
              className="mt-6 inline-flex h-10 items-center rounded-full bg-black px-6 text-sm font-bold text-white"
            >
              Sign in
            </Link>
          }
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <LoaderCircle />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="px-4 py-16 text-center text-sm font-medium text-[#00000080]">
        Couldn’t load your activity with this business. Try again later.
      </p>
    )
  }

  if (data.data.length === 0) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          emoji={
            <span className="text-[64px] leading-none" role="img" aria-label="Mailbox">
              📭
            </span>
          }
          title="No activity yet"
          details={`Payments you make to ${business.businessName} will appear here.`}
          cta={null}
        />
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="mt-4 mb-4 flex items-center justify-between gap-4 rounded-[12px] border border-[#E5E7EB] bg-white p-3 shadow-[0px_4px_8px_0px_#0000000A]">
        <div>
          <h2 className="text-[13px] font-bold text-black">
            ₦{formatCurrency(data.totalSpent)} spent at this store
          </h2>
          <p className="text-[12px] font-medium text-[#6B7280]">
            {data.paidCount}{' '}
            {data.paidCount === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
        <div className="flex -space-x-3">
          <MerchantAvatar
            profilePhotoUrl={user?.profilePhotoUrl}
            alt={user?.fullName}
            size={36}
            className="rounded-full border-2 border-white"
          />
          <MerchantAvatar
            profilePhotoUrl={business.businessImageUrl}
            alt={business.businessName}
            size={36}
            className="rounded-full border-2 border-white"
          />
        </div>
      </div>

      {groupByMonth(data.data).map(([month, sales]) => (
        <section key={month} className="mb-5">
          <h3 className="mb-2 text-[16px] font-bold text-black">{month}</h3>
          <div className={cn(CARD_CLASS, 'overflow-hidden')}>
            {sales.map((sale) => (
              <ActivityRow key={sale._id} sale={sale} business={business} />
            ))}
          </div>
        </section>
      ))}

      <p className="py-8 text-center text-[12px] font-medium text-[#00000066]">
        You’ve reached the end of the list
      </p>
    </div>
  )
}
