'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@bprogress/next/app'
import {
  ArrowsLeftRightIcon,
  ArrowUUpLeftIcon,
  BoxArrowUpIcon,
  NoteIcon,
  PlusIcon,
  ReceiptXIcon,
} from '@phosphor-icons/react'
import {
  ActionList,
  ActionListItem,
  AppCard,
  LoaderCircle,
  Switch,
  showNotificationToast,
} from '@/components/ui'
import { ShopSetupScreen } from '@/components/shop/shop-setup-screen'
import {
  DEFAULT_POLICY_DAYS,
  PolicyTimeLimit,
  isValidPolicyDays,
} from '@/components/shop/policy-time-limit'
import { useUpdatePolicies } from '@/services/shop'
import { useUserProfile } from '@/services/users'
import type { UserProfile } from '@/services/users'
import type { StandardShopPolicy } from '@/services/auth/interface'
import { useSetupStepBack } from '@/hooks/use-setup-step-back'
import { cn } from '@/lib/utils'

const FIRESPOT_GRADIENT = 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)'

const POLICIES: Array<{
  key: StandardShopPolicy
  title: string
  subtitle: string
  icon: ReactNode
  bg: string
}> = [
  {
    key: 'returns',
    title: 'Returns',
    subtitle: 'I accept returns of items',
    icon: <ArrowUUpLeftIcon size={24} weight="bold" color="white" />,
    bg: '#F09343',
  },
  {
    key: 'exchanges',
    title: 'Exchanges',
    subtitle: 'I allow exchanges of items',
    icon: <ArrowsLeftRightIcon size={24} weight="bold" color="white" />,
    bg: '#3273F6',
  },
  {
    key: 'cancellations',
    title: 'Cancellations',
    subtitle: 'I allow cancellation of bookings',
    icon: <ReceiptXIcon size={24} weight="fill" color="white" />,
    bg: FIRESPOT_GRADIENT,
  },
  {
    key: 'refunds',
    title: 'Refunds',
    subtitle: 'I give refunds on cancellations',
    icon: <BoxArrowUpIcon size={24} weight="fill" color="white" />,
    bg: '#5DBE6F',
  },
]

const CUSTOM_POLICY_BG = '#549E67'
const CUSTOM_POLICY_HREF = '/settings/policies/custom'

type PolicySwitches = Record<StandardShopPolicy, boolean>
type PolicyDays = Record<StandardShopPolicy, number | undefined>

function PolicyTile({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: bg }}
    >
      {children}
    </span>
  )
}

function PoliciesSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter()
  const handleBack = useSetupStepBack()
  const update = useUpdatePolicies()
  const saved = profile.shopPolicies
  const [switches, setSwitches] = useState<PolicySwitches>(() => ({
    returns: saved?.returns ?? false,
    exchanges: saved?.exchanges ?? false,
    cancellations: saved?.cancellations ?? false,
    refunds: saved?.refunds ?? false,
  }))
  const [days, setDays] = useState<PolicyDays>(() => ({
    returns: saved?.appliesWithinDays?.returns ?? DEFAULT_POLICY_DAYS,
    exchanges: saved?.appliesWithinDays?.exchanges ?? DEFAULT_POLICY_DAYS,
    cancellations:
      saved?.appliesWithinDays?.cancellations ?? DEFAULT_POLICY_DAYS,
    refunds: saved?.appliesWithinDays?.refunds ?? DEFAULT_POLICY_DAYS,
  }))
  const customPolicies = saved?.customPolicies ?? []

  // Every policy that's on needs a usable time limit before saving.
  const canSave = POLICIES.every(
    ({ key }) => !switches[key] || isValidPolicyDays(days[key]),
  )

  const handleContinue = () => {
    const appliesWithinDays = Object.fromEntries(
      POLICIES.filter(({ key }) => switches[key]).map(({ key }) => [
        key,
        days[key],
      ]),
    )
    update.mutate(
      { ...switches, appliesWithinDays },
      {
        onSuccess: handleBack,
        onError: () =>
          showNotificationToast({
            message: 'Could not save. Try again.',
            mode: 'error',
          }),
      },
    )
  }

  return (
    <ShopSetupScreen
      eyebrow="Set up policies"
      title="Specify Shop Policies"
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel="Save and continue"
      disabled={!canSave}
      pending={update.isPending}
      className="bg-linear-to-br from-[#FFFFFF] to-[#F6F7F8]"
    >
      <div className="mt-6 space-y-3">
        {POLICIES.map((policy) => (
          <section
            key={policy.key}
            className={cn(
              switches[policy.key] && 'border-b border-[#E5E7EB] pb-5',
            )}
          >
            <AppCard
              rounded="12"
              padding="sm"
              className="flex items-center gap-3"
            >
              <PolicyTile bg={policy.bg}>{policy.icon}</PolicyTile>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#111827]">
                  {policy.title}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-[#64748B]">
                  {policy.subtitle}
                </p>
              </div>
              <Switch
                checked={switches[policy.key]}
                onCheckedChange={(value) =>
                  setSwitches((current) => ({ ...current, [policy.key]: value }))
                }
                aria-label={policy.title}
              />
            </AppCard>

            {switches[policy.key] && (
              <PolicyTimeLimit
                days={days[policy.key]}
                onChange={(value) =>
                  setDays((current) => ({ ...current, [policy.key]: value }))
                }
                className="mt-4"
              />
            )}
          </section>
        ))}
      </div>

      <section className="mt-6 border-t border-[#E5E7EB] pt-5">
        <p className="mb-3 text-sm font-medium text-[#545F6C]">
          Your Shop policies
        </p>
        {customPolicies.length > 0 && (
          <ActionList rounded="12" className="mb-3">
            {customPolicies.map((policy) => (
              <ActionListItem
                key={policy._id}
                icon={
                  <PolicyTile bg={CUSTOM_POLICY_BG}>
                    <NoteIcon size={24} weight="fill" color="white" />
                  </PolicyTile>
                }
                title={policy.title}
                subtitle={`Within ${policy.appliesWithinDays} days · Tap to edit`}
                onClick={() =>
                  router.push(
                    `${CUSTOM_POLICY_HREF}?id=${encodeURIComponent(policy._id)}`,
                  )
                }
                className="p-3"
              />
            ))}
          </ActionList>
        )}
        <ActionList rounded="12">
          <ActionListItem
            icon={
              <PolicyTile bg={CUSTOM_POLICY_BG}>
                <NoteIcon size={24} weight="fill" color="white" />
                <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#3B9BF5] ring-2 ring-white">
                  <PlusIcon size={10} weight="bold" color="white" />
                </span>
              </PolicyTile>
            }
            title="Add a custom shop policy"
            subtitle="What your customers should know"
            onClick={() => router.push(CUSTOM_POLICY_HREF)}
            className="p-3"
          />
        </ActionList>
      </section>
    </ShopSetupScreen>
  )
}

export default function PoliciesSettingsPage() {
  const { data: profile } = useUserProfile()

  if (!profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  return <PoliciesSettingsForm profile={profile} />
}
