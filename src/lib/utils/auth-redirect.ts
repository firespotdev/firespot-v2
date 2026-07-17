import type { User } from '@/services/auth'

interface PostAuthDestinationParams {
  user: User | null
  onboardingCompleted: boolean
  redirectPath?: string | null
  intent?: string | null
  referralCode?: string | null
}

/**
 * Decides where an authenticated user should land.
 * - Merchant intent (QR kit claim / old signup links) goes straight to
 *   business setup — these users are merchants from the start and skip the
 *   personal name screen and business prompt entirely.
 * - Incomplete onboarding otherwise goes to the name screen first (preserving
 *   any deep-link redirect for after onboarding).
 * - Deep links (e.g. /pay/XYZ from a scanned QR) take priority.
 * - Otherwise merchants land on their business profile, personal users on home.
 */
export function getPostAuthDestination({
  user,
  onboardingCompleted,
  redirectPath,
  intent,
  referralCode,
}: PostAuthDestinationParams): string {
  if (intent === 'merchant' && user?.role !== 'merchant') {
    const params = new URLSearchParams()
    if (redirectPath) params.set('redirect', redirectPath)
    if (referralCode) params.set('ref', referralCode)
    const queryString = params.toString()
    return queryString
      ? `/onboarding/merchant?${queryString}`
      : '/onboarding/merchant'
  }

  if (!onboardingCompleted) {
    return redirectPath
      ? `/onboarding?redirect=${encodeURIComponent(redirectPath)}`
      : '/onboarding'
  }

  if (redirectPath) {
    return redirectPath
  }

  return user?.role === 'merchant' ? '/profile' : '/home'
}

/**
 * Returns true when a JWT is expired or unreadable.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Boolean(payload.exp && payload.exp * 1000 < Date.now())
  } catch {
    return true
  }
}
