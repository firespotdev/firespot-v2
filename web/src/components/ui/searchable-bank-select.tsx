'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BankItem {
  name: string
  code: string
  slug?: string
}

export interface SearchableBankSelectProps {
  banks: BankItem[]
  value?: string
  onValueChange: (bankCode: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
}

export function SearchableBankSelect({
  banks,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select a bank',
  className,
  id,
}: SearchableBankSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === value),
    [banks, value],
  )

  // Sync display text when value or banks change externally while closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedBank?.name || '')
    }
  }, [selectedBank, isOpen])

  // Filter banks based on search query
  const filteredBanks = useMemo(() => {
    if (!isOpen) return banks
    const query = searchQuery.trim().toLowerCase()
    if (!query) return banks
    return banks.filter((b) => b.name.toLowerCase().includes(query))
  }, [banks, searchQuery, isOpen])

  // Reset highlighted index when filter changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredBanks.length])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery(selectedBank?.name || '')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, selectedBank])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const activeItem = listRef.current.children[highlightedIndex] as HTMLElement
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (bank: BankItem) => {
    onValueChange(bank.code)
    setSearchQuery(bank.name)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange('')
    setSearchQuery('')
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredBanks.length - 1 ? prev + 1 : prev,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredBanks[highlightedIndex]) {
          handleSelect(filteredBanks[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery(selectedBank?.name || '')
        break
      case 'Tab':
        setIsOpen(false)
        setSearchQuery(selectedBank?.name || '')
        break
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="bank-options-list"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={cn(
            'border-[#DDDDDD] h-11 w-full rounded-md border bg-transparent px-3 py-2 pr-16 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-[#9CA3AF] placeholder:font-normal',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-black transition-colors rounded-sm"
              aria-label="Clear selection"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (disabled) return
              setIsOpen((prev) => !prev)
              inputRef.current?.focus()
            }}
            className="p-1 text-black hover:text-gray-700 transition-transform duration-200"
            aria-label="Toggle bank list"
          >
            <ChevronDown
              className={cn(
                'size-4 text-black transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          id="bank-options-list"
          ref={listRef}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-[#DDDDDD] bg-white p-1 shadow-md animate-in fade-in-0 zoom-in-95 scrollbar-thin"
        >
          {filteredBanks.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-muted-foreground">
              No bank found
            </div>
          ) : (
            filteredBanks.map((bank, index) => {
              const isSelected = bank.code === value
              const isHighlighted = index === highlightedIndex

              return (
                <div
                  key={bank.code}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers
                    e.preventDefault()
                    handleSelect(bank)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors select-none',
                    isHighlighted ? 'bg-[#F4F6F8]' : 'bg-transparent',
                    isSelected && 'font-semibold text-black',
                  )}
                >
                  <span className="truncate mr-2">{bank.name}</span>
                  {isSelected && (
                    <Check className="size-4 shrink-0 text-[#24C166]" />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
