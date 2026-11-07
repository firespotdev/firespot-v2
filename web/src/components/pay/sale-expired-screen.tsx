'use client'

import type { MerchantProfile } from '@/services/qr/interface'
import { PaymentOutcomeScreen } from './payment-outcome-screen'

interface SaleExpiredScreenProps {
  serialNumber: string
  merchant: MerchantProfile
  onPayDirectly: () => void
  onClose: () => void
}

export function SaleExpiredScreen({
  merchant,
  onPayDirectly,
  onClose,
}: SaleExpiredScreenProps) {
  const merchantName = merchant.businessName || 'the vendor'

  return (
    <PaymentOutcomeScreen
      emoji="⌛️"
      emojiLabel="Hourglass"
      title="This sale has expired"
      message={`This payment request was valid until midnight and is no longer active. You can pay ${merchantName} directly.`}
      actionLabel="Pay vendor directly"
      onAction={onPayDirectly}
      onOkay={onClose}
    />
  )
}
