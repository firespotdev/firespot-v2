'use client'

import Link from 'next/link'
import { ArrowUpRight, CreditCard, Landmark } from 'lucide-react'
import { BankLogo } from '@/components/ui/bank-logo'
import { Button, Spinner, TagFooter } from '@/components/ui'
import { cn, maskAccountNumber } from '@/lib/utils'
import { getPaystackOptionLabel } from '@/lib/utils/paystack-channels'
import type { MerchantProfile } from '@/services/qr/interface'
import type { PaymentRail } from '../custom-drawer/rail-picker-drawer'
import Image from 'next/image'
import { Cards } from 'iconsax-reactjs'
import { BankIcon } from '@phosphor-icons/react'

type BankAccount = MerchantProfile['bankAccounts'][0]

export function PaymentRailIcon({
  rail,
  channel,
  size = 'sm',
}: {
  rail: 'saved' | 'multiple' | 'transfer'
  channel?: string
  size?: 'sm' | 'lg'
}) {
  const large = size === 'lg'
  const iconClass = large ? 'size-6' : 'size-4'

  if (rail === 'saved') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-linear-to-br from-[#FF431F] to-[#D91E7A] text-white',
          large ? 'size-8 rounded-[10px]' : 'size-8 rounded-[8px]',
        )}
      >
        <Cards className={iconClass} strokeWidth={2} />
      </span>
    )
  }

  if (rail === 'transfer' || channel === 'bank_transfer') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center text-white',
          rail === 'transfer' ? 'bg-[#737C8C]' : 'bg-[#001A35]',
          large ? 'size-8 rounded-[10px]' : 'size-8 rounded-[8px]',
        )}
      >
        <BankIcon
          className={cn(
            iconClass,
            rail === 'transfer' ? 'text-white' : 'text-[#00A7E1]',
          )}
          strokeWidth={2}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex shrink-0 flex-col justify-center bg-[#001A35]',
        large ? 'rounded-[10px]' : 'rounded-[6px]',
      )}
    >
      <Image
        src="/images/paystack_icon.png"
        alt=""
        width={large ? 32 : 24}
        height={large ? 32 : 24}
      />
    </span>
  )
}

function MerchantAcquisitionLink() {
  return (
    <Link
      href="/login?intent=merchant"
      className="flex mt-4 mb-2 w-full items-center justify-center gap-0.5 text-xs font-medium text-[#878F98] underline decoration-[#878F98] underline-offset-4"
    >
      I want something like this for my business
      <ArrowUpRight className="size-4 mt-1 shrink-0" />
    </Link>
  )
}

export function PaymentCheckoutFooter({
  merchant,
  account,
  selectedRail,
  qrType,
  onAction,
  onChangeAccount,
  onChangePaymentMethod,
  isSubmitting = false,
}: {
  merchant: MerchantProfile
  account?: BankAccount
  selectedRail: PaymentRail
  qrType: 'static' | 'dynamic'
  onAction: () => void
  onChangeAccount: () => void
  onChangePaymentMethod: () => void
  isSubmitting?: boolean
}) {
  const hasPaystack = Boolean(merchant.hasPaystackCollection)
  const isInstant = hasPaystack && selectedRail === 'multiple'
  const singlePaystackChannel =
    merchant.paystackCollectionChannels?.length === 1
      ? merchant.paystackCollectionChannels[0]
      : undefined
  const methodLabel = isInstant
    ? getPaystackOptionLabel(merchant.paystackCollectionChannels)
    : account
      ? `${account.bankName} (${maskAccountNumber(account.accountNumber)})`
      : 'Transfer directly to bank account'

  return (
    <section className="shrink-0 rounded-t-[12px] border-t border-[#E7E9EC] bg-white p-4 shadow-[0_-1px_1px_0px_rgba(0,0,0,0.08)]">
      <div className="flex min-w-0 items-center gap-3">
        {isInstant ? (
          <PaymentRailIcon rail="multiple" channel={singlePaystackChannel} />
        ) : account ? (
          <BankLogo
            bankName={account.bankName}
            size={24}
            className="shrink-0 rounded-[8px] border border-[#F1F1F1]"
          />
        ) : (
          <PaymentRailIcon rail="transfer" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B]">
            {isInstant ? 'Payment method' : 'Transfer to'}
          </p>
          <p className="truncate text-sm font-bold">{methodLabel}</p>
        </div>

        <button
          type="button"
          onClick={hasPaystack ? onChangePaymentMethod : onChangeAccount}
          className="h-9 shrink-0 rounded-full bg-[#F1F1F1] px-3.5 text-[10px] font-bold uppercase tracking-[1px] text-black transition-colors"
        >
          Change
        </button>
      </div>

      <Button onClick={onAction} disabled={isSubmitting} className="mt-4">
        {isSubmitting ? (
          <Spinner />
        ) : isInstant ? (
          'Pay instantly ⚡'
        ) : (
          'Copy account number'
        )}
      </Button>

      {qrType === 'dynamic' ? (
        <TagFooter className="pb-0 pt-7" />
      ) : (
        <MerchantAcquisitionLink />
      )}
    </section>
  )
}
