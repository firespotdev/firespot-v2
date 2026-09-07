'use client'

import { useMemo, useState } from 'react'
import { PencilLine, Plus } from 'lucide-react'
import { Keypad } from './Keypad'
import {
  ArrowUpLeftIcon,
  ClockCounterClockwiseIcon,
} from '@phosphor-icons/react'

interface AmountTabProps {
  amount: string
  description: string
  setDescription: (desc: string) => void
  recentDescriptions?: string[]
  formatDisplayAmount: (val: string) => string
  addCustomAmountToCart: () => void
  handleKeyPress: (key: string) => void
  showAddButton?: boolean
}

export function AmountTab({
  amount,
  description,
  setDescription,
  recentDescriptions = [],
  formatDisplayAmount,
  addCustomAmountToCart,
  handleKeyPress,
  showAddButton = true,
}: AmountTabProps) {
  const [showDescriptions, setShowDescriptions] = useState(false)
  const filteredDescriptions = useMemo(() => {
    const query = description.trim().toLocaleLowerCase()
    if (!query) return recentDescriptions
    return recentDescriptions.filter((item) =>
      item.toLocaleLowerCase().includes(query),
    )
  }, [description, recentDescriptions])

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden">
      <div className="flex-1 flex flex-col justify-center items-center px-4">
        <span className="text-[15px] text-[#00000066] font-medium -tracking-[0.2px] mb-4 inline-block">
          Enter an amount
        </span>
        <div className="flex items-center justify-center leading-none">
          <span className="text-[62px] font-medium text-black font-sofia-pro -tracking-[4px] leading-none mr-1">
            ₦
          </span>
          {amount === '' && (
            <div className="w-[2px] h-[52px] -mt-2.5 bg-[#0085FF] mx-1 rounded-full shrink-0 animate-caret-blink" />
          )}
          <span
            className={`text-[62px] font-medium -tracking-[4px] font-sofia-pro leading-none ${amount === '' ? 'text-[#9CA3AF]' : 'text-black'}`}
          >
            {formatDisplayAmount(amount)}
          </span>
          {amount !== '' && (
            <div className="w-[2px] h-[52px] -mt-2.5 bg-[#0085FF] mx-1 rounded-full shrink-0 animate-caret-blink" />
          )}

          {/* Add custom amount to cart */}
          {showAddButton &&
            amount &&
            amount !== '0' &&
            amount !== '0.' &&
            amount !== '.' && (
              <button
                onClick={addCustomAmountToCart}
                className="ml-3 -mt-1.5 p-2.5 bg-[#26B2FF] hover:bg-[#1E8DC3] text-white rounded-[10px] shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
              </button>
            )}
        </div>
      </div>

      <div className="w-full flex flex-col pb-20 bg-white">
        <div
          className="p-3 w-full mx-auto"
          onFocusCapture={() => setShowDescriptions(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setShowDescriptions(false)
            }
          }}
        >
          <div className="relative flex items-center justify-center w-full rounded-[10px] border border-[#E5E7EB] px-4 py-3 transition-colors focus-within:border-[#0075FF] focus-within:ring-2 focus-within:ring-[#0075FF]/30">
            <PencilLine size={17} className="mr-2 shrink-0 text-[#9CA3AF]" />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What’s this payment for?"
              autoComplete="off"
              role="combobox"
              aria-label="Payment description"
              aria-autocomplete="list"
              aria-expanded={
                showDescriptions && filteredDescriptions.length > 0
              }
              aria-controls="recent-payment-descriptions"
              className="min-w-0 flex-1 bg-transparent text-center text-[15px] font-medium text-black placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>

          {showDescriptions && filteredDescriptions.length > 0 && (
            <ul
              id="recent-payment-descriptions"
              aria-label="Recent payment descriptions"
              className="max-h-48 overflow-y-auto pt-3"
            >
              {filteredDescriptions.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setDescription(item)
                      setShowDescriptions(false)
                    }}
                    className="flex w-full items-center gap-3 px-1.5 py-3 text-left focus-visible:outline-none"
                  >
                    <ClockCounterClockwiseIcon size={24} color="#6B7280" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-black">
                      {item}
                    </span>
                    <ArrowUpLeftIcon
                      size={24}
                      strokeWidth={3}
                      color="#0075FF"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Keypad */}
        <Keypad onKeyPress={handleKeyPress} />
      </div>
    </div>
  )
}
