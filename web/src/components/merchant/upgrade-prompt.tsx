'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useAuthStore } from '@/services/auth'

/**
 * Non-blocking upgrade prompt for merchants who predate plans (grandfathered)
 * or never finished paying.
 *
 * Dismissal is keyed to the user's `lastLoginAt`, so it stays hidden across
 * page reloads but re-surfaces on the next login until they upgrade.
 */
export function UpgradePrompt() {
  const user = useAuthStore((s) => s.user)
  const dismissedFor = useAuthStore((s) => s.planPromptDismissedForLogin)
  const dismissPlanPrompt = useAuthStore((s) => s.dismissPlanPrompt)

  // Merchants on a paid plan have nothing to upgrade from here.
  if (!user || user.planTier) return null
  if (user.role !== 'merchant') return null

  const loginKey = user.lastLoginAt || 'session'
  if (dismissedFor === loginKey) return null

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-black text-white p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0">
        <Image
          src="/icons/firespot_logo.svg"
          alt="Firespot"
          width={20}
          height={20}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Upgrade to Firespot Business</p>
        <p className="text-xs text-[#FFFFFF99] mt-0.5">
          Verify your identity to unlock higher limits and a verified badge.
        </p>
        <Link
          href="/plans"
          className="inline-flex items-center mt-3 h-9 px-4 rounded-full bg-white text-black text-[10px] font-bold tracking-[1px]"
        >
          SEE PLANS
        </Link>
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismissPlanPrompt(loginKey)}
        className="w-7 h-7 flex items-center justify-center shrink-0"
      >
        <X className="w-4 h-4 text-[#FFFFFF99]" />
      </button>
    </div>
  )
}
