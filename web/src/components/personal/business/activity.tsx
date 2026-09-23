'use client'

import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { useAuthStore } from '@/services/auth'
import { useCustomerHistory } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import type { CustomerSale } from '@/services/sales/interface'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { resolveSaleMerchant } from '@/lib/utils/customer-sale'
import { formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date-time'

interface ActivityProps {
  business: PublicBusinessProfile
}

function saleAmount(sale: CustomerSale) {
  return sale.amountPaid && sale.amountPaid > 0
    ? sale.amountPaid
    : sale.amount || 0
}

export function Activity({ business }: ActivityProps) {
  const user = useAuthStore((state) => state.user)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data, isLoading, isError } = useCustomerHistory()
  const sales = (data || []).filter(
    (sale) => resolveSaleMerchant(sale).id === business.id,
  )
  const totalSpent = sales.reduce((sum, sale) => sum + saleAmount(sale), 0)
  const groups = new Map<string, CustomerSale[]>()

  for (const sale of sales) {
    const key = format(new Date(sale.recordedAt || sale.createdAt), 'MMMM yyyy')
    groups.set(key, [...(groups.get(key) || []), sale])
  }

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <LoaderCircle />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="px-4 py-16 text-center text-sm font-medium text-[#00000080]">
        Couldn’t load your activity with this business. Try again later.
      </p>
    )
  }

  if (sales.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <h2 className="text-[20px] font-bold text-black">No activity yet</h2>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          Payments you make to {business.businessName} will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="mt-4 mb-4 flex items-center justify-between gap-4 rounded-[12px] border border-[#E5E7EB] bg-white p-3 shadow-[0px_4px_8px_0px_#0000000A]">
        <div>
          <h2 className="text-[13px] font-bold text-black">
            ₦{formatCurrency(totalSpent)} spent at this store
          </h2>
          <p className="text-[12px] font-medium text-[#6B7280]">
            {sales.length} {sales.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
        <div className="flex -space-x-3">
          <MerchantAvatar
            profilePhotoUrl={user?.profilePhotoUrl}
            alt={[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
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

      {Array.from(groups.entries()).map(([month, transactions]) => (
        <section key={month}>
          <h3 className="mb-2 text-sm font-bold text-black">{month}</h3>
          <div className="overflow-hidden rounded-[12px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            {transactions.map((sale) => (
              <button
                type="button"
                key={sale._id}
                onClick={() =>
                  openDrawer({
                    type: 'activity-details',
                    props: { sale },
                  })
                }
                className="flex w-full items-center justify-between border-b border-gray-100 p-3 text-left last:border-b-0 active:bg-black/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <MerchantAvatar
                    profilePhotoUrl={business.businessImageUrl}
                    alt={business.businessName}
                    size={36}
                  />
                  <div className="min-w-0">
                    <h4 className="truncate text-[13px] font-bold text-black">
                      {sale.qrKitName || business.businessName}
                    </h4>
                    <p className="text-[12px] font-medium text-[#6B7280]">
                      {formatDate(sale.recordedAt || sale.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-black">
                      ₦{formatCurrency(saleAmount(sale))}
                    </p>
                    <p className="text-[10px] font-medium text-[#24C166]">
                      Paid
                    </p>
                  </div>
                  <ChevronRight className="text-[#BDBDBD]" size={16} />
                </div>
              </button>
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
