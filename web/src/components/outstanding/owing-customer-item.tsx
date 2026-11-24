import type { ReactNode } from 'react'
import { ActionListItem } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { formatCurrency } from '@/lib/utils'
import type { OwingCustomer } from './use-outstanding-data'

interface OwingCustomerItemProps {
  customer: OwingCustomer
  onClick: () => void
  /** Replaces the transaction count under the name. */
  subtitle?: ReactNode
  /** Replaces the chevron. */
  trailing?: ReactNode
  disabled?: boolean
}

const transactionCount = (count: number) =>
  `${count} transaction${count === 1 ? '' : 's'}`

/** One customer who owes the merchant, in any Outstanding list. */
export function OwingCustomerItem({
  customer,
  onClick,
  subtitle,
  trailing,
  disabled,
}: OwingCustomerItemProps) {
  return (
    <ActionListItem
      icon={
        <MerchantAvatar
          profilePhotoUrl={customer.customerAvatar}
          alt={customer.customerName}
        />
      }
      title={customer.customerName}
      subtitle={subtitle ?? transactionCount(customer.transactionCount)}
      badge={
        <span className="text-[13px] font-bold text-[#111827]">
          ₦{formatCurrency(customer.totalOwed)}
        </span>
      }
      trailing={trailing}
      disabled={disabled}
      onClick={onClick}
      className="p-3"
    />
  )
}
