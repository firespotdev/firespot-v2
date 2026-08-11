import { randomBytes } from 'crypto'

const REFERENCE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Generates a Paystack-safe, human-readable reference containing only
 * uppercase ASCII letters and digits.
 */
export function generateReference(prefix: string, tokenLength: number): string {
  const bytes = randomBytes(tokenLength)
  let token = ''

  for (const byte of bytes) {
    token += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]
  }

  return `${prefix}${token}`
}
