'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TabSwitch } from '@/components/ui'
import Image from 'next/image'
import {
  useCreateManualSale,
  useSale,
  useEditSale,
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

  const { data: editSaleData } = useSale(
    isEditMode ? editId || undefined : undefined,
  )

  const { data: profile } = useUserProfile()

  // API mutations & queries
  const createManualSaleMutation = useCreateManualSale()
  const editSaleMutation = useEditSale()
  const collectSaleMutation = useCreatePendingCollectSale()

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: products = [] } = useProducts({
    search: searchQuery,
    category: activeCategory,
  })

  const { openDrawer, closeDrawer } = useDrawerStore()

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
  const [checkoutCustomer, setCheckoutCustomer] = useState<any>(null)
  const [checkoutDueDate, setCheckoutDueDate] = useState<string>('')

  useEffect(() => {
    if (checkoutInstallmentType === 'full') {
      setCheckoutAmountPaid(getTotal())
    }
  }, [cartItems, amount, checkoutInstallmentType, activeTab])

  // Reset prefill flag when changing sale ID to edit
  useEffect(() => {
    setHasPrefilled(false)
  }, [editId])

  // Prefill in edit mode
  useEffect(() => {
    if (isEditMode && editSaleData && !hasPrefilled) {
      setAmount(editSaleData.amount?.toString() || '')
      setDescription(editSaleData.description || '')
      setHasPrefilled(true)
    }
  }, [editSaleData, isEditMode, hasPrefilled])

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

  const clearCart = () => {
    setCartItems([])
    setActiveTab('amount')
    setCheckoutDueDate('')
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
    openDrawer({
      type: 'record-success',
      props: {
        successDetails: null,
        status: 'saving',
        errorMessage: '',
        setStep,
        setAmount,
        setDescription,
      },
    })

    const totalVal = getTotal()
    const payload = {
      amount: totalVal,
      description:
        activeTab === 'amount'
          ? description || 'Manual sale'
          : cartItems.map((i) => `${i.name} x${i.quantity}`).join(', '),
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

    if (isEditMode && editId) {
      editSaleMutation.mutate(
        { saleId: editId, payload },
        {
          onSuccess: (data) => {
            router.replace('/record-sale')
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: data,
                status: 'success',
                setStep,
                setAmount,
                setDescription,
              },
            })
            clearCart()
          },
          onError: (error: any) => {
            const msg =
              error?.response?.data?.message || 'Failed to update transaction.'
            openDrawer({
              type: 'record-success',
              props: {
                successDetails: null,
                status: 'error',
                errorMessage: msg,
                setStep,
                setAmount,
                setDescription,
              },
            })
          },
        },
      )
    } else {
      createManualSaleMutation.mutate(payload, {
        onSuccess: (data) => {
          openDrawer({
            type: 'record-success',
            props: {
              successDetails: data,
              status: 'success',
              setStep,
              setAmount,
              setDescription,
            },
          })
          clearCart()
        },
        onError: (error: any) => {
          const msg =
            error?.response?.data?.message || 'Failed to record transaction.'
          openDrawer({
            type: 'record-success',
            props: {
              successDetails: null,
              status: 'error',
              errorMessage: msg,
              setStep,
              setAmount,
              setDescription,
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
        onBack: () =>
          openPaymentMethodStep(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
          ),
        onContinue: (newInstType: 'full' | 'part', newAmountPaid: number) => {
          setCheckoutInstallmentType(newInstType)
          setCheckoutAmountPaid(newAmountPaid)
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
        onBack: () =>
          openSplitPaymentStep(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
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
        customer: cust,
        totalAmount: totVal,
        dueDate: dueDateVal,
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
                ),
              onContinue: (
                newInstType: 'full' | 'part',
                newAmountPaid: number,
              ) => {
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
                )
              },
            },
          })
        },
        onEditCustomer: () => {
          openDrawer({
            type: 'customer-select',
            props: {
              onBack: () =>
                openCheckoutSaleDrawer(
                  method,
                  instType,
                  amountPaidVal,
                  cust,
                  itemsList,
                  totVal,
                  dueDateVal,
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
                )
              },
            },
          })
        },
        onConfirmRecord: () => {
          submitConfirmedSale(method, instType, amountPaidVal, cust, dueDateVal)
        },
      },
    })
  }

  const handleRecordTapped = () => {
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
    const updatedCart = autoConvertKeypadToCartItem() || cartItems
    const subtotal = updatedCart.reduce(
      (acc, curr) => acc + curr.price * curr.quantity,
      0,
    )
    const vat = Math.round(subtotal * 0.075)
    const totalVal = subtotal + vat

    const payload = {
      merchantId: profile?.id || '',
      amount: totalVal,
      description: updatedCart
        .map((i) => `${i.name} x${i.quantity}`)
        .join(', '),
      isPaidInFull: true,
      amountPaid: 0,
      totalDue: totalVal,
      balanceOwed: totalVal,
      items: updatedCart.map((item) => ({
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
              openDrawer({
                type: 'record-success',
                props: {
                  successDetails: recordedSale,
                  status: 'success',
                  setStep,
                  setAmount,
                  setDescription,
                },
              })
              clearCart()
            },
          },
        })
      },
      onError: (error: any) => {
        alert(
          error?.response?.data?.message ||
            'Failed to initiate collect payment.',
        )
      },
    })
  }

  const formatDisplayAmount = (val: string) => {
    if (!val) return '0'
    const [int, dec] = val.split('.')
    const formattedInt = new Intl.NumberFormat('en-NG').format(Number(int))
    return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
  }

  const showNotificationToast = ({ message }: { message: string }) => {
    alert(message)
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

              {/* Collect Button */}
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
                className={`h-11 px-5 rounded-full font-bold text-sm transition-all duration-200 ${
                  (activeTab === 'amount' &&
                    amount &&
                    amount !== '0' &&
                    amount !== '.' &&
                    amount !== '0.') ||
                  cartItems.length > 0
                    ? 'bg-black text-white hover:bg-black/90 active:bg-black/85'
                    : 'bg-[#F4F6F8] text-[#8E8E93] cursor-not-allowed'
                }`}
              >
                Collect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
