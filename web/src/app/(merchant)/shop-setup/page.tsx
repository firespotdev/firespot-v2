'use client'

import { useEffect } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft, X } from 'lucide-react'
import {
  ActionList,
  ActionListItem,
  Button,
  LoaderCircle,
  StatusCircle,
  showNotificationToast,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useUserProfile } from '@/services/users'
import { useShopSetup, useGoLive, type ShopSetupItem } from '@/services/shop'
import {
  CHECKLIST_META,
  CHECKLIST_ORDER,
  type ChecklistDestination,
} from '@/components/shop/shop-checklist-items'

export default function ShopSetupPage() {
  const router = useRouter()
  const openDrawer = useDrawerStore((s) => s.openDrawer)
  const { data: catalog, isLoading: catalogLoading } = usePlanCatalog()
  const { data: profile } = useUserProfile()
  const { data: setup, isLoading: setupLoading } = useShopSetup()
  const goLive = useGoLive()

  // Shop setup is for merchants who have verified a plan. Anyone else is sent
  // to plans — the CTA is hidden for them, but the route must guard too.
  const verified = catalog?.current?.canCollect === true
  useEffect(() => {
    if (!catalogLoading && catalog && !verified) {
      router.replace('/plans')
    }
  }, [catalogLoading, catalog, verified, router])

  if (catalogLoading || setupLoading || !setup) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center">
        <LoaderCircle />
      </div>
    )
  }
  if (!verified) return null

  const byKey = new Map<string, ShopSetupItem>(
    setup.items.map((i) => [i.key, i]),
  )
  const pct = setup.total
    ? Math.round((setup.completedCount / setup.total) * 100)
    : 0

  const go = (
    destination: ChecklistDestination,
    requiredTier?: 'PROMAX',
  ) => {
    if (
      requiredTier === 'PROMAX' &&
      catalog?.current.effectiveTier !== 'PROMAX'
    ) {
      router.push('/plans')
      return
    }
    if (destination.kind === 'route') router.push(destination.href)
    else if (destination.kind === 'drawer') {
      if (destination.drawer === 'bank-accounts') {
        openDrawer({
          type: 'bank-accounts',
          props: { bankAccounts: profile?.bankAccounts || [] },
        })
      } else {
        openDrawer({ type: destination.drawer })
      }
    }
  }

  const handleGoLive = () => {
    goLive.mutate(undefined, {
      onSuccess: () => router.push('/profile'),
      onError: () =>
        showNotificationToast({ message: 'Could not go live. Try again.' }),
    })
  }

  return (
    <div className="min-h-dvh bg-[#F4F6F8] font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-9 h-9 -ml-2 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold text-black leading-none">
              Set up your Shop
            </h1>
            <p className="text-xs text-[#00000080] font-medium mt-1">
              {setup.completedCount} of {setup.total} done · Few minutes to
              complete setup
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            aria-label="Close"
            className="w-9 h-9 -mr-2 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-black" />
          </button>
        </header>

        {/* Progress bar */}
        <div className="px-4">
          <div className="h-1.5 rounded-full bg-[#E5E5EA] overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#FB5012] to-[#D72483] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="flex-1 px-4 pt-4 pb-6">
          <ActionList rounded="16">
            {CHECKLIST_ORDER.map((key) => {
              const meta = CHECKLIST_META[key]
              const state = byKey.get(key)
              const done = state?.done === true
              const locked = state?.locked === true

              const tappable = !locked && meta.destination.kind !== 'none'

              return (
                <ActionListItem
                  key={key}
                  icon={
                    <span
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      {meta.Icon}
                    </span>
                  }
                  title={
                    <span className="font-bold text-[14px]">{meta.title}</span>
                  }
                  subtitle={
                    <span className="font-medium text-[#64748B] text-xs">
                      {locked ? 'Coming soon' : meta.subtitle}
                    </span>
                  }
                  trailing={<StatusCircle state={done ? 'passed' : 'empty'} />}
                  disabled={locked}
                  onClick={
                    tappable
                      ? () => go(meta.destination, meta.requiredTier)
                      : undefined
                  }
                  className={
                    tappable
                      ? 'p-3'
                      : 'p-3 cursor-default hover:bg-transparent active:bg-transparent'
                  }
                />
              )
            })}
          </ActionList>

          {/* Preview (inert for now) */}
          <Button
            variant="secondary"
            onClick={() => showNotificationToast({ message: 'Coming soon' })}
            className="w-full h-13 mt-5 font-bold bg-[#EDEFF2] text-black"
          >
            Preview Shop
          </Button>
          <p className="text-center text-sm text-[#00000080] mt-2">
            See your shop as customers will
          </p>
        </div>

        {/* Go live */}
        <div className="sticky bottom-0 bg-white px-4 pt-4 pb-6 border-t border-[#F1F1F1]">
          <Button
            onClick={handleGoLive}
            disabled={goLive.isPending}
            className="w-full h-14 font-bold"
          >
            {goLive.isPending ? 'Going live…' : 'Go live and start selling'}
          </Button>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-sm text-[#00000080]">Powered by</span>
            <span className="text-sm font-bold text-black">firespot</span>
          </div>
        </div>
      </div>
    </div>
  )
}
