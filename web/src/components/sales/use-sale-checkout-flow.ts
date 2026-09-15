'use client'

import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  useCreateManualSale,
  useCreatePendingCollectSale,
  useEditSale,
  useRecordSale,
} from '@/services/sales/hooks'
import { useUserProfile } from '@/services/users'
import type { Sale } from '@/services/sales/interface'
import {
  DRAFT_ITEM_ID,
  type CartItem,
  type CheckoutMode,
  type SaleMode,
} from './types'
import type { SaleCart } from './use-sale-cart'

interface Options {
  cart: SaleCart
  saleMode: SaleMode
  /** The sale being edited or confirmed; seeds the checkout fields. */
  prefillSale?: Sale
  /** Called after a confirm/edit succeeds so the next sale is a fresh create. */
  onSaleModeSettled: () => void
  canCollect: boolean
  onCollectUnavailable: () => void
}

/**
 * Owns the checkout drawer chain launched from the record-sale sheet:
 * payment-method -> split-payment -> customer-select -> checkout-sale ->
 * record-success / collect-payment / transaction-details.
 *
 * Every step threads its state forward as explicit arguments rather than
 * reading React state, because the drawers are opened from callbacks that
 * would otherwise close over stale values.
 */
export function useSaleCheckoutFlow({
  cart,
  saleMode,
  prefillSale,
  onSaleModeSettled,
  canCollect,
  onCollectUnavailable,
}: Options) {
  const { openDrawer, closeDrawer, closeDrawersAbove } = useDrawerStore()
  const { data: profile } = useUserProfile()

  const createManualSaleMutation = useCreateManualSale()
  const editSaleMutation = useEditSale()
  const recordSaleMutation = useRecordSale()
  const collectSaleMutation = useCreatePendingCollectSale()

  const [step, setStep] = useState<'input' | 'saving' | 'success' | 'error'>(
    'input',
  )
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string>('')
  const [checkoutInstallmentType, setCheckoutInstallmentType] = useState<
    'full' | 'part'
  >('full')
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<number>(0)
  const [hasSetInstallment, setHasSetInstallment] = useState<boolean>(false)
  const [checkoutCustomer, setCheckoutCustomer] = useState<any>(null)
  const [checkoutDueDate, setCheckoutDueDate] = useState<string>('')

  // Seed the checkout fields from the sale being edited or confirmed, once per
  // sale. useSaleCart does the same for the amount, description and items.
  const prefilledSaleIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!prefillSale || prefilledSaleIdRef.current === prefillSale._id) return
    prefilledSaleIdRef.current = prefillSale._id

    setCheckoutPaymentMethod(prefillSale.paymentMethod || '')
    setCheckoutCustomer(
      prefillSale.customerId && typeof prefillSale.customerId === 'object'
        ? prefillSale.customerId
        : null,
    )
  }, [prefillSale])

  const resetSaleState = () => {
    cart.resetCart()
    setCheckoutCustomer(null)
    setCheckoutPaymentMethod('')
    setCheckoutInstallmentType('full')
    setCheckoutAmountPaid(0)
    setHasSetInstallment(false)
    setCheckoutDueDate('')
    setStep('input')
  }

  // Collapse back to the record-sale sheet rather than closing everything —
  // the sheet stays mounted so the callbacks it handed to record-success
  // (onRecordAnother, setStep, ...) remain live.
  const collapseToSheet = () => closeDrawersAbove('record-sale')

  const openRecordedSaleDetails = (
    sale: (Sale & { isEdit?: boolean }) | null,
  ) => {
    resetSaleState()
    collapseToSheet()
    if (!sale) return
    openDrawer({
      type: 'transaction-details',
      props: { sale, justRecorded: true },
    })
  }

  const openRecordFailure = (errorMessage: string) => {
    collapseToSheet()
    openDrawer({
      type: 'record-success',
      props: {
        successDetails: null,
        status: 'error',
        errorMessage,
        setStep,
        setAmount: cart.setAmount,
        setDescription: cart.setDescription,
        onRecordAnother: resetSaleState,
      },
    })
  }

  const openPendingCollection = (sale: Sale) => {
    openDrawer({
      type: 'collect-payment',
      props: {
        sale,
        onRecordConfirm: (recordedSale: Sale | null) => {
          if (!recordedSale) {
            resetSaleState()
            collapseToSheet()
            return
          }
          openRecordedSaleDetails(recordedSale)
        },
      },
    })
  }

  const buildSalePayload = (
    paymentMethod: string,
    installmentType: 'full' | 'part',
    paidVal: number,
    customer: any,
    itemsList: CartItem[],
    totalVal: number,
    dueDateVal?: string,
  ) => {
    const normalizedDescription = itemsList
      .filter((item) => !/^Item \d+$/.test(item.name))
      .map((item) =>
        item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
      )
      .join(', ')

    return {
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
        productDescription: item.description,
        productImageUrl: item.imageUrl,
        price: item.price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
      })),
    }
  }

  const submitConfirmedSale = async (
    paymentMethod: string,
    installmentType: 'full' | 'part',
    paidVal: number,
    customer: any,
    itemsList: CartItem[],
    totalVal: number,
    dueDateVal?: string,
  ) => {
    const payload = buildSalePayload(
      paymentMethod,
      installmentType,
      paidVal,
      customer,
      itemsList,
      totalVal,
      dueDateVal,
    )

    try {
      if (saleMode.kind === 'confirm') {
        // Confirm the existing customer-initiated pending sale in place
        // (updates it to CONFIRMED) instead of creating a new record.
        const data = await recordSaleMutation.mutateAsync({
          saleId: saleMode.id,
          payload,
        })
        onSaleModeSettled()
        openRecordedSaleDetails(data)
        return
      }

      if (saleMode.kind === 'edit') {
        const data = await editSaleMutation.mutateAsync({
          saleId: saleMode.id,
          payload,
        })
        onSaleModeSettled()
        openRecordedSaleDetails({ ...data, isEdit: true })
        return
      }

      const data = await createManualSaleMutation.mutateAsync(payload)
      openRecordedSaleDetails(data)
    } catch (error: unknown) {
      const fallbackMessage =
        saleMode.kind === 'confirm'
          ? 'Failed to confirm payment.'
          : saleMode.kind === 'edit'
            ? 'Failed to update transaction.'
            : 'Failed to record transaction.'
      const apiMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined
      openRecordFailure(apiMessage || fallbackMessage)
    }
  }

  const updateCartQtyAndSyncDrawer = (
    id: string,
    delta: number,
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    dueDateVal = checkoutDueDate,
    mode: CheckoutMode = 'record',
    installmentConfigured = hasSetInstallment,
  ) => {
    const syncDrawer = (updated: CartItem[], effective: CartItem[]) => {
      const newTotal = cart.calculateTotal(effective)
      if (cart.amountMirrorsCartTotal) cart.setAmount(String(newTotal))
      const nextAmountPaid =
        instType === 'full' ? newTotal : Math.min(amountPaidVal, newTotal)
      setCheckoutAmountPaid(nextAmountPaid)
      openCheckoutSaleDrawer(
        method,
        instType,
        nextAmountPaid,
        cust,
        effective,
        newTotal,
        dueDateVal,
        mode,
        installmentConfigured,
      )
      return updated
    }

    if (id === DRAFT_ITEM_ID) {
      cart.setAmount('')
      cart.setPreservedExistingTotal(null)
      const updated = [...cart.cartItems]
      syncDrawer(updated, updated)
      return
    }

    const updated = cart.cartItems
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      )
      .filter((item) => item.quantity > 0)

    cart.setCartItems(updated)
    cart.setPreservedExistingTotal(null)
    syncDrawer(updated, cart.getEffectiveItems(updated))
  }

  const openPaymentMethodStep = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cart.cartItems,
    totVal = cart.getTotal(),
    mode: CheckoutMode = 'record',
  ) => {
    openDrawer({
      type: 'payment-method',
      props: {
        currentMethod: method,
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
            mode,
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
    itemsList = cart.cartItems,
    totVal = cart.getTotal(),
    mode: CheckoutMode = 'record',
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
            mode,
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
            mode,
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
    itemsList = cart.cartItems,
    totVal = cart.getTotal(),
    mode: CheckoutMode = 'record',
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
            mode,
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
            mode,
            true,
          )
        },
      },
    })
  }

  const submitCollectSale = (
    itemsList: CartItem[],
    totVal: number,
  ): Promise<void> => {
    const payload = {
      merchantId: profile?.id || '',
      amount: totVal,
      description:
        itemsList
          .filter((i) => !/^Item \d+$/.test(i.name))
          .map((i) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name))
          .join(', ') || undefined,
      items: itemsList.map((item) => ({
        productId:
          item.id.startsWith('custom') || item.id === DRAFT_ITEM_ID
            ? undefined
            : item.id.split('-')[0],
        productName: item.name,
        productDescription: item.description,
        productImageUrl: item.imageUrl,
        price: item.price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
      })),
    }

    return collectSaleMutation
      .mutateAsync(payload)
      .then((data) => {
        openPendingCollection(data)
      })
      .catch((error: any) => {
        showNotificationToast({
          message:
            error?.response?.data?.message ||
            'Failed to initiate collect payment.',
          mode: 'error',
        })
      })
  }

  const openCheckoutSaleDrawer = (
    method = checkoutPaymentMethod,
    instType = checkoutInstallmentType,
    amountPaidVal = checkoutAmountPaid,
    cust = checkoutCustomer,
    itemsList = cart.cartItems,
    totVal = cart.getTotal(),
    dueDateVal = checkoutDueDate,
    mode: CheckoutMode = 'record',
    installmentConfigured = hasSetInstallment,
  ) => {
    const reopenWith = (
      overrides: Partial<{
        method: string
        instType: 'full' | 'part'
        amountPaidVal: number
        cust: any
        dueDateVal: string
        installmentConfigured: boolean
      }> = {},
    ) =>
      openCheckoutSaleDrawer(
        overrides.method ?? method,
        overrides.instType ?? instType,
        overrides.amountPaidVal ?? amountPaidVal,
        overrides.cust ?? cust,
        itemsList,
        totVal,
        overrides.dueDateVal ?? dueDateVal,
        mode,
        overrides.installmentConfigured ?? installmentConfigured,
      )

    openDrawer({
      type: 'checkout-sale',
      dismissible: mode === 'preview',
      props: {
        cartItems: itemsList,
        onClear: () => {
          resetSaleState()
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
          reopenWith({ dueDateVal: newDueDate })
        },
        onEditPaymentMethod: () => {
          openDrawer({
            type: 'payment-method',
            props: {
              currentMethod: method,
              onSubmit: (newMethod: string) => {
                setCheckoutPaymentMethod(newMethod)
                reopenWith({ method: newMethod })
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
              onBack: () => reopenWith(),
              onContinue: (
                newInstType: 'full' | 'part',
                newAmountPaid: number,
              ) => {
                setHasSetInstallment(true)
                setCheckoutInstallmentType(newInstType)
                setCheckoutAmountPaid(newAmountPaid)
                if (newInstType === 'full') {
                  setCheckoutDueDate('')
                }
                reopenWith({
                  instType: newInstType,
                  amountPaidVal: newAmountPaid,
                  dueDateVal: newInstType === 'full' ? '' : dueDateVal,
                  installmentConfigured: true,
                })
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
              onBack: () => reopenWith(),
              onSelect: (newCust: any) => {
                setCheckoutCustomer(newCust)
                reopenWith({ cust: newCust })
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
              mode,
            )
            return
          }

          if (mode === 'collect') {
            return submitCollectSale(itemsList, totVal)
          }

          return submitConfirmedSale(
            method,
            instType,
            amountPaidVal,
            cust,
            itemsList,
            totVal,
            dueDateVal,
          )
        },
        onPreviewRecord:
          mode === 'preview'
            ? () => {
                closeDrawer('checkout-sale')
                handleRecordTapped()
              }
            : undefined,
        onPreviewCollect:
          mode === 'preview'
            ? () => {
                if (!canCollect) {
                  onCollectUnavailable()
                  return
                }
                return submitCollectSale(itemsList, totVal)
              }
            : undefined,
      },
    })
  }

  const handleRecordTapped = () => {
    const updatedCart = cart.getEffectiveItems()
    const totVal = cart.getTotal()

    setCheckoutAmountPaid(totVal)
    openPaymentMethodStep(
      checkoutPaymentMethod,
      checkoutInstallmentType,
      totVal,
      checkoutCustomer,
      updatedCart,
      totVal,
      'record',
    )
  }

  const handleCollectTapped = () => {
    if (!canCollect) {
      onCollectUnavailable()
      return
    }

    const updatedCart = cart.getEffectiveItems()
    const totalVal = cart.getTotal()

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

  /** Opens the checkout drawer read-only, from "View selection". */
  const openSelectionPreview = () => {
    const items = cart.getEffectiveItems()
    const total = cart.getTotal()
    openCheckoutSaleDrawer(
      checkoutPaymentMethod,
      checkoutInstallmentType,
      checkoutInstallmentType === 'full' ? total : checkoutAmountPaid,
      checkoutCustomer,
      items,
      total,
      checkoutDueDate,
      'preview',
      hasSetInstallment,
    )
  }

  return {
    resetSaleState,
    handleRecordTapped,
    handleCollectTapped,
    openSelectionPreview,
    openPendingCollection,
  }
}
