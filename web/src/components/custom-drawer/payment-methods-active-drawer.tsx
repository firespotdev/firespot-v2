'use client'

import { useState } from 'react'
import { X, Plus, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import {
  ActionList,
  ActionListItem,
  Switch,
  TagFooter,
  showNotificationToast,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useUpdatePaymentSettings, useUserProfile } from '@/services/users'
import { useUserQRKits } from '@/services/qr'
import { Card, Scan } from 'iconsax-reactjs'
import { BankIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const GRADIENT_TEXT_CLASS =
  'bg-linear-to-br from-[#FB5012] to-[#D72483] bg-clip-text text-transparent'

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="rounded-[4px] bg-[#9CA3AF] px-1 py-0.5 text-[11px] font-bold leading-none text-white">
      {label}
    </span>
  )
}

function ProGradientBadge({ label }: { label: string }) {
  return (
    <span className="rounded-[4px] bg-linear-to-br from-[#FB5012] to-[#D72483] px-1 py-0.5 text-[11px] font-bold leading-none text-white shadow-xs">
      {label}
    </span>
  )
}

export function PaymentMethodsActiveDrawer() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()
  const { closeDrawer, openDrawer } = useDrawerStore()

  const [cashCardActive, setCashCardActive] = useState(true)
  const updatePaymentSettings = useUpdatePaymentSettings()
  const [multipleOptionsActive, setMultipleOptionsActive] = useState(false)
  const [bankAccountsActive, setBankAccountsActive] = useState(true)

  const bankAccountCount = profile?.bankAccounts?.length ?? 3
  const qrKitCount = qrKitsData?.data?.length ?? 3

  const effectiveTier = profile?.effectiveTier
  const hasPlan = Boolean(effectiveTier)
  const isOnLite = effectiveTier === 'LITE'
  const canCollect = profile?.canCollect ?? false
  const isProOrAbove = effectiveTier === 'PRO' || effectiveTier === 'PROMAX'
  const isKycIncomplete = profile?.collectBlockedReason === 'kyc_incomplete'

  const availableOptionsCount = !hasPlan ? 0 : isOnLite ? 1 : 4
  const savedCardsActive =
    canCollect && profile?.savedCardsCheckoutEnabled !== false

  const handleSavedCardsChange = (enabled: boolean) => {
    if (!canCollect) return
    updatePaymentSettings.mutate(enabled, {
      onError: () => {
        showNotificationToast({
          message: 'Could not update saved-card checkout. Please try again.',
          mode: 'error',
        })
      },
    })
  }

  const handleSavedCardsRowClick = () => {
    if (canCollect) return
    closeDrawer('payment-methods-active')
    if (isKycIncomplete) {
      openDrawer({ type: 'verify-identity' })
    } else {
      router.push('/plans?tier=LITE')
    }
  }

  const handleMultipleOptionsRowClick = () => {
    closeDrawer('payment-methods-active')
    if (!isProOrAbove) {
      if (!hasPlan) {
        router.push('/plans?tier=LITE')
      } else {
        router.push('/plans?tier=PRO')
      }
    } else {
      openDrawer({
        type: 'multiple-payment-options',
        props: { fromActiveMethods: true },
      })
    }
  }

  // Total active payment methods count
  const activeCount =
    (cashCardActive ? 1 : 0) +
    (savedCardsActive ? 1 : 0) +
    (isProOrAbove && multipleOptionsActive ? 1 : 0) +
    (bankAccountsActive ? 1 : 0)

  const handleAddCustomMethod = () => {
    showNotificationToast({
      message: 'Custom payment methods coming soon',
    })
  }

  return (
    <div className="flex flex-col bg-[#F4F6F8] text-black px-3">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-2">
        <button
          type="button"
          onClick={handleAddCustomMethod}
          aria-label="Add payment method"
          className="w-9 h-9 flex items-center justify-center text-black"
        >
          <Plus size={20} strokeWidth={2} />
        </button>

        <h2 className="text-[16px] font-bold text-black text-center">
          {activeCount} payment methods active
        </h2>

        <button
          type="button"
          onClick={() => closeDrawer()}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center text-black"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="space-y-3">
        {/* Card 1: QR Kits */}
        <ActionList rounded="12">
          <ActionListItem
            icon={
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-tr from-[#FB5012] to-[#D72483] flex items-center justify-center text-white shadow-sm shrink-0">
                <Scan size={20} strokeWidth={2} />
              </div>
            }
            title={
              <span className="font-bold text-[14px] text-[#0F172A]">
                {qrKitCount} QR kit{qrKitCount === 1 ? '' : 's'} active
              </span>
            }
            subtitle={
              <span className="font-medium text-xs text-[#64748B]">
                Each QR kit displaying active methods
              </span>
            }
            trailing={
              <ChevronRight size={16} className="text-[#AEAEB2] stroke-[2px]" />
            }
            href="/qr-kits"
            onClick={() => closeDrawer()}
            className="p-3"
          />
        </ActionList>

        {/* Card 2: Payment Methods & Add Custom */}
        <ActionList rounded="12">
          <ActionListItem
            as="div"
            icon={
              <div className="w-9 h-9 rounded-[10px] bg-black flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                <Image
                  src="/images/firespot_personal_black.png"
                  alt="Firespot Cash Card"
                  width={20}
                  height={20}
                  className="object-cover"
                />
              </div>
            }
            title={
              <span className="font-bold text-[14px] text-black">
                Firespot Cash Card
              </span>
            }
            subtitle={
              <span className="font-medium text-xs text-[#64748B]">
                Customers can earn and spend rewards
              </span>
            }
            trailing={
              <Switch
                checked={cashCardActive}
                onCheckedChange={setCashCardActive}
              />
            }
            className="p-3"
          />

          {/* Row 2: Firespot Customer-saved cards */}
          <ActionListItem
            as="div"
            onClick={!canCollect ? handleSavedCardsRowClick : undefined}
            icon={
              <div className="w-9 h-9 rounded-[10px] bg-[#26B2FF] flex items-center justify-center text-white shadow-sm shrink-0">
                <Card size={24} strokeWidth={2} />
              </div>
            }
            title={
              <span className="font-bold text-[14px] text-black">
                Firespot (Customer-saved cards)
              </span>
            }
            subtitle={
              !canCollect ? (
                isKycIncomplete ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9CA3AF]">
                    <PlanBadge label="Verify KYC" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9CA3AF]">
                    Available in
                    <PlanBadge label="LITE" />
                  </span>
                )
              ) : (
                <span className="font-medium text-xs text-[#64748B]">
                  Fast and easy way to pay you
                </span>
              )
            }
            trailing={
              <div onClick={(e) => !canCollect && e.stopPropagation()}>
                <Switch
                  checked={savedCardsActive}
                  disabled={!canCollect || updatePaymentSettings.isPending}
                  onCheckedChange={
                    canCollect ? handleSavedCardsChange : undefined
                  }
                />
              </div>
            }
            className={!canCollect ? 'cursor-pointer p-3' : 'p-3'}
          />

          {/* Row 3: Multiple payment options */}
          <ActionListItem
            as="div"
            onClick={handleMultipleOptionsRowClick}
            className="cursor-pointer p-3"
            icon={
              <Image
                src="/images/paystack_icon.png"
                alt="Paystack icon"
                width={36}
                height={36}
                className="object-cover rounded-[10px]"
              />
            }
            title={
              <span className="font-bold text-[14px] text-black">
                Multiple payment options
              </span>
            }
            subtitle={
              isProOrAbove ? (
                <span className="font-medium text-xs text-[#64748B]">
                  Confirmed instantly
                  {availableOptionsCount >= 1
                    ? ` · ${availableOptionsCount} available`
                    : ''}
                </span>
              ) : !hasPlan ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9CA3AF]">
                  Available in
                  <PlanBadge label="LITE" />
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-bold',
                    GRADIENT_TEXT_CLASS,
                  )}
                >
                  More with
                  <ProGradientBadge label="PRO" />
                </span>
              )
            }
            trailing={
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={isProOrAbove && multipleOptionsActive}
                  disabled={!isProOrAbove}
                  onCheckedChange={
                    isProOrAbove ? setMultipleOptionsActive : undefined
                  }
                />
              </div>
            }
          />

          {/* Row 4: 3 linked bank accounts */}
          <ActionListItem
            as="div"
            onClick={() => {
              closeDrawer('payment-methods-active')
              openDrawer({
                type: 'bank-accounts',
                props: { showSwitch: true, fromActiveMethods: true },
              })
            }}
            className="cursor-pointer p-3"
            icon={
              <div className="w-9 h-9 rounded-[10px] bg-[#6B7280] flex items-center justify-center text-white shadow-sm shrink-0">
                <BankIcon color="white" size={24} />
              </div>
            }
            title={
              <span className="font-bold text-[14px] text-black">
                {bankAccountCount} linked bank account
                {bankAccountCount === 1 ? '' : 's'}
              </span>
            }
            subtitle={
              <span className="font-medium text-xs text-[#64748B]">
                Requires you to confirm manually
              </span>
            }
            trailing={
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={bankAccountsActive}
                  onCheckedChange={setBankAccountsActive}
                />
              </div>
            }
          />
        </ActionList>
      </div>

      <TagFooter />
    </div>
  )
}
