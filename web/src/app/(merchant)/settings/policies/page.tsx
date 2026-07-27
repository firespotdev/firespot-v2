'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ArchiveRestore, ChevronRight } from 'lucide-react'
import {
  AppCard,
  LoaderCircle,
  Switch,
  showNotificationToast,
} from '@/components/ui'
import { ShopSetupScreen } from '@/components/shop/shop-setup-screen'
import { useUpdatePolicies } from '@/services/shop'
import { useUserProfile } from '@/services/users'
import type { UserProfile } from '@/services/users'
import type { ShopPolicies } from '@/services/auth/interface'
import { BoxArrowUpIcon } from '@phosphor-icons/react'

const POLICY_SECTIONS: Array<{
  label: string
  items: Array<{
    key: keyof Pick<
      ShopPolicies,
      'returns' | 'exchanges' | 'cancellations' | 'refunds'
    >
    title: string
    subtitle: string
  }>
}> = [
  {
    label: 'Returns and exchanges',
    items: [
      {
        key: 'returns',
        title: 'Returns',
        subtitle: 'I accept returns of items',
      },
      {
        key: 'exchanges',
        title: 'Exchanges',
        subtitle: 'I allow exchanges of items',
      },
    ],
  },
  {
    label: 'Cancellations and refunds',
    items: [
      {
        key: 'cancellations',
        title: 'Cancellations',
        subtitle: 'I allow cancellation of bookings',
      },
      {
        key: 'refunds',
        title: 'Refunds',
        subtitle: 'I give refunds on cancellations',
      },
    ],
  },
]

const EMPTY_POLICIES = {
  returns: false,
  exchanges: false,
  cancellations: false,
  refunds: false,
}

function PolicyIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-[#FB5012] to-[#D72483] text-white">
      <BoxArrowUpIcon size={24} weight="fill" color="white" />
    </span>
  )
}

function PoliciesSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter()
  const update = useUpdatePolicies()
  const [policies, setPolicies] = useState(() =>
    profile.shopPolicies
      ? {
          returns: profile.shopPolicies.returns,
          exchanges: profile.shopPolicies.exchanges,
          cancellations: profile.shopPolicies.cancellations,
          refunds: profile.shopPolicies.refunds,
        }
      : EMPTY_POLICIES,
  )

  const toggle = (key: keyof typeof EMPTY_POLICIES, value: boolean) =>
    setPolicies((current) => ({ ...current, [key]: value }))

  const handleContinue = () => {
    update.mutate(policies, {
      onSuccess: () => router.back(),
      onError: () =>
        showNotificationToast({
          message: 'Could not save. Try again.',
          mode: 'error',
        }),
    })
  }

  return (
    <ShopSetupScreen
      eyebrow="Set up policies"
      title="Specify Shop Policies"
      onBack={() => router.back()}
      onContinue={handleContinue}
      pending={update.isPending}
      className="bg-linear-to-br from-[#FFFFFF] to-[#F6F7F8]"
    >
      <div className="mt-4 rounded-[12px] bg-[#F4F6F8] px-4 py-3 text-[13px] font-medium leading-[130%] text-[#6B7280]">
        Details of each policy can be updated in your business settings at any
        time.
      </div>

      {POLICY_SECTIONS.map((section, sectionIndex) => (
        <section
          key={section.label}
          className={
            sectionIndex > 0 ? 'mt-4 border-t border-[#E5E7EB] pt-5' : 'mt-6'
          }
        >
          <p className="mb-2 text-xs font-medium text-[#545F6C]">
            {section.label}
          </p>
          <div className="space-y-2">
            {section.items.map((item) => (
              <AppCard
                key={item.key}
                rounded="12"
                padding="sm"
                className="flex items-center gap-3"
              >
                <PolicyIcon />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[#111827]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
                    {item.subtitle}
                  </p>
                </div>
                <Switch
                  checked={policies[item.key]}
                  onCheckedChange={(value) => toggle(item.key, value)}
                />
              </AppCard>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-6 border-t border-[#E5E7EB] pt-5">
        <p className="mb-3 text-sm font-medium text-[#545F6C]">
          Your Shop policies
        </p>
        <div className="flex w-full items-center gap-3 rounded-[12px] border border-[#F1F1F1] bg-white p-3 text-left shadow-[0px_4px_8px_0px_#0000000A]">
          <PolicyIcon />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[#111827]">
              Add Shop policy
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
              Custom
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
        </div>
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
