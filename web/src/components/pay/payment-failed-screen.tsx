'use client'

import { PaymentOutcomeScreen } from './payment-outcome-screen'

interface PaymentFailedScreenProps {
  reason: string
  /** Back to the pay screen for the same sale. */
  onOkay: () => void
  onUseAnotherMethod: () => void
}

export function PaymentFailedScreen({
  reason,
  onOkay,
  onUseAnotherMethod,
}: PaymentFailedScreenProps) {
  return (
    <PaymentOutcomeScreen
      emoji="😢"
      emojiLabel="Sad face"
      title="Payment didn’t go through"
      message={reason}
      actionLabel="Use another payment method"
      onAction={onUseAnotherMethod}
      onOkay={onOkay}
    />
  )
}
