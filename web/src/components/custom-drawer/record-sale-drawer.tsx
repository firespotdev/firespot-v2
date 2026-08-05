'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import { TabSwitch } from '@/components/ui'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useSale } from '@/services/sales/hooks'
import { useProducts } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import { useDrawerStore } from '@/services/drawer'
import { AmountTab } from '@/components/sales/AmountTab'
import { ItemsTab } from '@/components/sales/ItemsTab'
import { useSaleCart } from '@/components/sales/use-sale-cart'
import { useSaleCheckoutFlow } from '@/components/sales/use-sale-checkout-flow'
import type { SaleMode } from '@/components/sales/types'

interface Props {
  /** Id of the sale being edited, with `isEditMode`. */
  editId?: string
  isEditMode?: boolean
  /** Id of a customer-initiated pending sale being confirmed. */
  confirmId?: string
  closeDrawer: () => void
}

const formatDisplayAmount = (val: string) => {
  if (!val) return '0'
  const [int, dec] = val.split('.')
  const formattedInt = new Intl.NumberFormat('en-NG').format(Number(int))
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
}

export function RecordSaleDrawer({
  editId,
  isEditMode,
  confirmId,
  closeDrawer,
}: Props) {
  const router = useRouter()
  const { openDrawer } = useDrawerStore()

  const [saleMode, setSaleMode] = useState<SaleMode>(() => {
    if (confirmId) return { kind: 'confirm', id: confirmId }
    if (isEditMode && editId) return { kind: 'edit', id: editId }
    return { kind: 'create' }
  })

  const { data: editSaleData } = useSale(
    saleMode.kind === 'create' ? undefined : saleMode.id,
  )

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: products = [] } = useProducts({
    search: searchQuery,
    category: activeCategory,
  })

  // Collecting requires a verified plan; recording never does.
  const { data: planCatalog } = usePlanCatalog()
  const canCollect = planCatalog?.current?.canCollect !== false

  const prefillSale = saleMode.kind === 'create' ? undefined : editSaleData

  const cart = useSaleCart({ prefillSale })

  const { handleRecordTapped, handleCollectTapped, openSelectionPreview } =
    useSaleCheckoutFlow({
      cart,
      saleMode,
      prefillSale,
      onSaleModeSettled: () => setSaleMode({ kind: 'create' }),
    })

  const handleProductAddTapped = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      openDrawer({
        type: 'variant-selector',
        props: {
          product,
          onAdd: (size: string, color: string, qty: number) =>
            cart.addProductToCart(product, size, color, qty),
        },
      })
    } else {
      cart.addProductToCart(product, undefined, undefined, 1)
    }
  }

  const getGroupedProducts = () => {
    const groups: Record<string, Product[]> = {}
    products.forEach((prod) => {
      const cat = prod.category || 'General'
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(prod)
    })
    return groups
  }

  const onCollect = () => {
    if (!canCollect) {
      closeDrawer()
      router.push('/plans')
      return
    }
    handleCollectTapped()
  }

  const effectiveItems = cart.getEffectiveItems()
  const hasSaleValue =
    (cart.activeTab === 'amount' &&
      !!cart.amount &&
      cart.amount !== '0' &&
      cart.amount !== '.' &&
      cart.amount !== '0.') ||
    effectiveItems.length > 0

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-satoshi">
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-2">
        <span className="w-10 shrink-0" aria-hidden="true" />

        {/* Tab switch replacing 'Enter amount' title */}
        <TabSwitch
          value={cart.activeTab}
          onChange={cart.setActiveTab}
          options={[
            { label: 'AMOUNT', value: 'amount' },
            { label: 'ITEMS', value: 'items' },
          ]}
        />

        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="p-2 -mr-2 rounded-full shrink-0 text-black"
        >
          <X className="w-6 h-6 stroke-[2.5px]" />
        </button>
      </div>

      {/* AMOUNT TAB */}
      {cart.activeTab === 'amount' && (
        <AmountTab
          amount={cart.amount}
          description={cart.description}
          setDescription={cart.setDescription}
          formatDisplayAmount={formatDisplayAmount}
          addCustomAmountToCart={cart.addCustomAmountToCart}
          handleKeyPress={cart.handleKeyPress}
          showAddButton={!cart.amountMirrorsCartTotal}
        />
      )}

      {/* ITEMS TAB */}
      {cart.activeTab === 'items' && (
        <ItemsTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          products={products}
          getProductCartQuantity={cart.getProductCartQuantity}
          handleProductAddTapped={handleProductAddTapped}
          getGroupedProducts={getGroupedProducts}
          openDrawer={openDrawer}
        />
      )}

      {/* BOTTOM ACTIVE BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#F4F6F8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0px_-2px_10px_rgba(0,0,0,0.03)] z-20 flex justify-between items-center min-h-20">
        {/* Left Column: Selection text */}
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold text-black">
            {effectiveItems.length === 1
              ? '1 item selected'
              : `${effectiveItems.length} items selected`}
          </span>
          <button
            type="button"
            onClick={openSelectionPreview}
            className="text-[13px] font-medium flex items-center gap-0.5"
          >
            <span className="text-[#9CA3AF] leading-none">View selection</span>
            <ChevronRight className="text-black mt-[2.5%]" size={12} />
          </button>
        </div>

        {/* Right Column: Buttons */}
        <div className="flex gap-2">
          {/* Record Button */}
          <button
            type="button"
            disabled={!hasSaleValue}
            onClick={handleRecordTapped}
            className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 ${
              hasSaleValue
                ? 'bg-[#F4F6F8] text-black border border-[#E9EBED] hover:bg-gray-100 active:bg-gray-250'
                : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
            }`}
          >
            Record
          </button>

          {/* Collect Button — hidden when confirming an existing payment */}
          {saleMode.kind !== 'confirm' && (
            <button
              type="button"
              disabled={!hasSaleValue}
              onClick={onCollect}
              className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 ${
                hasSaleValue
                  ? 'bg-black text-white hover:bg-black/90 active:bg-black/85'
                  : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
              }`}
            >
              Collect
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
