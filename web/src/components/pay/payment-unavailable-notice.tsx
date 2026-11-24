import { BankIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui'
import type { MerchantProfile } from '@/services/qr/interface'

/** True when the shop has no bank account to show and no Paystack. */
export function cannotTakePayment(
  merchant: Pick<MerchantProfile, 'hasPaystackCollection'>,
  account: unknown,
): boolean {
  return !merchant.hasPaystackCollection && !account
}

/**
 * The checkout footer when the shop has no way to get paid: the usual
 * method row and pay button, with the button switched off.
 */
export function PaymentUnavailableNotice() {
  return (
    <div role="status">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#737C8C] text-white">
          <BankIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B]">
            Ask the shop for another way to pay
          </p>
          <p className="truncate text-sm font-bold">
            Can&apos;t take payments right now
          </p>
        </div>
      </div>
      <Button type="button" disabled className="mt-4">
        Payments unavailable
      </Button>
    </div>
  )
}
