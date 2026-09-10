'use client'

import { useState } from 'react'
import { Image as ImageIcon, Minus, Plus, Trash2, X } from 'lucide-react'
import type { MerchantProfile } from '@/services/qr/interface'
import type { PaymentRail } from './rail-picker-drawer'
import type { SavedCard } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import {
  PaymentRailIcon,
  SavedCardIcon,
} from '@/components/pay/payment-checkout-footer'
import { getPaystackOptionLabel } from '@/lib/utils/paystack-channels'
import { maskAccountNumber } from '@/lib/utils'
import { BankLogo } from '@/components/ui/bank-logo'
import { Button, Spinner } from '@/components/ui'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'

type BankAccount = MerchantProfile['bankAccounts'][0]

interface Props {
  merchant: MerchantProfile
  account?: BankAccount
  selectedRail: PaymentRail
  savedCard?: SavedCard
  isSubmitting?: boolean
  onChangePaymentMethod: () => void
  onPay: () => void | Promise<void>
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export function PayCurrentPurchaseDrawer({
  merchant,
  account,
  selectedRail,
  savedCard,
  isSubmitting = false,
  onChangePaymentMethod,
  onPay,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const items = usePurchaseCartStore((state) => state.items)
  const onUpdateQuantity = usePurchaseCartStore((state) => state.updateQuantity)
  const [isPaying, setIsPaying] = useState(false)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isPaymentPending = isSubmitting || isPaying
  const isInstant =
    Boolean(merchant.hasPaystackCollection) &&
    (selectedRail === 'multiple' || selectedRail === 'saved')
  const singlePaystackChannel =
    merchant.paystackCollectionChannels?.length === 1
      ? merchant.paystackCollectionChannels[0]
      : undefined
  const paymentMethodLabel =
    selectedRail === 'saved' && savedCard
      ? `${savedCard.brand.toUpperCase()} •••• ${savedCard.last4}`
      : isInstant
        ? getPaystackOptionLabel(merchant.paystackCollectionChannels)
        : account
          ? `${account.bankName} (${maskAccountNumber(account.accountNumber)})`
          : 'Transfer directly to bank account'

  const handlePay = async () => {
    if (isPaymentPending) return
    setIsPaying(true)
    try {
      await onPay()
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="flex max-h-[80dvh] min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-3">
        <button
          type="button"
          onClick={() => closeDrawer('pay-current-purchase')}
          aria-label="Add more products"
          className="grid h-9 w-9 place-items-center"
        >
          <Plus size={22} />
        </button>
        <h2 className="text-[16px] font-bold">
          Current purchase ({items.length})
        </h2>
        <button
          type="button"
          onClick={closeAllDrawers}
          aria-label="Close current purchase"
          className="grid h-9 w-9 place-items-center"
        >
          <X size={22} />
        </button>
      </header>

      <main className="min-h-0 overflow-y-auto px-4">
        {items.map((item) => (
          <article key={item.id} className="border-b border-[#F1F1F1] py-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[14px] font-medium text-[#111827]">
                  {item.name}
                </p>
                {item.selectedVariant && (
                  <p className="mt-1 truncate text-sm font-medium text-[#6B7280]">
                    {item.selectedVariant.label ||
                      item.selectedVariant.values
                        ?.map((value) => value.value)
                        .join(' / ')}
                  </p>
                )}
              </div>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
                    <ImageIcon size={18} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, -item.quantity)}
                aria-label={`Remove ${item.name}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1]"
              >
                <Trash2 size={16} />
              </button>
              <div className="flex h-9 items-center rounded-[10px] bg-[#F1F1F1]">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  aria-label={`Decrease ${item.name} quantity`}
                  className="grid h-9 w-9 place-items-center"
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-8 text-center text-[14px] font-bold">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Increase ${item.name} quantity`}
                  className="grid h-9 w-9 place-items-center"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="ml-auto shrink-0 text-[14px] font-bold text-[#111827]">
                NGN {money(item.price * item.quantity)}
              </p>
            </div>
          </article>
        ))}
      </main>

      <section className="shrink-0 border-t border-[#F1F1F1] px-4 py-4">
        <div className="flex items-center justify-between text-sm font-medium text-[#6B7280]">
          <span>Subtotal</span>
          <span className="text-[#111827]">NGN {money(total)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#F1F1F1] pt-4 text-[16px] font-bold">
          <span>Total</span>
          <span>NGN {money(total)}</span>
        </div>
      </section>

      <footer className="shrink-0 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 items-center gap-3">
          {selectedRail === 'saved' ? (
            <SavedCardIcon brand={savedCard?.brand} />
          ) : isInstant ? (
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
            <p className="text-xs font-medium text-[#64748B]">Payment method</p>
            <p className="truncate text-sm font-bold">{paymentMethodLabel}</p>
          </div>
          <button
            type="button"
            onClick={onChangePaymentMethod}
            className="h-9 shrink-0 rounded-full bg-[#F1F1F1] px-3.5 text-[10px] font-bold uppercase tracking-[1px]"
          >
            Change
          </button>
        </div>
        <Button
          type="button"
          onClick={handlePay}
          disabled={items.length === 0 || isPaymentPending}
          className="mt-4"
        >
          {isPaymentPending ? (
            <Spinner />
          ) : isInstant ? (
            `Pay NGN ${money(total)}`
          ) : (
            'Copy account number'
          )}
        </Button>
      </footer>
    </div>
  )
}
