import type { UserProfile } from '@/services/users'

export function getActivePaymentMethodCount(
  profile: UserProfile | undefined,
): number {
  if (!profile) return 0

  const canCollect = profile.canCollect === true
  const savedCardsActive =
    canCollect && profile.savedCardsCheckoutEnabled !== false
  const paystackActive =
    canCollect &&
    profile.hasPayoutAccount === true &&
    profile.paystackCollectionEnabled === true &&
    (profile.paystackCollectionChannels?.length ?? 0) > 0
  const bankTransferActive =
    profile.bankTransferEnabled !== false &&
    profile.bankAccounts.some((account) => account.isEnabled !== false)

  return (
    Number(savedCardsActive) +
    Number(paystackActive) +
    Number(bankTransferActive)
  )
}
