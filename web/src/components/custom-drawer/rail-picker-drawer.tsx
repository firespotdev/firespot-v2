'use client'

import { ChevronRight, X } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { TagFooter } from '../ui'
import { PaymentRailIcon } from '../pay/payment-checkout-footer'
import {
  getPaystackOptionDescription,
  getPaystackOptionLabel,
} from '@/lib/utils/paystack-channels'

export type PaymentRail = 'multiple' | 'transfer' | 'saved'

interface RailPickerDrawerProps {
  hasSavedCards?: boolean
  selectedRail?: PaymentRail
  paystackChannels?: string[]
  onSelectRail: (rail: PaymentRail) => void
  onOpenBankPicker?: () => void
  onOpenSavedCards?: () => void
}

export function RailPickerDrawer({
  hasSavedCards = false,
  selectedRail = 'multiple',
  paystackChannels,
  onSelectRail,
  onOpenBankPicker,
  onOpenSavedCards,
}: RailPickerDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const singlePaystackChannel =
    paystackChannels?.length === 1 ? paystackChannels[0] : undefined

  const handleSelect = (rail: PaymentRail) => {
    if (rail === 'saved' && !hasSavedCards) return
    if (rail === 'saved' && onOpenSavedCards) {
      closeDrawer('rail-picker')
      onOpenSavedCards()
      return
    }
    if (rail === 'transfer' && onOpenBankPicker) {
      closeDrawer('rail-picker')
      onOpenBankPicker()
      return
    }
    // Remove this drawer before the callback opens the next one. Closing the
    // anonymous top drawer afterwards would pop the newly opened child.
    closeDrawer('rail-picker')
    onSelectRail(rail)
  }


  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
        {/* Saved Cards Option */}
        <button
          type="button"
          onClick={() => handleSelect('saved')}
          disabled={!hasSavedCards}
          aria-disabled={!hasSavedCards}
          aria-pressed={selectedRail === 'saved'}
          className={`flex w-full items-center justify-between rounded-[12px] border border-[#F4F6F8] bg-white p-3 text-left shadow-[0px_4px_8px_0px_rgba(0,0,0,0.04)] transition-colors ${
            !hasSavedCards ? 'cursor-disabled opacity-70' : 'opacity-100'
          }`}
        >
          <div className="flex min-w-0 items-center gap-4">
            <PaymentRailIcon rail="saved" size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#071126]">
                Saved cards
              </p>
              <p className="truncate text-xs font-medium text-[#64748B]">
                {hasSavedCards
                  ? 'Pay faster with a saved debit card'
                  : 'Login to pay faster with a saved debit card'}
              </p>
            </div>
          </div>
          <ChevronRight className="ml-2 size-4 shrink-0 text-[#738095]" />
        </button>

        <div className="mt-3 overflow-hidden rounded-[12px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.04)]">
          {/* Multiple Payment Options */}
          <button
            type="button"
            onClick={() => handleSelect('multiple')}
            aria-pressed={selectedRail === 'multiple'}
            className="flex w-full items-center justify-between p-3 text-left transition-colors"
          >
            <div className="flex min-w-0 items-center gap-4">
              <PaymentRailIcon
                rail="multiple"
                channel={singlePaystackChannel}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {getPaystackOptionLabel(paystackChannels)}
                </p>
                <p className="truncate text-xs font-medium text-[#66758F]">
                  {getPaystackOptionDescription(paystackChannels)}
                </p>
              </div>
            </div>
            <ChevronRight className="ml-2 size-4 shrink-0 text-[#738095]" />
          </button>

          {/* Transfer directly to bank account */}
          <button
            type="button"
            onClick={() => handleSelect('transfer')}
            aria-pressed={selectedRail === 'transfer'}
            className="flex w-full items-center justify-between border-t border-[#E3E5E8] p-3 text-left transition-colors"
          >
            <div className="flex min-w-0 items-center gap-4">
              <PaymentRailIcon rail="transfer" size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  Transfer directly to bank account
                </p>
                <p className="truncate text-xs font-medium text-[#66758F]">
                  Requires vendor to confirm manually
                </p>
              </div>
            </div>
            <ChevronRight className="ml-2 size-4 shrink-0 text-[#738095]" />
          </button>
        </div>
      </div>

      <TagFooter className="shrink-0 pb-6 pt-3" />
    </div>
  )
}
