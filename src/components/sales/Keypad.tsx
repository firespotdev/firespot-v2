'use client'

import { Delete } from 'lucide-react'

interface KeypadProps {
  onKeyPress: (key: string) => void
  className?: string
}

export function Keypad({ onKeyPress, className = '' }: KeypadProps) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ]

  return (
    <div
      className={`w-full border-t border-[#F4F6F8] select-none ${className}`}
    >
      {rows.map((row, i) => (
        <div key={i} className="flex border-b border-[#F4F6F8] h-16">
          {row.map((key, j) => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key)}
              className={`flex-1 flex items-center justify-center transition-colors active:bg-gray-100 flex-col cursor-pointer
                ${j === 1 ? 'border-x border-[#F4F6F8]' : ''}
              `}
            >
              {key === 'backspace' ? (
                <Delete className="w-6 h-6 text-black" />
              ) : (
                <span className="text-[22px] font-bold text-black font-satoshi leading-none">
                  {key}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
