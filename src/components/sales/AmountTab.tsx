'use client'

import { Delete, PencilLine, Plus } from 'lucide-react'

interface AmountTabProps {
  amount: string
  description: string
  setDescription: (desc: string) => void
  formatDisplayAmount: (val: string) => string
  addCustomAmountToCart: () => void
  handleKeyPress: (key: string) => void
}

export function AmountTab({
  amount,
  description,
  setDescription,
  formatDisplayAmount,
  addCustomAmountToCart,
  handleKeyPress,
}: AmountTabProps) {
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
          {amount &&
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
        <div className="px-3 py-2 w-full mx-auto">
          <div className="relative flex items-center justify-center w-full border border-[#E5E7EB] rounded-[10px] px-4 py-3 focus-within:border-gray-400 transition-colors overflow-hidden">
            {description === '' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PencilLine
                  size={16}
                  color="#9CA3AF"
                  className="mr-1.5"
                />
                <span className="text-[14px] font-medium leading-[120%] text-[#9CA3AF]">
                  What's this payment for?
                </span>
              </div>
            )}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-center text-[15px] font-medium text-black focus:outline-none bg-transparent relative z-10"
            />
          </div>
        </div>

        {/* Keypad */}
        <div className="w-full border-t border-[#F4F6F8]">
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['.', '0', 'backspace'],
          ].map((row, i) => (
            <div
              key={i}
              className="flex border-b border-[#F4F6F8] h-[64px]"
            >
              {row.map((key, j) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`flex-1 flex items-center justify-center transition-colors active:bg-gray-50 flex-col
                    ${j === 1 ? 'border-x border-[#F4F6F8]' : ''}
                  `}
                >
                  {key === 'backspace' ? (
                    <Delete
                      className="w-5 h-5 text-black"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="text-[24px] font-medium text-black">
                      {key}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
