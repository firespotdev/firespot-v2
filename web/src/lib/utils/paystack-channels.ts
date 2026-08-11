export function getPaystackOptionLabel(channels?: string[]): string {
  // if (channels?.length === 1) {
  //   if (channels[0] === 'bank_transfer') return 'Instant bank transfer'
  //   if (channels[0] === 'card') return 'Pay by card'
  // }
  return 'Multiple payment options'
}

export function getPaystackOptionDescription(channels?: string[]): string {
  if (channels?.length === 1 && channels[0] === 'bank_transfer') {
    return 'Transfer to a temporary account and get confirmed automatically'
  }
  if (channels?.length === 1 && channels[0] === 'card') {
    return 'Secure card payment confirmed automatically'
  }
  return 'Confirmed instantly, no waiting or delay'
}
