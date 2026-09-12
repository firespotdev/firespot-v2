'use client'

import Image from 'next/image'
import { ArrowLeft, Check, Lock, Plus } from 'lucide-react'
import type { SavedCard } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import { LockSimpleIcon } from '@phosphor-icons/react'

const CARD_BRAND_IMAGES: Record<string, string> = {
  visa: '/images/visa.png',
  mastercard: '/images/mastercard.png',
  verve: '/images/verve.png',
  amex: '/images/amex.png',
}

export interface SavedCardsDrawerProps {
  savedCards: SavedCard[]
  selectedCardId?: string
  onSelectCard: (card: SavedCard) => void
  onAddNewCard: () => void
  onBack?: () => void
}

export function SavedCardsHeaderLeft({ onBack }: { onBack?: () => void }) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  if (!onBack) return null

  return (
    <button
      type="button"
      onClick={() => {
        closeDrawer('saved-cards')
        onBack()
      }}
      aria-label="Back"
      className="w-9 h-9 flex items-center justify-center text-black"
    >
      <ArrowLeft size={22} strokeWidth={2.2} />
    </button>
  )
}

export function SavedCardsDrawer({
  savedCards,
  selectedCardId,
  onSelectCard,
  onAddNewCard,
}: SavedCardsDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)

  const activeCardId = selectedCardId || savedCards[0]?.id

  const handleSelect = (card: SavedCard) => {
    onSelectCard(card)
    closeDrawer('saved-cards')
  }

  const handleAdd = () => {
    closeDrawer('saved-cards')
    onAddNewCard()
  }

  return (
    <div className="px-3 pb-6 flex flex-col">
      <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.04)] overflow-hidden mb-4 border border-[#F1F1F1]">
        {savedCards.map((card, index) => {
          const isSelected = card.id === activeCardId
          const isDefault = index === 0
          const brandKey = card.brand.toLowerCase()
          const brandImage = CARD_BRAND_IMAGES[brandKey]

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelect(card)}
              className="w-full flex items-center justify-between p-3 border-b border-[#EBEBEB] text-left hover:bg-[#F4F6F8] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex w-9 h-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-white">
                  {brandImage ? (
                    <Image
                      src={brandImage}
                      alt={card.brand}
                      width={36}
                      height={24}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">
                      {card.brand.slice(0, 4)}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#0F172A] truncate capitalize">
                    {card.brand} ({card.last4})
                  </p>
                  {isDefault && (
                    <p className="text-xs text-[#64748B] font-medium">
                      Default payment method
                    </p>
                  )}
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-[#22C55E] shrink-0 stroke-[2.5]" />
              )}
            </button>
          )
        })}

        {/* Add debit card */}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full flex items-center gap-3 py-3.5 px-4 text-left hover:bg-[#F4F6F8] transition-colors"
        >
          <div className="size-6 rounded-full bg-[#0075FF] flex items-center justify-center text-white shrink-0">
            <Plus size={16} strokeWidth={3} />
          </div>
          <span className="font-bold text-sm text-[#0075FF]">
            Add debit card
          </span>
        </button>
      </div>

      {/* Footer: Secured by paystack */}
      <div className="flex items-center justify-center gap-1 text-xs text-[#00000080] font-medium py-2">
        <LockSimpleIcon weight="fill" className="w-3 h-3 text-[#00000080]" />
        <span>
          Secured by{' '}
          <strong className="font-bold text-[#00000080]">paystack</strong>
        </span>
      </div>
    </div>
  )
}
