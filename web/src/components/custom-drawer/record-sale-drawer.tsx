'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ChevronRight, X } from 'lucide-react'
import { showNotificationToast, TabSwitch } from '@/components/ui'
import { usePlanCatalog } from '@/services/merchant-plans'
import {
  useSale,
  useSales,
  useOngoingSales,
  useDeleteSaleDraft,
  useSaleDrafts,
  useSaveSaleDraft,
} from '@/services/sales/hooks'
import type { Sale, SaleDraft } from '@/services/sales/interface'
import type { SaveSaleDraftPayload } from '@/services/sales/salesApi'
import { useProducts } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import { useDrawerStore } from '@/services/drawer'
import { AmountTab } from '@/components/sales/AmountTab'
import { ItemsTab } from '@/components/sales/ItemsTab'
import { useSaleCart } from '@/components/sales/use-sale-cart'
import { useSaleCheckoutFlow } from '@/components/sales/use-sale-checkout-flow'
import { DRAFT_ITEM_ID, type SaleMode } from '@/components/sales/types'
import { BasketIcon } from '@phosphor-icons/react'

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

const makeDraftClientId = () =>
  typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

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
  const { data: recentSalesData } = useSales({ limit: 5 })
  const { data: ongoingSales = [] } = useOngoingSales()
  const { data: saleDrafts = [] } = useSaleDrafts()
  const { mutateAsync: saveSaleDraft } = useSaveSaleDraft()
  const { mutateAsync: deleteSaleDraft } = useDeleteSaleDraft()
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftClientId, setActiveDraftClientId] = useState(
    makeDraftClientId,
  )
  const activeDraftIdRef = useRef<string | null>(null)
  const saveInFlightRef = useRef<Promise<SaleDraft> | null>(null)
  const activeStartedAtRef = useRef(new Date().toISOString())
  const shouldPreviewRestoredDraftRef = useRef(false)
  const recentDescriptions = useMemo(() => {
    const seen = new Set<string>()

    return (recentSalesData?.data ?? []).flatMap((sale) => {
      const description = sale.description?.trim()
      const key = description?.toLocaleLowerCase()
      if (!description || !key || seen.has(key)) return []
      seen.add(key)
      return [description]
    })
  }, [recentSalesData?.data])

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductSearchActive, setIsProductSearchActive] = useState(false)
  const { data: products = [], isLoading: productsLoading } = useProducts({
    search: searchQuery,
    categoryId:
      isProductSearchActive || activeCategory === 'All'
        ? undefined
        : activeCategory,
  })

  // Collecting requires a verified plan; recording never does.
  const { data: planCatalog } = usePlanCatalog()
  const canCollect = planCatalog?.current?.canCollect !== false

  const prefillSale = saleMode.kind === 'create' ? undefined : editSaleData

  const cart = useSaleCart({ prefillSale })

  useEffect(() => {
    activeDraftIdRef.current = activeDraftId
  }, [activeDraftId])

  const removeActiveDraft = async () => {
    try {
      await saveInFlightRef.current
    } catch {
      // There is no persisted draft to remove when its save failed.
    }
    const draftId = activeDraftIdRef.current
    activeDraftIdRef.current = null
    setActiveDraftId(null)
    setActiveDraftClientId(makeDraftClientId())
    if (!draftId) return
    try {
      await deleteSaleDraft(draftId)
    } catch {
      // The completed sale remains valid even if its expired draft was already
      // removed by MongoDB's TTL cleanup.
    }
  }

  const {
    handleRecordTapped,
    handleCollectTapped,
    openSelectionPreview,
    openPendingCollection,
    resetSaleState,
    restoreDraftCheckout,
    checkoutDraftState,
  } = useSaleCheckoutFlow({
    cart,
    saleMode,
    prefillSale,
    onSaleModeSettled: () => setSaleMode({ kind: 'create' }),
    canCollect,
    onCollectUnavailable: () => {
      useDrawerStore.getState().closeAllDrawers()
      router.push('/plans')
    },
    onSaleSubmitted: removeActiveDraft,
    onSaleDiscarded: removeActiveDraft,
  })

  const handleProductAddTapped = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      openDrawer({
        type: 'variant-selector',
        props: {
          product,
          onAdd: (
            selectedVariant: {
              label: string
              price: number
              values: Array<{
                optionId: string
                optionName: string
                valueId: string
                value: string
              }>
            },
            qty: number,
          ) =>
            cart.addProductToCart(
              product,
              { label: selectedVariant.label, values: selectedVariant.values },
              qty,
              selectedVariant.price,
            ),
          cartQuantity: cart.getProductCartQuantity(product._id),
        },
      })
    } else {
      cart.addProductToCart(product, undefined, 1)
    }
  }

  const getGroupedProducts = () => {
    const groups: Record<string, Product[]> = {}
    products.forEach((prod) => {
      const cat =
        typeof prod.categoryId === 'object'
          ? prod.categoryId.name
          : 'Uncategorised'
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(prod)
    })
    return groups
  }

  const effectiveItems = cart.getEffectiveItems()
  const selectedItemCount = effectiveItems.length
  const hasSaleValue =
    (cart.activeTab === 'amount' &&
      !!cart.amount &&
      cart.amount !== '0' &&
      cart.amount !== '.' &&
      cart.amount !== '0.') ||
    effectiveItems.length > 0
  const draftTotal = cart.getTotal()

  const draftPayload = useMemo<SaveSaleDraftPayload>(
    () => ({
      clientId: activeDraftClientId,
      amount: draftTotal,
      activeTab: cart.activeTab,
      amountInput: cart.amount,
      description: cart.description,
      items: cart.cartItems.map((item) => ({
        clientId: item.id,
        productId:
          item.id.startsWith('custom') || item.id === DRAFT_ITEM_ID
            ? undefined
            : item.id.split('-')[0],
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        description: item.description,
        selectedVariant: item.selectedVariant,
      })),
      paymentMethod: checkoutDraftState.paymentMethod || undefined,
      installmentType: checkoutDraftState.installmentType,
      amountPaid: checkoutDraftState.amountPaid,
      hasSetInstallment: checkoutDraftState.hasSetInstallment,
      customerId: checkoutDraftState.customer?._id,
      dueDate: checkoutDraftState.dueDate || undefined,
    }),
    [
      cart.activeTab,
      activeDraftClientId,
      cart.amount,
      cart.cartItems,
      cart.description,
      draftTotal,
      checkoutDraftState.amountPaid,
      checkoutDraftState.customer,
      checkoutDraftState.dueDate,
      checkoutDraftState.hasSetInstallment,
      checkoutDraftState.installmentType,
      checkoutDraftState.paymentMethod,
    ],
  )

  const persistDraftSnapshot = useCallback(
    async (payload: SaveSaleDraftPayload) => {
      try {
        await saveInFlightRef.current
      } catch {
        // Retry the latest snapshot after a failed background save.
      }
      const request = saveSaleDraft({
        draftId: activeDraftIdRef.current || undefined,
        payload,
      })
      saveInFlightRef.current = request
      try {
        const savedDraft = await request
        activeDraftIdRef.current = savedDraft._id
        setActiveDraftId(savedDraft._id)
        return savedDraft
      } finally {
        if (saveInFlightRef.current === request) saveInFlightRef.current = null
      }
    },
    [saveSaleDraft],
  )

  useEffect(() => {
    if (saleMode.kind !== 'create' || !hasSaleValue) return
    const timeout = window.setTimeout(() => {
      void persistDraftSnapshot(draftPayload).catch(() => undefined)
    }, 15_000)
    return () => window.clearTimeout(timeout)
  }, [draftPayload, hasSaleValue, persistDraftSnapshot, saleMode.kind])

  useEffect(() => {
    if (!shouldPreviewRestoredDraftRef.current) return
    shouldPreviewRestoredDraftRef.current = false
    openSelectionPreview()
  }, [
    cart.amount,
    cart.cartItems,
    checkoutDraftState.amountPaid,
    checkoutDraftState.customer,
    checkoutDraftState.dueDate,
    checkoutDraftState.installmentType,
    checkoutDraftState.paymentMethod,
    openSelectionPreview,
  ])

  const handleStartNewSale = async () => {
    try {
      if (hasSaleValue) await persistDraftSnapshot(draftPayload)
    } catch {
      showNotificationToast({
        message: 'Could not hold this sale. Please try again.',
        mode: 'error',
      })
      return
    }
    resetSaleState()
    activeDraftIdRef.current = null
    setActiveDraftId(null)
    setActiveDraftClientId(makeDraftClientId())
    activeStartedAtRef.current = new Date().toISOString()
    useDrawerStore.getState().closeDrawer('ongoing-sales')
  }

  const handleResumeDraft = async (draft: SaleDraft) => {
    try {
      if (hasSaleValue) await persistDraftSnapshot(draftPayload)
    } catch {
      showNotificationToast({
        message: 'Could not hold the current sale. Please try again.',
        mode: 'error',
      })
      return
    }
    shouldPreviewRestoredDraftRef.current = true
    cart.restoreDraft(draft)
    restoreDraftCheckout(draft)
    activeDraftIdRef.current = draft._id
    setActiveDraftId(draft._id)
    setActiveDraftClientId(draft.clientId || makeDraftClientId())
    activeStartedAtRef.current = draft.createdAt
    useDrawerStore.getState().closeDrawer('ongoing-sales')
  }

  const handleOpenOngoingSales = () => {
    openDrawer({
      type: 'ongoing-sales',
      direction: 'left',
      props: {
        onSelectSale: (sale: Sale) => {
          useDrawerStore.getState().closeDrawer('ongoing-sales')
          openPendingCollection(sale)
        },
        activeDraftClientId,
        activeDraft: hasSaleValue
          ? {
              ...draftPayload,
              createdAt: activeStartedAtRef.current,
            }
          : undefined,
        onSelectActiveDraft: () => {
          useDrawerStore.getState().closeDrawer('ongoing-sales')
          openSelectionPreview()
        },
        onSelectDraft: handleResumeDraft,
        onNewSale: handleStartNewSale,
        onClearActiveDraft: async () => {
          await removeActiveDraft()
          resetSaleState()
        },
      },
    })
  }
  const heldDraftCount = saleDrafts.filter(
    (draft) => draft.clientId !== activeDraftClientId,
  ).length
  const ongoingCount =
    ongoingSales.length + heldDraftCount + (hasSaleValue ? 1 : 0)

  const handleClose = async () => {
    try {
      if (saleMode.kind === 'create' && hasSaleValue) {
        await persistDraftSnapshot(draftPayload)
      }
    } catch {
      showNotificationToast({
        message: 'Could not hold this sale. Please try again.',
        mode: 'error',
      })
      return
    }
    closeDrawer()
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-satoshi">
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-2">
        <button
          type="button"
          onClick={handleOpenOngoingSales}
          aria-label="Ongoing sales"
          className="relative -ml-2 shrink-0 rounded-full p-2 text-black transition-colors hover:bg-black/5 active:scale-95 cursor-pointer"
        >
          <BasketIcon className="w-6 h-6" />
          {ongoingCount > 0 && (
            <span className="absolute right-1 top-0.5 grid h-[17px] w-[17px] place-items-center rounded-full bg-[#FF2D55] text-[9px] font-bold leading-none tabular-nums text-white">
              {ongoingCount > 99 ? '99+' : ongoingCount}
            </span>
          )}
        </button>

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
          onClick={() => void handleClose()}
          aria-label="Close"
          className="p-2 -mr-2 rounded-full shrink-0 text-black"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AMOUNT TAB */}
      {cart.activeTab === 'amount' && (
        <AmountTab
          amount={cart.amount}
          description={cart.description}
          setDescription={cart.setDescription}
          recentDescriptions={recentDescriptions}
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
          isSearchActive={isProductSearchActive}
          setIsSearchActive={setIsProductSearchActive}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          products={products}
          isLoading={productsLoading}
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
            {selectedItemCount === 1
              ? '1 item selected'
              : `${selectedItemCount} items selected`}
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
            className={`h-12 px-5 rounded-full font-bold text-sm transition-all duration-200 ${
              hasSaleValue
                ? 'bg-[#F1F1F1] text-black border border-[#E9EBED] hover:bg-gray-100 active:bg-gray-250'
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
              onClick={handleCollectTapped}
              className={`h-12 px-5 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 ${
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
