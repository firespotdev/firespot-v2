'use client'

import { useState } from 'react'
import { ArrowLeft, X, Hash } from 'lucide-react'
import { ActionList, ActionListItem, Switch, TagFooter } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { BankIcon, CreditCardIcon } from '@phosphor-icons/react'
import { Card } from 'iconsax-reactjs'

interface MultiplePaymentOptionsDrawerProps {
  fromActiveMethods?: boolean
}

export function MultiplePaymentOptionsDrawer({
  fromActiveMethods,
}: MultiplePaymentOptionsDrawerProps) {
  const { closeDrawer, openDrawer, closeAllDrawers } = useDrawerStore()

  const [bankTransfer, setBankTransfer] = useState(true)
  const [directDebit, setDirectDebit] = useState(true)
  const [ussd1, setUssd1] = useState(true)
  const [card, setCard] = useState(true)

  const handleBack = () => {
    closeDrawer('multiple-payment-options')
    if (fromActiveMethods) {
      openDrawer({ type: 'payment-methods-active' })
    }
  }

  const handleClose = () => {
    closeAllDrawers()
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
            <Switch checked={bankTransfer} onCheckedChange={setBankTransfer} />
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
            <Switch checked={directDebit} onCheckedChange={setDirectDebit} />
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
          trailing={<Switch checked={ussd1} onCheckedChange={setUssd1} />}
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
          trailing={<Switch checked={card} onCheckedChange={setCard} />}
          className="p-3"
        />
      </ActionList>

      <TagFooter />
    </div>
  )
}
