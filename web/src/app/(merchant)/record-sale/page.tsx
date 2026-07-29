'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { TabSwitch, showNotificationToast } from '@/components/ui'
import { usePlanCatalog } from '@/services/merchant-plans'
import Image from 'next/image'
import {
  useCreateManualSale,
  useSale,
  useEditSale,
  useRecordSale,
  useCreatePendingCollectSale,
} from '@/services/sales/hooks'
import { useProducts } from '@/services/products/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useUserProfile } from '@/services/users'
import Link from 'next/link'
import { AmountTab } from '@/components/sales/AmountTab'
import { ItemsTab } from '@/components/sales/ItemsTab'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  selectedVariant?: {
    size?: string
    color?: string
  }
}

type CheckoutMode = 'record' | 'collect' | 'preview'

const DRAFT_ITEM_ID = 'custom-current-draft'

export default function RecordSalePage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-white flex items-center justify-center font-satoshi font-bold">
          Loading...
        </div>
      }
    >
      <RecordSaleContent />
    </Suspense>
  )
}

function RecordSaleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const isEditMode = searchParams.get('edit') === 'true'
  // Confirm an existing customer-initiated pending sale (from /recents).
  const confirmId = searchParams.get('confirm')
  const isConfirmMode = !!confirmId

  const { data: editSaleData } = useSale(
    isEditMode
      ? editId || undefined
      : isConfirmMode
        ? confirmId || undefined
        : undefined,
  )

  const { data: profile } = useUserProfile()

  // API mutations & queries
  const createManualSaleMutation = useCreateManualSale()
  const editSaleMutation = useEditSale()
  const recordSaleMutation = useRecordSale()
  const collectSaleMutation = useCreatePendingCollectSale()

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: products = [] } = useProducts({
    search: searchQuery,
    category: activeCategory,
  })

  const { openDrawer, closeDrawer, closeAllDrawers } = useDrawerStore()

  // Collecting requires a verified plan; recording never does.
  const { data: planCatalog } = usePlanCatalog()
  const canCollect = planCatalog?.current?.canCollect !== false

  // Keypad & sale state
  const [activeTab, setActiveTab] = useState<'amount' | 'items'>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [hasPrefilled, setHasPrefilled] = useState(false)
  const [preservedExistingTotal, setPreservedExistingTotal] = useState<
    number | null
  >(null)
  const [amountMirrorsCartTotal, setAmountMirrorsCartTotal] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Final confirmation states
  const [step, setStep] = useState<'input' | 'saving' | 'success' | 'error'>(
    'input',
  )

  // Checkout summary states
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string>('')
  const [checkoutInstallmentType, setCheckoutInstallmentType] = useState<
    'full' | 'part'
  >('full')
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<number>(0)
  const [hasSetInstallment, setHasSetInstallment] = useState<boolean>(false)
  const [checkoutCustomer, setCheckoutCustomer] = useState<any>(null)
  const [checkoutDueDate, setCheckoutDueDate] = useState<string>('')
  const [checkoutMode, setCheckoutMode] = useState<'record' | 'collect'>(
    'record',
  )

  // Reset prefill flag when the target sale id changes
  useEffect(() => {
    setHasPrefilled(false)
  }, [editId, confirmId])

  // Prefill in edit or confirm mode
  useEffect(() => {
    if ((isEditMode || isConfirmMode) && editSaleData && !hasPrefilled) {
      setCheckoutPaymentMethod(editSaleData.paymentMethod || '')
      setCheckoutCustomer(
        editSaleData.customerId && typeof editSaleData.customerId === 'object'
          ? editSaleData.customerId
          : null,
      )
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

      if (existingItems.length > 0) {
        setCartItems(existingItems)
        setActiveTab('amount')
        setAmount(editSaleData.amount?.toString() || '')
        setDescription(editSaleData.description || '')
        setPreservedExistingTotal(Number(editSaleData.amount) || null)
        setAmountMirrorsCartTotal(true)
      } else {
        setCartItems([])
        setAmount(editSaleData.amount?.toString() || '')
        setDescription(editSaleData.description || '')
        setPreservedExistingTotal(null)
        setAmountMirrorsCartTotal(false)
      }
      setHasPrefilled(true)
    }
  }, [editSaleData, isEditMode, isConfirmMode, hasPrefilled])

  // Keypad keys handler
  const handleKeyPress = (key: string) => {
    if (amountMirrorsCartTotal) {
      setCartItems([])
      setAmountMirrorsCartTotal(false)
      setPreservedExistingTotal(null)
      setDescription(
        (current) =>
          current ||
          editSaleData?.description ||
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

  // Calculations
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

  const calculateSubtotal = (items: CartItem[]) => {
    return (
      Math.round(
        items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0) * 100,
      ) / 100
    )
  }

  const calculateTotal = (items: CartItem[]) => calculateSubtotal(items)

  const getTotal = () =>
    preservedExistingTotal ?? calculateTotal(getEffectiveItems())

  const updateCartQtyAndSyncDrawer = (
    id: string,
    delta: number,
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    dueDateVal = checkoutDueDate,
    mode: CheckoutMode = checkoutMode,
    installmentConfigured = hasSetInstallment,
  ) => {
    if (id === DRAFT_ITEM_ID) {
      setAmount('')
      setPreservedExistingTotal(null)
      const updated = [...cartItems]
      const newTotal = calculateTotal(updated)
      if (amountMirrorsCartTotal) setAmount(String(newTotal))
      const nextAmountPaid =
        instType === 'full' ? newTotal : Math.min(amountPaidVal, newTotal)
      setCheckoutAmountPaid(nextAmountPaid)
      openCheckoutSaleDrawer(
        method,
        instType,
        nextAmountPaid,
        cust,
        updated,
        newTotal,
        dueDateVal,
        mode,
        installmentConfigured,
      )
      return
    }

    setCartItems((prev) => {
      const updated = prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0)
      setPreservedExistingTotal(null)

      const effectiveUpdated = getEffectiveItems(updated)
      const newTotal = calculateTotal(effectiveUpdated)
      if (amountMirrorsCartTotal) setAmount(String(newTotal))
      const nextAmountPaid =
        instType === 'full' ? newTotal : Math.min(amountPaidVal, newTotal)
      setCheckoutAmountPaid(nextAmountPaid)

      openCheckoutSaleDrawer(
        method,
        instType,
        nextAmountPaid,
        cust,
        effectiveUpdated,
        newTotal,
        dueDateVal,
        mode,
        installmentConfigured,
      )

      return updated
    })
  }

  const getProductCartQuantity = (productId: string) => {
    return cartItems
      .filter((item) => item.id.startsWith(productId))
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const getGroupedProducts = () => {
    const groups: Record<string, typeof products> = {}
    products.forEach((prod: any) => {
      const cat = prod.category || 'General'
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(prod)
    })
    return groups
  }

  const addCustomAmountToCart = () => {
    const val = Number(amount)
    if (!val) return
    const normalizedDescription = description.trim()

    const draft = getDraftItem()
    if (!draft) return
    const newItem: CartItem = {
      ...draft,
      id: `custom-${Date.now()}`,
      name: normalizedDescription || draft.name,
    }
    setCartItems((prev) => [...prev, newItem])
    setAmount('')
    setDescription('')
    setPreservedExistingTotal(null)
    setAmountMirrorsCartTotal(false)
  }

  const addProductToCart = (
    prod: any,
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

  const resetSaleState = () => {
    setCartItems([])
    setActiveTab('amount')
    setAmount('')
    setDescription('')
    setPreservedExistingTotal(null)
    setAmountMirrorsCartTotal(false)
    setCheckoutCustomer(null)
    setCheckoutPaymentMethod('')
    setCheckoutInstallmentType('full')
    setCheckoutAmountPaid(0)
    setHasSetInstallment(false)
    setCheckoutDueDate('')
    setStep('input')
  }

  const clearCart = () => {
    resetSaleState()
  }

  const openRecordedSaleDetails = (sale: any) => {
    resetSaleState()
    closeAllDrawers()
    if (!sale) return
    openDrawer({
      type: 'transaction-details',
      props: { sale, justRecorded: true },
    })
  }

  const handleProductAddTapped = (product: any) => {
    if (product.variants && product.variants.length > 0) {
      openDrawer({
        type: 'variant-selector',
        props: {
          product,
          onAdd: (size: string, color: string, qty: number) => {
            addProductToCart(product, size, color, qty)
          },
        },
      })
    } else {
      addProductToCart(product, undefined, undefined, 1)
    }
  }

  const submitConfirmedSale = (
    paymentMethod: string,
    installmentType: 'full' | 'part',
    paidVal: number,
    customer: any,
    itemsList: CartItem[],
    totalVal: number,
    dueDateVal?: string,
  ) => {
    closeAllDrawers()
    openDrawer({
      type: 'record-success',
      props: {
        successDetails: null,
        status: 'saving',
        errorMessage: '',
        setStep,
        setAmount,
        setDescription,
        onRecordAnother: resetSaleState,
      },
    })

    const normalizedDescription = itemsList
      .filter((item) => !/^Item \d+$/.test(item.name))
      .map((item) =>
        item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
      )
      .join(', ')
    const payload = {
      amount: totalVal,
      description: normalizedDescription || undefined,
      paymentMethod,
      isPaidInFull: installmentType === 'full',
      amountPaid: installmentType === 'full' ? totalVal : paidVal,
      totalDue: totalVal,
      balanceOwed:
        installmentType === 'full'
          ? 0
          : Math.round((totalVal - paidVal) * 100) / 100,
      customerId: customer?._id,
      dueDate: dueDateVal || undefined,
      items: itemsList.map((item) => ({
        productId:
          item.id.startsWith('custom') || item.id === DRAFT_ITEM_ID
            ? undefined
            : item.id.split('-')[0],
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
      })),
    }

    if (isConfirmMode && confirmId) {
      // Confirm the existing customer-initiated pending sale in place
      // (updates it to CONFIRMED) instead of creating a new record.
      recordSaleMutation.mutate(
        { saleId: confirmId, payload },
        {
          onSuccess: (data) => {
            router.replace('/record-sale')
            openRecordedSaleDetails(data)
          },
          onError: (error: any) => {
            const msg =
              error?.response?.data?.message || 'Failed to confirm payment.'
            closeAllDrawers()
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: null,
                status: 'error',
                errorMessage: msg,
                setStep,
                setAmount,
                setDescription,
                onRecordAnother: resetSaleState,
              },
            })
          },
        },
      )
    } else if (isEditMode && editId) {
      editSaleMutation.mutate(
        { saleId: editId, payload },
        {
          onSuccess: (data) => {
            router.replace('/record-sale')
            openRecordedSaleDetails({ ...data, isEdit: true })
          },
          onError: (error: any) => {
            const msg =
              error?.response?.data?.message || 'Failed to update transaction.'
            closeAllDrawers()
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: null,
                status: 'error',
                errorMessage: msg,
                setStep,
                setAmount,
                setDescription,
                onRecordAnother: resetSaleState,
              },
            })
          },
        },
      )
    } else {
      createManualSaleMutation.mutate(payload, {
        onSuccess: (data) => {
          openRecordedSaleDetails(data)
        },
        onError: (error: any) => {
          const msg =
            error?.response?.data?.message || 'Failed to record transaction.'
          closeAllDrawers()
          openDrawer({
            type: 'record-success',
            props: {
              successDetails: null,
              status: 'error',
              errorMessage: msg,
              setStep,
              setAmount,
              setDescription,
              onRecordAnother: resetSaleState,
            },
          })
        },
      })
    }
  }

  const openPaymentMethodStep = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cartItems,
    totVal = getTotal(),
  ) => {
    openDrawer({
      type: 'payment-method',
      props: {
        onSubmit: (newMethod: string) => {
          setCheckoutPaymentMethod(newMethod)
          closeDrawer('payment-method')
          openSplitPaymentStep(
            newMethod,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
          )
        },
      },
    })
  }

  const openSplitPaymentStep = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cartItems,
    totVal = getTotal(),
  ) => {
    openDrawer({
      type: 'split-payment',
      props: {
        totalAmount: totVal,
        initialInstallmentType: instType,
        initialAmountPaid: amountPaidVal,
        onBack: () => {
          closeDrawer('split-payment')
          openPaymentMethodStep(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
          )
        },
        onContinue: (newInstType: 'full' | 'part', newAmountPaid: number) => {
          setHasSetInstallment(true)
          setCheckoutInstallmentType(newInstType)
          setCheckoutAmountPaid(newAmountPaid)
          closeDrawer('split-payment')
          openCustomerSelectStep(
            method,
            newInstType,
            newAmountPaid,
            cust,
            itemsList,
            totVal,
          )
        },
      },
    })
  }

  const openCustomerSelectStep = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cartItems,
    totVal = getTotal(),
  ) => {
    openDrawer({
      type: 'customer-select',
      props: {
        requireCustomer: instType === 'part',
        title: instType === 'part' ? 'Who owes you?' : 'Who paid you?',
        onBack: () => {
          closeDrawer('customer-select')
          openSplitPaymentStep(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
          )
        },
        onSelect: (newCust: any) => {
          setCheckoutCustomer(newCust)
          closeDrawer('customer-select')
          openCheckoutSaleDrawer(
            method,
            instType,
            amountPaidVal,
            newCust,
            itemsList,
            totVal,
            checkoutDueDate,
            checkoutMode,
            true,
          )
        },
      },
    })
  }

  const openCheckoutSaleDrawer = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cartItems,
    totVal = getTotal(),
    dueDateVal = checkoutDueDate,
    mode: CheckoutMode = checkoutMode,
    installmentConfigured = hasSetInstallment,
  ) => {
    openDrawer({
      type: 'checkout-sale',
      props: {
        cartItems: itemsList,
        onClear: () => {
          clearCart()
          closeDrawer()
        },
        onUpdateQty: (id: string, delta: number) =>
          updateCartQtyAndSyncDrawer(
            id,
            delta,
            method,
            instType,
            amountPaidVal,
            cust,
            dueDateVal,
            mode,
            installmentConfigured,
          ),
        paymentMethod: method,
        installmentType: instType,
        amountPaid: amountPaidVal,
        hasSetInstallment: installmentConfigured,
        customer: cust,
        totalAmount: totVal,
        dueDate: dueDateVal,
        mode,
        isLoading: collectSaleMutation.isPending,
        onEditDueDate: (newDueDate: string) => {
          setCheckoutDueDate(newDueDate)
          openCheckoutSaleDrawer(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
            newDueDate,
            mode,
            installmentConfigured,
          )
        },
        onEditPaymentMethod: () => {
          openDrawer({
            type: 'payment-method',
            props: {
              onSubmit: (newMethod: string) => {
                setCheckoutPaymentMethod(newMethod)
                openCheckoutSaleDrawer(
                  newMethod,
                  instType,
                  amountPaidVal,
                  cust,
                  itemsList,
                  totVal,
                  dueDateVal,
                  mode,
                  installmentConfigured,
                )
              },
            },
          })
        },
        onEditInstallment: () => {
          openDrawer({
            type: 'split-payment',
            props: {
              totalAmount: totVal,
              initialInstallmentType: instType,
              initialAmountPaid: amountPaidVal,
              onBack: () =>
                openCheckoutSaleDrawer(
                  method,
                  instType,
                  amountPaidVal,
                  cust,
                  itemsList,
                  totVal,
                  dueDateVal,
                  mode,
                  installmentConfigured,
                ),
              onContinue: (
                newInstType: 'full' | 'part',
                newAmountPaid: number,
              ) => {
                setHasSetInstallment(true)
                setCheckoutInstallmentType(newInstType)
                setCheckoutAmountPaid(newAmountPaid)
                const finalDueDate = newInstType === 'full' ? '' : dueDateVal
                if (newInstType === 'full') {
                  setCheckoutDueDate('')
                }
                openCheckoutSaleDrawer(
                  method,
                  newInstType,
                  newAmountPaid,
                  cust,
                  itemsList,
                  totVal,
                  finalDueDate,
                  mode,
                  true,
                )
              },
            },
          })
        },
        onEditCustomer: () => {
          openDrawer({
            type: 'customer-select',
            props: {
              requireCustomer: instType === 'part',
              title: instType === 'part' ? 'Who owes you?' : 'Who paid you?',
              onBack: () =>
                openCheckoutSaleDrawer(
                  method,
                  instType,
                  amountPaidVal,
                  cust,
                  itemsList,
                  totVal,
                  dueDateVal,
                  mode,
                  installmentConfigured,
                ),
              onSelect: (newCust: any) => {
                setCheckoutCustomer(newCust)
                openCheckoutSaleDrawer(
                  method,
                  instType,
                  amountPaidVal,
                  newCust,
                  itemsList,
                  totVal,
                  dueDateVal,
                  mode,
                  installmentConfigured,
                )
              },
            },
          })
        },
        onConfirmRecord: () => {
          if (mode === 'preview') return

          if (mode === 'record' && !installmentConfigured) {
            openSplitPaymentStep(
              method,
              instType,
              amountPaidVal,
              cust,
              itemsList,
              totVal,
            )
            return
          }

          if (mode === 'collect') {
            const payload = {
              merchantId: profile?.id || '',
              amount: totVal,
              description:
                itemsList
                  .filter((i) => !/^Item \d+$/.test(i.name))
                  .map((i) =>
                    i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name,
                  )
                  .join(', ') || undefined,
              items: itemsList.map((item) => ({
                productId:
                  item.id.startsWith('custom') || item.id === DRAFT_ITEM_ID
                    ? undefined
                    : item.id.split('-')[0],
                productName: item.name,
                price: item.price,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant,
              })),
            }

            return collectSaleMutation
              .mutateAsync(payload)
              .then((data) => {
                openDrawer({
                  type: 'collect-payment',
                  props: {
                    sale: data,
                    onRecordConfirm: (recordedSale: any) => {
                      if (!recordedSale) {
                        resetSaleState()
                        closeAllDrawers()
                        return
                      }
                      openRecordedSaleDetails(recordedSale)
                    },
                  },
                })
              })
              .catch((error: any) => {
                showNotificationToast({
                  message:
                    error?.response?.data?.message ||
                    'Failed to initiate collect payment.',
                  mode: 'error',
                })
              })
          } else {
            submitConfirmedSale(
              method,
              instType,
              amountPaidVal,
              cust,
              itemsList,
              totVal,
              dueDateVal,
            )
          }
        },
      },
    })
  }

  const handleRecordTapped = () => {
    setCheckoutMode('record')
    const updatedCart = getEffectiveItems()
    const totVal = getTotal()

    setCheckoutAmountPaid(totVal)
    openPaymentMethodStep(
      checkoutPaymentMethod,
      checkoutInstallmentType,
      totVal,
      checkoutCustomer,
      updatedCart,
      totVal,
    )
  }

  const handleCollectTapped = () => {
    if (!canCollect) {
      router.push('/plans')
      return
    }

    setCheckoutMode('collect')
    const updatedCart = getEffectiveItems()
    const totalVal = getTotal()

    setCheckoutAmountPaid(totalVal)
    setCheckoutPaymentMethod('Bank Transfer')
    setCheckoutInstallmentType('full')
    setCheckoutDueDate('')

    openCheckoutSaleDrawer(
      'Bank Transfer',
      'full',
      totalVal,
      checkoutCustomer,
      updatedCart,
      totalVal,
      '',
      'collect',
      true,
    )
  }

  const formatDisplayAmount = (val: string) => {
    if (!val) return '0'
    const [int, dec] = val.split('.')
    const formattedInt = new Intl.NumberFormat('en-NG').format(Number(int))
    return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] flex flex-col items-center overflow-hidden">
      <div className="relative w-full max-w-125 bg-white h-full flex flex-col font-satoshi shadow-sm">
        {/* Top Header */}
        <div className="flex justify-between items-center px-4 py-2">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors text-black shrink-0"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
          </button>

          {/* Tab switch replacing 'Enter amount' title */}
          <TabSwitch
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { label: 'AMOUNT', value: 'amount' },
              { label: 'ITEMS', value: 'items' },
            ]}
          />

          <Link href="/recents" className="p-2 -mr-2 rounded-full shrink-0">
            <Image
              src="/icons/history.svg"
              alt="Recent"
              width={24}
              height={24}
            />
          </Link>
        </div>

        {/* AMOUNT TAB */}
        {activeTab === 'amount' && (
          <AmountTab
            amount={amount}
            description={description}
            setDescription={setDescription}
            formatDisplayAmount={formatDisplayAmount}
            addCustomAmountToCart={addCustomAmountToCart}
            handleKeyPress={handleKeyPress}
            showAddButton={!amountMirrorsCartTotal}
          />
        )}

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <ItemsTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            products={products}
            getProductCartQuantity={getProductCartQuantity}
            handleProductAddTapped={handleProductAddTapped}
            getGroupedProducts={getGroupedProducts}
            openDrawer={openDrawer}
          />
        )}

        {/* BOTTOM ACTIVE BAR */}
        {true && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#F4F6F8] px-4 py-3 shadow-[0px_-2px_10px_rgba(0,0,0,0.03)] z-20 flex justify-between items-center h-20">
            {/* Left Column: Selection text */}
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-black">
                {getEffectiveItems().length === 1
                  ? '1 item selected'
                  : `${getEffectiveItems().length} items selected`}
              </span>
              <button
                onClick={() => {
                  const items = getEffectiveItems()
                  const total = getTotal()
                  openCheckoutSaleDrawer(
                    checkoutPaymentMethod,
                    checkoutInstallmentType,
                    checkoutInstallmentType === 'full'
                      ? total
                      : checkoutAmountPaid,
                    checkoutCustomer,
                    items,
                    total,
                    checkoutDueDate,
                    'preview',
                    hasSetInstallment,
                  )
                }}
                className="text-[13px] font-medium flex items-center gap-0.5"
              >
                <span className="text-[#9CA3AF] leading-none">
                  View selection
                </span>
                <ChevronRight className="text-black mt-[2.5%]" size={12} />
              </button>
            </div>

            {/* Right Column: Buttons */}
            <div className="flex gap-2">
              {/* Record Button */}
              <button
                disabled={
                  !(
                    (activeTab === 'amount' &&
                      amount &&
                      amount !== '0' &&
                      amount !== '.' &&
                      amount !== '0.') ||
                    getEffectiveItems().length > 0
                  )
                }
                onClick={handleRecordTapped}
                className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 ${
                  (activeTab === 'amount' &&
                    amount &&
                    amount !== '0' &&
                    amount !== '.' &&
                    amount !== '0.') ||
                  getEffectiveItems().length > 0
                    ? 'bg-[#F4F6F8] text-black border border-[#E9EBED] hover:bg-gray-100 active:bg-gray-250'
                    : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
                }`}
              >
                Record
              </button>

              {/* Collect Button — hidden when confirming an existing payment */}
              {!isConfirmMode && (
                <button
                  disabled={
                    !(
                      (activeTab === 'amount' &&
                        amount &&
                        amount !== '0' &&
                        amount !== '.' &&
                        amount !== '0.') ||
                      getEffectiveItems().length > 0
                    )
                  }
                  onClick={handleCollectTapped}
                  className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 ${
                    (activeTab === 'amount' &&
                      amount &&
                      amount !== '0' &&
                      amount !== '.' &&
                      amount !== '0.') ||
                    getEffectiveItems().length > 0
                      ? 'bg-black text-white hover:bg-black/90 active:bg-black/85'
                      : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
                  }`}
                >
                  Collect
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
