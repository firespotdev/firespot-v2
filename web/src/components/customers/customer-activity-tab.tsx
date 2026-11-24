'use client'

import { Moneys } from 'iconsax-reactjs'
import { Receipt } from 'lucide-react'
import { OverlappingAvatars } from '@/components/layout'
import { MerchantQuickActionCard } from '@/components/merchant/merchant-quick-actions'
import { SaleItem } from '@/components/sales/SaleItem'
import { ActionList, ActionListItem, EmptyState } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/services/auth'
import type { Customer } from '@/services/customers/customersApi'
import { useDrawerStore } from '@/services/drawer'
import type { Sale } from '@/services/sales/interface'
import { groupByMonth, type CustomerStats } from './customer-stats'

const nairaWhole = (amount: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount)}`

interface Props {
  customer: Customer
  sales: Sale[]
  stats: CustomerStats
}

/** What the customer owes, what they've spent, then every sale by month. */
export function CustomerActivityTab({ customer, sales, stats }: Props) {
  const user = useAuthStore((state) => state.user)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  // Every sale here is this customer's; attach their record so rows show
  // their name and photo even when the sale only stored an id.
  const owner = {
    _id: customer._id,
    name: customer.name,
    phoneNumber: customer.phoneNumber,
    profilePhotoUrl: customer.profilePhotoUrl,
  }
  const customerSales = sales.map((sale) => ({ ...sale, customerId: owner }))
  const months = groupByMonth(
    customerSales,
    (sale) => sale.recordedAt || sale.createdAt,
  )

  return (
    <div className="mt-4 flex flex-col">
      {stats.outstanding > 0 && (
        <MerchantQuickActionCard
          className="mb-3"
          action={{
            id: 'outstanding',
            title: `${nairaWhole(stats.outstanding)} outstanding`,
            subtitle: 'Remind or record a repayment',
            drawer: { type: 'outstanding', props: { customerId: customer._id } },
            gradient: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
            icon: <Moneys size={24} color="white" />,
          }}
        />
      )}

      <ActionList rounded="12" className="mb-6">
        <ActionListItem
          as="div"
          className="p-3"
          title={
            <span className="text-[16px] font-bold text-black">
              ₦{formatCurrency(stats.spent)} spent
            </span>
          }
          subtitle={`Across ${stats.confirmedSales} confirmed ${
            stats.confirmedSales === 1 ? 'sale' : 'sales'
          }`}
          trailing={
            <OverlappingAvatars
              primaryPhotoUrl={customer.profilePhotoUrl}
              secondaryPhotoUrl={user?.businessImageUrl || user?.profilePhotoUrl}
              bankName={user?.bankName}
            />
          }
        />
      </ActionList>

      {months.length === 0 ? (
        <div className="py-6">
          <EmptyState
            emoji={
              <div className="relative mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF3FE]">
                <Receipt className="h-8 w-8 text-[#407BFF]" strokeWidth={1.8} />
              </div>
            }
            title="No sales yet"
            details="Sales you record for this customer will show here."
            cta={null}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {months.map(([month, monthSales]) => (
            <section key={month}>
              <h3 className="mb-2 text-[15px] font-bold text-black">{month}</h3>
              <div className="divide-y divide-[#F1F1F1] overflow-hidden rounded-[12px] border border-[#F4F6F8] bg-white shadow-[0px_4px_12px_0px_#00000008]">
                {monthSales.map((sale) => (
                  <SaleItem
                    key={sale._id}
                    sale={sale}
                    variant="history"
                    onClick={(selected) =>
                      openDrawer({
                        type: 'transaction-details',
                        props: { sale: selected },
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
          <p className="pb-2 text-center text-xs font-medium text-[#00000066]">
            You’ve reached the end of the list
          </p>
        </div>
      )}
    </div>
  )
}
