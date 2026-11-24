/**
 * A Nigerian number in the local format people read and dial:
 * "+2348102345678" becomes "0810 234 5678". Anything else is returned as is.
 */
export function formatLocalPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('234') ? `0${digits.slice(3)}` : digits
  if (local.length !== 11) return phone
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

/** A tel: link for a stored phone number, or undefined when there is none. */
export function phoneHref(phone: string) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined
}
