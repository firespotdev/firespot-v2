'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react'
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
    isEditMode ? editId || undefined : isConfirmMode ? confirmId || undefined : undefined,
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
  const collectBlockedReason = planCatalog?.current?.collectBlockedReason

  // Keypad & sale state
  const [activeTab, setActiveTab] = useState<'amount' | 'items'>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [hasPrefilled, setHasPrefilled] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Final confirmation states
  const [step, setStep] = useState<'input' | 'saving' | 'success' | 'error'>(
    'input',
  )

  // Checkout summary states
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] =
    useState<string>('Bank Transfer')
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

  useEffect(() => {
    if (checkoutInstallmentType === 'full') {
      setCheckoutAmountPaid(getTotal())
    }
  }, [cartItems, amount, checkoutInstallmentType, activeTab])

  // Reset prefill flag when the target sale id changes
  useEffect(() => {
    setHasPrefilled(false)
  }, [editId, confirmId])

  // Prefill in edit or confirm mode
  useEffect(() => {
    if ((isEditMode || isConfirmMode) && editSaleData && !hasPrefilled) {
      setAmount(editSaleData.amount?.toString() || '')
      setDescription(editSaleData.description || '')
      setHasPrefilled(true)
    }
  }, [editSaleData, isEditMode, isConfirmMode, hasPrefilled])

  // Keypad keys handler
  const handleKeyPress = (key: string) => {
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
  const getSubtotal = () => {
    return cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
  }

  const getVAT = () => {
    return Math.round(getSubtotal() * 0.075)
  }

  const getTotal = () => {
    if (activeTab === 'amount') {
      return Number(amount) || 0
    }
    return getSubtotal() + getVAT()
  }

  const calculateTotal = (items: CartItem[]) => {
    const subtotal = items.reduce(
      (acc, curr) => acc + curr.price * curr.quantity,
      0,
    )
    const vat = Math.round(subtotal * 0.075)
    return subtotal + vat
  }

  const updateCartQtyAndSyncDrawer = (id: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0)

      const newTotal = calculateTotal(updated)
      const nextAmountPaid =
        checkoutInstallmentType === 'full'
          ? newTotal
          : Math.min(checkoutAmountPaid, newTotal)
      setCheckoutAmountPaid(nextAmountPaid)

      openCheckoutSaleDrawer(
        checkoutPaymentMethod,
        checkoutInstallmentType,
        nextAmountPaid,
        checkoutCustomer,
        updated,
        newTotal,
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

    const newItem: CartItem = {
      id: `custom-${Date.now()}`,
      name: description || 'Custom amount',
      price: val,
      quantity: 1,
    }
    setCartItems((prev) => [...prev, newItem])
    setAmount('')
    setDescription('')
  }

  const addProductToCart = (
    prod: any,
    size?: string,
    color?: string,
    qty: number = 1,
  ) => {
    const id = `${prod._id}-${size || ''}-${color || ''}`
    const existingIndex = cartItems.findIndex((item) => item.id === id)

    if (existingIndex > -1) {
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + qty }
            : item,
        ),
      )
    } else {
      const newItem: CartItem = {
        id,
        name: prod.name,
        price: prod.price,
        quantity: qty,
        selectedVariant: size || color ? { size, color } : undefined,
      }
      setCartItems((prev) => [...prev, newItem])
    }
  }

  const resetSaleState = () => {
    setCartItems([])
    setActiveTab('amount')
    setAmount('')
    setDescription('')
    setCheckoutCustomer(null)
    setCheckoutPaymentMethod('Bank Transfer')
    setCheckoutInstallmentType('full')
    setCheckoutAmountPaid(0)
    setHasSetInstallment(false)
    setCheckoutDueDate('')
    setStep('input')
  }

  const clearCart = () => {
    resetSaleState()
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

  const autoConvertKeypadToCartItem = () => {
    const val = Number(amount)
    if (activeTab === 'amount' && val > 0) {
      const newItem: CartItem = {
        id: `custom-auto-${Date.now()}`,
        name: description || 'Item 1',
        price: val,
        quantity: 1,
      }
      const updatedCart = [...cartItems, newItem]
      setCartItems(updatedCart)
      setAmount('')
      setDescription('')
      return updatedCart
    }
    return null
  }

  const submitConfirmedSale = (
    paymentMethod: string,
    installmentType: 'full' | 'part',
    paidVal: number,
    customer: any,
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

    const totalVal = getTotal()
    const payload = {
      amount: totalVal,
      description:
        activeTab === 'amount'
          ? description || 'Manual sale'
          : cartItems
              .map((i) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name))
              .join(', '),
      paymentMethod,
      isPaidInFull: installmentType === 'full',
      amountPaid: paidVal,
      totalDue: totalVal,
      balanceOwed: totalVal - paidVal,
      customerId: customer?._id,
      dueDate: dueDateVal || undefined,
      items:
        activeTab === 'amount'
          ? [
              {
                productName: description || 'Manual sale',
                price: totalVal,
                quantity: 1,
              },
            ]
          : cartItems.map((item) => ({
              productId: item.id.startsWith('custom')
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
            resetSaleState()
            router.replace('/record-sale')
            closeAllDrawers()
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: data,
                status: 'success',
                setStep,
                setAmount,
                setDescription,
                onRecordAnother: resetSaleState,
              },
            })
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
            resetSaleState()
            router.replace('/record-sale')
            closeAllDrawers()
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: data,
                status: 'success',
                setStep,
                setAmount,
                setDescription,
                onRecordAnother: resetSaleState,
              },
            })
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
          resetSaleState()
          closeAllDrawers()
          openDrawer({
            type: 'record-success',
            props: {
              successDetails: data,
              status: 'success',
              setStep,
              setAmount,
              setDescription,
              onRecordAnother: resetSaleState,
            },
          })
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
    mode = checkoutMode,
  ) => {
    openDrawer({
      type: 'checkout-sale',
      props: {
        cartItems: itemsList,
        onClear: () => {
          clearCart()
          closeDrawer()
        },
        onUpdateQty: updateCartQtyAndSyncDrawer,
        paymentMethod: method,
        installmentType: instType,
        amountPaid: amountPaidVal,
        hasSetInstallment,
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
                )
              },
            },
          })
        },
        onConfirmRecord: () => {
          if (mode === 'collect') {
            const payload = {
              merchantId: profile?.id || '',
              amount: totVal,
              description: itemsList
                .map((i) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name))
                .join(', '),
              isPaidInFull: true,
              amountPaid: 0,
              totalDue: totVal,
              balanceOwed: totVal,
              items: itemsList.map((item) => ({
                productId: item.id.startsWith('custom')
                  ? undefined
                  : item.id.split('-')[0],
                productName: item.name,
                price: item.price,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant,
              })),
            }

            collectSaleMutation.mutate(payload, {
              onSuccess: (data) => {
                openDrawer({
                  type: 'collect-payment',
                  props: {
                    sale: data,
                    onRecordConfirm: (recordedSale: any) => {
                      resetSaleState()
                      closeAllDrawers()
                      openDrawer({
                        type: 'record-success',
                        props: {
                          successDetails: recordedSale,
                          status: 'success',
                          setStep,
                          setAmount,
                          setDescription,
                          onRecordAnother: resetSaleState,
                        },
                      })
                    },
                  },
                })
              },
              onError: (error: any) => {
                showNotificationToast({
                  message:
                    error?.response?.data?.message ||
                    'Failed to initiate collect payment.',
                })
              },
            })
          } else {
            submitConfirmedSale(
              method,
              instType,
              amountPaidVal,
              cust,
              dueDateVal,
            )
          }
        },
      },
    })
  }

  const handleRecordTapped = () => {
    setCheckoutMode('record')
    const updatedCart = autoConvertKeypadToCartItem() || cartItems
    const subtotal = updatedCart.reduce(
      (acc, curr) => acc + curr.price * curr.quantity,
      0,
    )
    const vat = Math.round(subtotal * 0.075)
    const totVal = subtotal + vat

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
    // Collecting needs a verified plan. Recording — including a customer
    // scanning this merchant's QR — is never gated, so we explain and point
    // at the fix rather than silently disabling.
    if (!canCollect) {
      if (collectBlockedReason === 'kyc_incomplete') {
        showNotificationToast({
          message: 'Finish verifying your identity to collect payments.',
        })
        openDrawer({ type: 'verify-identity' })
      } else {
        showNotificationToast({
          message:
            'Upgrade to a Firespot Business plan to collect. You can still record sales.',
        })
        router.push('/plans')
      }
      return
    }

    setCheckoutMode('collect')
    const updatedCart = autoConvertKeypadToCartItem() || cartItems
    const subtotal = updatedCart.reduce(
      (acc, curr) => acc + curr.price * curr.quantity,
      0,
    )
    const vat = Math.round(subtotal * 0.075)
    const totalVal = subtotal + vat

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
                {cartItems.length === 1
                  ? '1 item selected'
                  : `${cartItems.length} items selected`}
              </span>
              <button
                onClick={() => openCheckoutSaleDrawer()}
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
                    cartItems.length > 0
                  )
                }
                onClick={handleRecordTapped}
                className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 ${
                  (activeTab === 'amount' &&
                    amount &&
                    amount !== '0' &&
                    amount !== '.' &&
                    amount !== '0.') ||
                  cartItems.length > 0
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
                      cartItems.length > 0
                    )
                  }
                  onClick={handleCollectTapped}
                  className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 ${
                    (activeTab === 'amount' &&
                      amount &&
                      amount !== '0' &&
                      amount !== '.' &&
                      amount !== '0.') ||
                    cartItems.length > 0
                      ? canCollect
                        ? 'bg-black text-white hover:bg-black/90 active:bg-black/85'
                        : // Locked, but still tappable so we can explain why.
                          'bg-[#F4F6F8] text-[#8E8E93]'
                      : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
                  }`}
                >
                  {!canCollect && <Lock className="w-3.5 h-3.5" />}
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
