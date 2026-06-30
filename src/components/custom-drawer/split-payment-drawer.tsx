'use client'

import { useState } from 'react'
import { X, ArrowLeft, Pencil, RotateCcw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'

interface Props {
  totalAmount: number
  onContinue: (installmentType: 'full' | 'part', amountPaid: number) => void
  onBack?: () => void
}

export function SplitPaymentDrawer({ totalAmount, onContinue, onBack }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [installmentType, setInstallmentType] = useState<'full' | 'part'>(
    'full',
  )
  const [amountPaid, setAmountPaid] = useState('')

  const getBalanceOwed = () => {
    const paidVal = Number(amountPaid) || 0
    return Math.max(0, totalAmount - paidVal)
  }

  const formatDisplayAmount = (val: string | number) => {
    if (val === '') return '0'
    const str = String(val)
    const [int, dec] = str.split('.')
    const formattedInt = new Intl.NumberFormat('en-NG').format(Number(int))
    return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
  }

  const handleContinue = () => {
    const paidVal =
      installmentType === 'full' ? totalAmount : Number(amountPaid) || 0
    onContinue(installmentType, paidVal)
  }

  return (
    <div className="w-full flex flex-col font-satoshi p-6 bg-white max-w-125 mx-auto">
      {/* Header with back arrow, tabs, and close button */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack || closeDrawer}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>

        <div className="flex bg-[#F4F6F8] rounded-[24px] p-1 select-none flex-1 max-w-[240px] mx-3 shadow-inner">
          <button
            onClick={() => setInstallmentType('full')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[20px] transition-all duration-200 ${
              installmentType === 'full'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[#8E8E93] hover:text-black font-medium'
            }`}
          >
            PAID IN FULL
          </button>
          <button
            onClick={() => {
              setInstallmentType('part')
              setAmountPaid('')
            }}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[20px] transition-all duration-200 ${
              installmentType === 'part'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[#8E8E93] hover:text-black font-medium'
            }`}
          >
            PAID IN PART
          </button>
        </div>

        <button
          onClick={closeDrawer}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
        >
          <X className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>

      {installmentType === 'full' ? (
        <div className="flex flex-col gap-5">
          {/* Card 1: Paid now (Green Value) */}
          <div className="w-full bg-[#F4F6F8] rounded-[16px] px-4 py-3 flex items-center justify-between border border-[#E9EBED]">
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-[#8E8E93] font-bold tracking-wider uppercase">
                Paid now
              </span>
              <span className="text-[22px] font-bold text-[#24C166] tracking-tight mt-0.5">
                ₦{formatDisplayAmount(totalAmount)}
              </span>
            </div>
            <button
              onClick={() => setInstallmentType('part')}
              className="flex items-center gap-1 bg-white border border-[#E9EBED] hover:bg-gray-50 active:bg-gray-100 rounded-full px-3.5 py-1.5 text-xs font-bold text-black transition-all shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          {/* Card 2: Total due */}
          <div className="w-full bg-[#F4F6F8] rounded-[16px] px-4 py-3 flex items-center justify-between border border-[#E9EBED]">
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-[#8E8E93] font-bold tracking-wider uppercase">
                Total due
              </span>
              <span className="text-[22px] font-bold text-black tracking-tight mt-0.5">
                ₦{formatDisplayAmount(totalAmount)}
              </span>
            </div>
            <button
              onClick={() => setInstallmentType('part')}
              className="flex items-center gap-1 bg-white border border-[#E9EBED] hover:bg-gray-50 active:bg-gray-100 rounded-full px-3.5 py-1.5 text-xs font-bold text-black transition-all shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          {/* Disclaimer Info Box */}
          <div className="flex bg-[#F4F6F8] border border-[#E9EBED] p-4 gap-3 rounded-[16px] items-start text-left">
            <AlertCircle className="w-5 h-5 text-[#8E8E93] shrink-0 mt-0.5" />
            <p className="text-xs text-[#8E8E93] font-medium leading-relaxed">
              Customer paid everything. tap "Paid in part" or "Edit" only if
              they're owing you a balance payment.
            </p>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold rounded-full mt-2 text-sm tracking-[0.2px] transition-all"
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {/* Card 1: Paid now (Black/Input Value) */}
            <div className="w-full bg-white rounded-[16px] px-4 py-3 flex items-center justify-between border-2 border-[#0085FF] shadow-sm">
              <div className="flex flex-col text-left flex-1">
                <span className="text-[11px] text-[#8E8E93] font-bold tracking-wider uppercase">
                  Paid now
                </span>
                <div className="flex items-center text-[22px] font-bold text-black mt-0.5 w-full">
                  <span className="mr-1 select-none text-[22px] font-bold text-black">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => {
                      let val = e.target.value
                      val = val.replace(/[^0-9.]/g, '')
                      const parts = val.split('.')
                      if (parts.length > 2) return
                      if (parts[1] && parts[1].length > 2) return
                      if (Number(val) > totalAmount) return
                      setAmountPaid(val)
                    }}
                    className="w-full bg-transparent focus:outline-none font-bold text-black text-[22px] tracking-tight p-0 border-none"
                    autoFocus
                  />
                </div>
              </div>
              <button
                onClick={() => setAmountPaid('')}
                className="flex items-center gap-1 bg-white border border-[#E9EBED] hover:bg-gray-50 active:bg-gray-100 rounded-full px-3.5 py-1.5 text-xs font-bold text-black transition-all shadow-sm shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Card 2: Total due */}
            <div className="w-full bg-[#F4F6F8] rounded-[16px] px-4 py-3 flex items-center justify-between border border-[#E9EBED]">
              <div className="flex flex-col text-left">
                <span className="text-[11px] text-[#8E8E93] font-bold tracking-wider uppercase">
                  Total due
                </span>
                <span className="text-[22px] font-bold text-black tracking-tight mt-0.5">
                  ₦{formatDisplayAmount(totalAmount)}
                </span>
              </div>
              <button
                onClick={() => setInstallmentType('part')}
                className="flex items-center gap-1 bg-white border border-[#E9EBED] hover:bg-gray-50 active:bg-gray-100 rounded-full px-3.5 py-1.5 text-xs font-bold text-black transition-all shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>

            {/* Card 3: Balance owed */}
            <div className="w-full bg-[#F4F6F8] rounded-[16px] px-4 py-3 flex flex-col items-start border border-[#E9EBED]">
              <span className="text-[11px] text-[#8E8E93] font-bold tracking-wider uppercase">
                Balance owed
              </span>
              <span className="text-[22px] font-bold text-black tracking-tight mt-0.5">
                ₦{formatDisplayAmount(getBalanceOwed())}
              </span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={amountPaid === '' || Number(amountPaid) === 0}
            className="w-full h-12 bg-black text-white hover:bg-black/90 disabled:bg-[#F4F6F8] disabled:text-[#8E8E93] font-bold rounded-full text-sm tracking-[0.2px] transition-all"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
