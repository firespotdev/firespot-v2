'use client'

import { X, ChevronRight } from 'lucide-react'
import Image from 'next/image'
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
import {
  LAST_PAYMENT_METHOD_MESSAGE,
  getActivePaymentMethodCount,
  leavesNoWayToGetPaid,
} from '@/lib/utils/payment-methods'
import { usePaystackAvailability } from '@/hooks/use-paystack-availability'

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

const explainLastMethod = () =>
  showNotificationToast({ message: LAST_PAYMENT_METHOD_MESSAGE, mode: 'error' })

/** The API's reason when it refuses, otherwise a generic retry message. */
const settingsError = (fallback: string) => (error: unknown) =>
  showNotificationToast({
    message:
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || fallback,
    mode: 'error',
  })

export function PaymentMethodsActiveDrawer() {
  const { data: profile } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()
  const { closeDrawer, openDrawer } = useDrawerStore()

  const updatePaymentSettings = useUpdatePaymentSettings()
  const paystack = usePaystackAvailability(profile)

  const bankAccountCount = profile?.bankAccounts?.length ?? 0
  const qrKitCount = qrKitsData?.data?.length ?? 0

  const effectiveTier = profile?.effectiveTier
  const hasPlan = Boolean(effectiveTier)
  const canCollect = profile?.canCollect ?? false
  const isProOrAbove = effectiveTier === 'PRO' || effectiveTier === 'PROMAX'
  const isKycIncomplete = profile?.collectBlockedReason === 'kyc_incomplete'

  const availableOptionsCount = !hasPlan
    ? 0
    : effectiveTier === 'LITE'
      ? 1
      : 4
  // Saved cards are charged through Paystack, so they need the same setup.
  const savedCardsActive =
    paystack.canTurnOn && profile?.savedCardsCheckoutEnabled !== false
  const multipleOptionsActive = Boolean(
    hasPlan &&
      canCollect &&
      profile?.hasPayoutAccount &&
      profile?.paystackCollectionEnabled === true &&
      (profile?.paystackCollectionChannels?.length ?? 0) > 0,
  )
  // Switching either of these off would leave customers no way to pay.
  const paystackOffLocked =
    multipleOptionsActive &&
    leavesNoWayToGetPaid(profile, { paystackCollectionEnabled: false })
  const bankTransferLocked =
    profile?.bankTransferEnabled !== false &&
    leavesNoWayToGetPaid(profile, { bankTransferEnabled: false })

  const handleSavedCardsChange = (enabled: boolean) => {
    if (!canCollect) return
    updatePaymentSettings.mutate(
      { savedCardsCheckoutEnabled: enabled },
      {
        onError: () => {
          showNotificationToast({
            message: 'Could not update saved-card checkout. Please try again.',
            mode: 'error',
          })
        },
      },
    )
  }

  const openPaymentOptionsPicker = () => {
    closeDrawer('payment-methods-active')
    openDrawer({
      type: 'multiple-payment-options',
      props: { fromActiveMethods: true },
    })
  }

  // Turning Paystack on means choosing how customers pay, so it opens the
  // picker; turning it off needs no choice.
  const handleMultipleOptionsChange = (enabled: boolean) => {
    if (!paystack.canTurnOn) return
    if (enabled) {
      openPaymentOptionsPicker()
      return
    }
    if (paystackOffLocked) {
      explainLastMethod()
      return
    }
    updatePaymentSettings.mutate(
      { paystackCollectionEnabled: false },
      {
        onError: settingsError(
          'Could not update Paystack payment options. Please try again.',
        ),
      },
    )
  }

  // Saved cards need the same Paystack setup, so the same explanation fits.
  const handleSavedCardsRowClick = () => {
    if (!paystack.canTurnOn) paystack.explainBlock()
  }

  // The row does exactly what tapping its switch does.
  const handleMultipleOptionsRowClick = () => {
    if (updatePaymentSettings.isPending) return
    if (!paystack.canTurnOn) {
      paystack.explainBlock()
      return
    }
    handleMultipleOptionsChange(!multipleOptionsActive)
  }

  const handleBankTransferChange = (enabled: boolean) => {
    if (!enabled && bankTransferLocked) {
      explainLastMethod()
      return
    }
    updatePaymentSettings.mutate(
      { bankTransferEnabled: enabled },
      {
        onError: settingsError(
          'Could not update bank transfer. Please try again.',
        ),
      },
    )
  }

  const activeCount = getActivePaymentMethodCount(profile)


  return (
    <div className="flex flex-col bg-[#F4F6F8] text-black px-3">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-2">
        {/* Keeps the title centred opposite the close button. */}
        <div aria-hidden className="w-9 h-9" />

        <h2 className="text-[16px] font-bold text-black text-center">
          {activeCount} payment method{activeCount === 1 ? '' : 's'} active
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
          {/* Row 2: Firespot Customer-saved cards */}
          <ActionListItem
            as="div"
            onClick={!paystack.canTurnOn ? handleSavedCardsRowClick : undefined}
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
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleSavedCardsRowClick()
                }}
              >
                <Switch
                  checked={savedCardsActive}
                  disabled={
                    !paystack.canTurnOn || updatePaymentSettings.isPending
                  }
                  onCheckedChange={
                    paystack.canTurnOn ? handleSavedCardsChange : undefined
                  }
                />
              </div>
            }
            className={!paystack.canTurnOn ? 'cursor-pointer p-3' : 'p-3'}
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
              <div
                onClick={(event) => {
                  event.stopPropagation()
                  // A disabled switch ignores the tap, so say why here.
                  if (!paystack.canTurnOn) paystack.explainBlock()
                  else if (paystackOffLocked) explainLastMethod()
                }}
              >
                <Switch
                  checked={multipleOptionsActive}
                  disabled={
                    !paystack.canTurnOn ||
                    paystackOffLocked ||
                    updatePaymentSettings.isPending
                  }
                  onCheckedChange={handleMultipleOptionsChange}
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
              <div
                onClick={(event) => {
                  event.stopPropagation()
                  if (bankTransferLocked) explainLastMethod()
                }}
              >
                <Switch
                  checked={profile?.bankTransferEnabled !== false}
                  disabled={
                    bankAccountCount < 1 ||
                    bankTransferLocked ||
                    updatePaymentSettings.isPending
                  }
                  onCheckedChange={handleBankTransferChange}
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
