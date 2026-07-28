'use client'

import { useState } from 'react'
import { X, ArrowLeft, RotateCcw, AlertCircle, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { TabSwitch } from '../ui'
import { formatCurrency } from '@/lib/utils'

interface Props {
  totalAmount: number
  initialInstallmentType?: 'full' | 'part'
  initialAmountPaid?: number
  onContinue: (installmentType: 'full' | 'part', amountPaid: number) => void
  onBack?: () => void
}

export function SplitPaymentDrawer({
  totalAmount,
  initialInstallmentType = 'full',
  initialAmountPaid,
  onContinue,
  onBack,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [installmentType, setInstallmentType] = useState<'full' | 'part'>(
    initialInstallmentType,
  )
  const [amountPaid, setAmountPaid] = useState(
    initialInstallmentType === 'part' && initialAmountPaid
      ? String(initialAmountPaid)
      : '',
  )

  const getBalanceOwed = () => {
    const rawVal = Number(amountPaid.replace(/,/g, '')) || 0
    return Math.max(0, totalAmount - rawVal)
  }

  const handleContinue = () => {
    const rawVal =
      installmentType === 'full'
        ? totalAmount
        : Number(amountPaid.replace(/,/g, '')) || 0
    onContinue(installmentType, rawVal)
  }

  const parsedPartAmount = Number(amountPaid.replace(/,/g, '')) || 0
  const canContinue =
    installmentType === 'full' ||
    (parsedPartAmount > 0 && parsedPartAmount < totalAmount)

  return (
    <div className="w-full max-w-125 mx-auto overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-satoshi">
      {/* Header with back arrow, tabs, and close button */}
      <div className="flex justify-between items-center mb-2.5">
        <button
          onClick={onBack || closeDrawer}
          type="button"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>

        <TabSwitch
          options={[
            {
              label: 'PAID IN FULL',
              value: 'full',
            },
            {
              label: 'PAID IN PART',
              value: 'part',
            },
          ]}
          value={installmentType}
          onChange={(value) => {
            setInstallmentType(value as 'full' | 'part')
            setAmountPaid('')
          }}
          maxW="max-w-[247px]"
          bgClassName="bg-[#ECEDF0]"
        />

        <button
          onClick={closeDrawer}
          type="button"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>

      {installmentType === 'full' ? (
        <div className="flex flex-col gap-3">
          {/* Integrated Combined Card */}
          <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] border border-[#F1F1F1] overflow-hidden text-left mb-1">
            {/* Paid now */}
            <button
              type="button"
              onClick={() => setInstallmentType('part')}
              className="block w-full p-3.5 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F4F6F8]"
            >
              <span className="text-[13px] font-medium text-[#6B7280]">
                Paid now
              </span>
              <div className="flex w-full justify-between mt-1">
                <span className="text-left text-[32px] font-medium font-family-sofia-pro text-[#34C759] leading-none -tracking-[2px]">
                  ₦ {formatCurrency(totalAmount)}
                </span>
                <span className="inline-flex h-8 items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#F4F6F8] font-medium text-sm text-black">
                  <PenLine size={14} />
                  <span>Edit</span>
                </span>
              </div>
            </button>

            <div className="border-t border-[#F1F1F1]" />

            {/* Total due */}
            <button
              type="button"
              onClick={() => setInstallmentType('part')}
              className="block w-full p-3.5 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F4F6F8]"
            >
              <span className="text-[13px] font-medium text-[#6B7280]">
                Total due
              </span>
              <div className="flex w-full justify-between mt-1">
                <span className="text-left text-[32px] font-medium text-black font-family-sofia-pro -tracking-[2px] leading-none">
                  ₦ {formatCurrency(totalAmount)}
                </span>
                <span className="inline-flex h-8 items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#F4F6F8] font-medium text-sm text-black">
                  <PenLine size={14} />
                  <span>Edit</span>
                </span>
              </div>
            </button>
          </div>

          {/* Info Alert Box */}
          <div className="bg-[#F4F4F4] rounded-[12px] p-3 border-2 border-[#0000000A] flex items-start gap-2 text-left mt-1">
            <AlertCircle color="#00000066" size={24} className="mt-0.5" />
            <p className="text-[12px] text-[#00000066] font-medium">
              Customer paid everything. Click “Paid in part” or “Edit” only if
              they’re owing you a balance payment.
            </p>
          </div>

          <Button onClick={handleContinue} className="active:scale-[0.98]">
            Continue
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Integrated Combined Card (Part Payment Active) */}
          <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden text-left">
            {/* Paid now input */}
            <div className="p-3.5">
              <span className="text-[13px] font-medium text-[#6B7280]">
                Paid now
              </span>
              <div className="flex w-full justify-between mt-1">
                <div className="flex items-center mt-0.5">
                  <span className="text-[#24C166] font-family-sofia-pro font-medium text-[32px] -tracking-[2px] leading-none mr-1">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      const parts = val.split('.')
                      if (parts.length > 2) return
                      if (parts[1] && parts[1].length > 2) return
                      if (Number(val) > totalAmount) return
                      if (!val) {
                        setAmountPaid('')
                        return
                      }
                      const formattedInt = parts[0]
                        ? new Intl.NumberFormat('en-NG').format(
                            Number(parts[0]),
                          )
                        : ''
                      const formattedVal =
                        parts[1] !== undefined
                          ? `${formattedInt}.${parts[1]}`
                          : formattedInt
                      setAmountPaid(formattedVal)
                    }}
                    className="w-full bg-transparent focus:outline-none font-medium font-family-sofia-pro text-[#24C166] text-[32px] leading-none -tracking-[2px] p-0 border-none"
                    autoFocus={false}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setAmountPaid('')}
                  className="inline-flex h-8 items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#F4F6F8] font-medium text-sm text-black cursor-pointer transition-colors shrink-0"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#F1F1F1]" />

            {/* Total due */}
            <div className="p-3.5">
              <span className="text-[13px] font-medium text-[#6B7280]">
                Total due
              </span>
              <div className="flex w-full justify-between mt-1">
                <span className="text-[32px] font-medium font-family-sofia-pro text-black leading-none -tracking-[2px]">
                  ₦ {formatCurrency(totalAmount)}
                </span>
                <button
                  type="button"
                  onClick={() => setInstallmentType('part')}
                  className="inline-flex h-8 items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#F4F6F8] font-medium text-sm text-black cursor-pointer transition-colors"
                >
                  <PenLine size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Balance Owed Card */}
          <div className="bg-white rounded-[12px] p-4 shadow-[0px_4px_8px_0px_#0000000A] border border-[#F1F1F1] flex flex-col items-start text-left">
            <span className="text-[13px] font-medium text-[#6B7280]">
              Balance owed
            </span>
            <span
              className="text-[32px] font-medium font-family-sofia-pro leading-none -tracking-[2px] mt-1"
              style={{
                background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₦ {formatCurrency(getBalanceOwed())}
            </span>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="active:scale-[0.98]"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
