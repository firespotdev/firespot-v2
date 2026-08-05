'use client'

import { useEffect, useState } from 'react'
import type { Sale } from '@/services/sales/interface'
import { DRAFT_ITEM_ID, type CartItem } from './types'

interface Options {
  /**
   * The sale being edited or confirmed. Its amount, description and items
   * seed the keypad and cart; undefined for a new sale.
   */
  prefillSale?: Sale
}

/**
 * Amount-entry and cart state for the record-sale sheet: the keypad, the typed
 * draft item, committed cart items, and the totals derived from both.
 */
export function useSaleCart({ prefillSale }: Options) {
  const [activeTab, setActiveTab] = useState<'amount' | 'items'>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [hasPrefilled, setHasPrefilled] = useState(false)
  const [preservedExistingTotal, setPreservedExistingTotal] = useState<
    number | null
  >(null)
  const [amountMirrorsCartTotal, setAmountMirrorsCartTotal] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const editSaleId = prefillSale?._id

  // Reset the prefill flag when the target sale changes.
  useEffect(() => {
    setHasPrefilled(false)
  }, [editSaleId])

  // Prefill in edit or confirm mode.
  useEffect(() => {
    if (!prefillSale || hasPrefilled) return

    const editSaleData = prefillSale
    const existingItems = (editSaleData.items || [])
      .filter((item) => Number(item.price) > 0 && Number(item.quantity) > 0)
      .map((item, index) => ({
        id: item.productId || `custom-existing-${index}`,
        name:
          item.productName || editSaleData.description || `Item ${index + 1}`,
        price: Number(item.price),
        quantity: Number(item.quantity),
        selectedVariant: item.selectedVariant,
      }))

    setAmount(editSaleData.amount?.toString() || '')
    setDescription(editSaleData.description || '')

    if (existingItems.length > 0) {
      setCartItems(existingItems)
      setActiveTab('amount')
      setPreservedExistingTotal(Number(editSaleData.amount) || null)
      setAmountMirrorsCartTotal(true)
    } else {
      setCartItems([])
      setPreservedExistingTotal(null)
      setAmountMirrorsCartTotal(false)
    }

    setHasPrefilled(true)
  }, [prefillSale, hasPrefilled])

  const handleKeyPress = (key: string) => {
    // The first keypress after a prefill replaces the mirrored cart total with
    // a fresh amount, keeping the old item names as the description.
    if (amountMirrorsCartTotal) {
      setCartItems([])
      setAmountMirrorsCartTotal(false)
      setPreservedExistingTotal(null)
      setDescription(
        (current) =>
          current ||
          prefillSale?.description ||
          cartItems
            .map((item) =>
              item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
            )
            .join(', '),
      )
    }

    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1))
      return
    }

    setAmount((prev) => {
      if (key === '.' && prev.includes('.')) return prev
      if (key === '.' && prev === '') return '0.'
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
      if (prev.length >= 10) return prev
      if (prev === '0' && key !== '.') return key
      return prev + key
    })
  }

  const getDraftItem = (): CartItem | null => {
    const value = Number(amount)
    if (
      amountMirrorsCartTotal ||
      activeTab !== 'amount' ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return null
    }
    return {
      id: DRAFT_ITEM_ID,
      name: description.trim() || `Item ${cartItems.length + 1}`,
      price: value,
      quantity: 1,
    }
  }

  const getEffectiveItems = (committedItems = cartItems): CartItem[] => {
    const draft = getDraftItem()
    return draft ? [...committedItems, draft] : committedItems
  }

  const calculateTotal = (items: CartItem[]) =>
    Math.round(
      items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0) * 100,
    ) / 100

  const getTotal = () =>
    preservedExistingTotal ?? calculateTotal(getEffectiveItems())

  const getProductCartQuantity = (productId: string) =>
    cartItems
      .filter((item) => item.id.startsWith(productId))
      .reduce((sum, item) => sum + item.quantity, 0)

  const addCustomAmountToCart = () => {
    const draft = getDraftItem()
    if (!draft) return

    const normalizedDescription = description.trim()
    setCartItems((prev) => [
      ...prev,
      {
        ...draft,
        id: `custom-${Date.now()}`,
        name: normalizedDescription || draft.name,
      },
    ])
    setAmount('')
    setDescription('')
    setPreservedExistingTotal(null)
    setAmountMirrorsCartTotal(false)
  }

  const addProductToCart = (
    prod: { _id: string; name: string; price: number },
    size?: string,
    color?: string,
    qty: number = 1,
  ) => {
    const id = `${prod._id}-${size || ''}-${color || ''}`
    setPreservedExistingTotal(null)
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === id)
      const updated: CartItem[] =
        existingIndex > -1
          ? prev.map((item, idx) =>
              idx === existingIndex
                ? { ...item, quantity: item.quantity + qty }
                : item,
            )
          : [
              ...prev,
              {
                id,
                name: prod.name,
                price: prod.price,
                quantity: qty,
                selectedVariant: size || color ? { size, color } : undefined,
              },
            ]

      if (amountMirrorsCartTotal) {
        setAmount(String(calculateTotal(updated)))
      }
      return updated
    })
  }

  const resetCart = () => {
    setCartItems([])
    setActiveTab('amount')
    setAmount('')
    setDescription('')
    setPreservedExistingTotal(null)
    setAmountMirrorsCartTotal(false)
  }

  return {
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    description,
    setDescription,
    cartItems,
    setCartItems,
    amountMirrorsCartTotal,
    setPreservedExistingTotal,
    handleKeyPress,
    getEffectiveItems,
    calculateTotal,
    getTotal,
    getProductCartQuantity,
    addCustomAmountToCart,
    addProductToCart,
    resetCart,
  }
}

export type SaleCart = ReturnType<typeof useSaleCart>
