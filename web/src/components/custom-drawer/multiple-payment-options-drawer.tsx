'use client'

import { ArrowLeft, X, Hash } from 'lucide-react'
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
import { BankIcon, CreditCardIcon } from '@phosphor-icons/react'
import { Card } from 'iconsax-reactjs'

interface MultiplePaymentOptionsDrawerProps {
  fromActiveMethods?: boolean
}

type DisplayedPaystackChannel = 'bank_transfer' | 'bank' | 'ussd' | 'card'

export function MultiplePaymentOptionsDrawer({
  fromActiveMethods,
}: MultiplePaymentOptionsDrawerProps) {
  const router = useRouter()
  const { closeDrawer, openDrawer, closeAllDrawers } = useDrawerStore()
  const { data: profile } = useUserProfile()
  const updatePaymentSettings = useUpdatePaymentSettings()

  const effectiveTier = profile?.effectiveTier
  const hasPlan = Boolean(effectiveTier)
  const isProOrAbove = effectiveTier === 'PRO' || effectiveTier === 'PROMAX'
  const selectedChannels = profile?.paystackCollectionChannels ?? []
  const liteChannel = effectiveTier === 'LITE' ? selectedChannels[0] : undefined

  const handleBack = () => {
    closeDrawer('multiple-payment-options')
    if (fromActiveMethods) {
      openDrawer({ type: 'payment-methods-active' })
    }
  }

  const handleClose = () => {
    closeAllDrawers()
  }

  const goToPlan = (tier: 'LITE' | 'PRO') => {
    closeAllDrawers()
    router.push(`/plans?tier=${tier}`)
  }

  const handleChannelChange = (
    channel: DisplayedPaystackChannel,
    enabled: boolean,
  ) => {
    if (!hasPlan) {
      goToPlan('LITE')
      return
    }

    if (!isProOrAbove) {
      if (channel !== liteChannel) {
        goToPlan('PRO')
        return
      }

      if (profile?.canCollect !== true) {
        closeDrawer('multiple-payment-options')
        openDrawer({ type: 'verify-identity' })
        return
      }

      updatePaymentSettings.mutate(
        { paystackCollectionEnabled: enabled },
        {
          onError: () => {
            showNotificationToast({
              message: 'Could not update Paystack payments. Please try again.',
              mode: 'error',
            })
          },
        },
      )
      return
    }

    const nextChannels = enabled
      ? [...new Set([...selectedChannels, channel])]
      : selectedChannels.filter((selected) => selected !== channel)

    if (nextChannels.length === 0) {
      showNotificationToast({
        message: 'Keep at least one Paystack payment option active.',
      })
      return
    }

    updatePaymentSettings.mutate(
      { paystackCollectionChannels: nextChannels },
      {
        onError: () => {
          showNotificationToast({
            message: 'Could not update payment options. Please try again.',
            mode: 'error',
          })
        },
      },
    )
  }

  const isChannelChecked = (channel: DisplayedPaystackChannel) => {
    if (isProOrAbove) return selectedChannels.includes(channel)
    return (
      channel === liteChannel && profile?.paystackCollectionEnabled === true
    )
  }

  return (
    <div className="flex flex-col bg-[#F4F6F8] text-black px-3">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center text-black"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <h2 className="text-[16px] font-bold text-black text-center">
          Multiple payment options
        </h2>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center text-black"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </header>

      {/* ActionList Card */}
      <ActionList rounded="12">
        {/* Row 1: Bank Transfer */}
        <ActionListItem
          as="div"
          icon={
            <div className="w-9 h-9 rounded-[9px] bg-[#26B2FF] flex items-center justify-center shrink-0">
              <BankIcon size={24} strokeWidth={2} color="#ffffff" />
            </div>
          }
          title={
            <span className="font-bold text-[14px] text-black">
              Bank Transfer
            </span>
          }
          subtitle={
            <span className="text-[#64748B] font-medium text-xs">
              Confirmed automatically
            </span>
          }
          trailing={
            <Switch
              checked={isChannelChecked('bank_transfer')}
              disabled={updatePaymentSettings.isPending}
              onCheckedChange={(enabled) =>
                handleChannelChange('bank_transfer', enabled)
              }
            />
          }
          className="p-3"
        />

        {/* Row 2: Direct Debit */}
        <ActionListItem
          as="div"
          icon={
            <div className="w-9 h-9 rounded-[10px] bg-[#FF2D55] flex items-center justify-center shrink-0">
              <CreditCardIcon size={24} strokeWidth={2} color="#ffffff" />
            </div>
          }
          title={
            <span className="font-bold text-[14px] text-black">
              Direct Debit
            </span>
          }
          subtitle={
            <span className="text-[#64748B] font-medium text-xs">
              Confirmed instantly, no waiting or delay
            </span>
          }
          trailing={
            <Switch
              checked={isChannelChecked('bank')}
              disabled={updatePaymentSettings.isPending}
              onCheckedChange={(enabled) =>
                handleChannelChange('bank', enabled)
              }
            />
          }
          className="p-3"
        />

        {/* Row 3: USSD */}
        <ActionListItem
          as="div"
          icon={
            <div className="w-9 h-9 rounded-[10px] bg-[#24C166] flex items-center justify-center shrink-0">
              <Hash size={24} strokeWidth={2} color="#ffffff" />
            </div>
          }
          title={<span className="font-bold text-[14px] text-black">USSD</span>}
          subtitle={
            <span className="text-[#64748B] font-medium text-xs">
              Confirmed instantly, no waiting or delay
            </span>
          }
          trailing={
            <Switch
              checked={isChannelChecked('ussd')}
              disabled={updatePaymentSettings.isPending}
              onCheckedChange={(enabled) =>
                handleChannelChange('ussd', enabled)
              }
            />
          }
          className="p-3"
        />

        {/* Row 4: Card */}
        <ActionListItem
          as="div"
          icon={
            <div className="w-9 h-9 rounded-[10px] bg-linear-to-br from-[#FB5012] to-[#D72483] flex items-center justify-center shrink-0">
              <Card size={24} strokeWidth={2} color="#ffffff" />
            </div>
          }
          title={<span className="font-bold text-[14px] text-black">Card</span>}
          subtitle={
            <span className="text-[#64748B] font-medium text-xs">
              Debit and credit cards accepted
            </span>
          }
          trailing={
            <Switch
              checked={isChannelChecked('card')}
              disabled={updatePaymentSettings.isPending}
              onCheckedChange={(enabled) =>
                handleChannelChange('card', enabled)
              }
            />
          }
          className="p-3"
        />
      </ActionList>

      <TagFooter />
    </div>
  )
}
