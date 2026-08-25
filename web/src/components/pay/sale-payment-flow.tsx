'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { useQueryClient } from '@tanstack/react-query'
import { showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useSaleSocket } from '@/hooks/useSaleSocket'
import { sortBankAccounts } from '@/lib/utils/bank-registry'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { SaleRequestScreen } from './sale-request-screen'
import { SaleWaitingScreen } from './sale-waiting-screen'
import { SaleSuccessScreen } from './sale-success-screen'
import { useCancelSaleAsCustomer } from '@/services/sales/hooks'
import {
  useInitializeExistingPaystackSale,
  useReconcilePaystackSale,
} from '@/services/sales/hooks'
import { useAuthStore } from '@/services/auth'
import { LoadingPage } from '@/components/layout/LoadingPage'
import type { PaymentRail } from '@/components/custom-drawer/rail-picker-drawer'
import { DEFAULT_PAYSTACK_CHANNEL } from '@/components/custom-drawer/channel-picker-drawer'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'
import { PaystackWaitingScreen } from './paystack-waiting-screen'
import { PaystackRedirectingScreen } from './paystack-redirecting-screen'
import { usePaystackRedirectState } from '@/hooks/usePaystackRedirectState'
import { useFeedbackEligibility } from '@/services/feedback'

type BankAccount = MerchantProfile['bankAccounts'][0]
type SaleStep = 'request' | 'waiting' | 'paystack' | 'success'

interface SalePaymentFlowProps {
  sale: PublicSale
  merchant: MerchantProfile
  serialNumber: string
  onTrackCopy: (
    accountNumber: string,
    bankName: string,
    sourceBankName?: string,
  ) => Promise<void>
}

function deriveStep(sale: PublicSale): SaleStep {
  if (sale.status === 'CONFIRMED') return 'success'
  if (
    sale.paymentRail === 'paystack' &&
    ['initializing', 'pending'].includes(sale.paystackAttemptStatus || '')
  ) {
    return 'paystack'
  }
  if (sale.receiptUrl || sale.customerMarkedPaidAt || sale.isCopied) {
    return 'waiting'
  }
  return 'request'
}

/**
 * Customer-side stepped experience for paying a dynamic QR sale
 * (/pay/[serial]?saleId=...): request -> waiting/checking -> success.
 * Confirmation arrives via the public sale socket, with usePublicSale's
 * 5s polling as fallback.
 */
export function SalePaymentFlow({
  sale,
  merchant,
  serialNumber,
  onTrackCopy,
}: SalePaymentFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const cancelSale = useCancelSaleAsCustomer()
  const initializePaystack = useInitializeExistingPaystackSale()
  const reconcilePaystack = useReconcilePaystackSale()
  const {
    isRedirectingToPaystack,
    startPaystackRedirect,
    cancelPaystackRedirect,
  } = usePaystackRedirectState()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const customerExitPath = isAuthenticated ? '/home' : '/'

  // sortBankAccounts widens the type; the data is the merchant's own accounts
  const sortedBankAccounts = sortBankAccounts(
    merchant.bankAccounts || [],
  ) as BankAccount[]
  const initialAccountIndex = Math.max(
    0,
    sortedBankAccounts.findIndex(
      (bankAccount) =>
        bankAccount.accountNumber === sale.targetAccountNumber ||
        (!sale.targetAccountNumber &&
          bankAccount.bankName === sale.targetBankName),
    ),
  )

  const [hasCopiedAccount, setHasCopiedAccount] = useState(false)
  const [selectedRail, setSelectedRail] = useState<PaymentRail>(() =>
    merchant.hasPaystackCollection && sale.paymentRail !== 'manual_transfer'
      ? 'multiple'
      : 'transfer',
  )
  const [selectedChannel, setSelectedChannel] = useState(
    merchant.paystackCollectionChannels?.[0] || DEFAULT_PAYSTACK_CHANNEL,
  )
  const [isFinishing, setIsFinishing] = useState(false)
  const [selectedAccountIndex, setSelectedAccountIndex] =
    useState(initialAccountIndex)
  const [fromBankName, setFromBankName] = useState<string | null>(
    sale.sourceBankName || null,
  )
  const hasReconciledReturn = useRef(false)
  const saleStep = deriveStep(sale)
  const step =
    saleStep === 'request' && hasCopiedAccount ? 'waiting' : saleStep
  const shouldLoadFeedbackEligibility =
    step === 'success' && sale.status === 'CONFIRMED'
  const feedbackEligibility = useFeedbackEligibility(
    shouldLoadFeedbackEligibility ? sale.id : undefined,
    shouldLoadFeedbackEligibility ? sale.serialNumber : undefined,
  )

  const account: BankAccount | undefined =
    sortedBankAccounts[selectedAccountIndex] || sortedBankAccounts[0]
  const paystackChannels = merchant.paystackCollectionChannels || []
  const effectiveSelectedChannel = paystackChannels.includes(selectedChannel)
    ? selectedChannel
    : paystackChannels[0] || selectedChannel

  const invalidateSale = () => {
    queryClient.invalidateQueries({ queryKey: ['public-sale', sale.id] })
  }

  const clearActiveTransaction = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`firespot-active-sale:${serialNumber}`)
    }
  }

  const handleCancelled = (cancelledSale?: unknown) => {
    clearActiveTransaction()
    const cancelledBy = (cancelledSale as { cancelledBy?: string } | undefined)
      ?.cancelledBy
    showNotificationToast({
      message:
        cancelledBy === 'customer'
          ? 'Transaction cancelled'
          : 'This payment request was cancelled by the vendor',
      duration: 3000,
    })
    router.replace(customerExitPath)
  }

  // Realtime confirmation; polling via usePublicSale covers socket failures
  useSaleSocket(sale.id, {
    onConfirmed: () => {
      invalidateSale()
    },
    onCancelled: handleCancelled,
    onReceiptUploaded: invalidateSale,
    onReceiptDeleted: invalidateSale,
    onPaymentDeclared: invalidateSale,
  })

  // Polling fallback: react to cancellation on the fetched sale. Other sale
  // state changes are derived directly during render.
  useEffect(() => {
    if (sale.status === 'CANCELLED') {
      handleCancelled()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.status])

  useEffect(() => {
    if (
      searchParams.get('payment') !== 'paystack-return' ||
      sale.status !== 'PENDING' ||
      sale.paymentRail !== 'paystack' ||
      hasReconciledReturn.current
    ) {
      return
    }

    hasReconciledReturn.current = true
    reconcilePaystack.mutate(
      { saleId: sale.id, serialNumber },
      {
        onError: (error: unknown) => {
          showNotificationToast({
            message:
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ||
              'We could not confirm this payment yet. We will keep checking.',
            mode: 'error',
          })
        },
      },
    )
  }, [
    reconcilePaystack,
    sale.id,
    sale.paymentRail,
    sale.status,
    searchParams,
    serialNumber,
  ])

  const handleClose = () => {
    if (cancelSale.isPending) return
    cancelSale.mutate(
      { saleId: sale.id, serialNumber },
      {
        onSuccess: () => {
          clearActiveTransaction()
          router.replace(customerExitPath)
        },
        onError: (error: unknown) => {
          showNotificationToast({
            message:
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ||
              'Could not end this transaction. Please try again.',
          })
        },
      },
    )
  }

  const handleMinimize = () => {
    router.replace(customerExitPath)
  }

  // Anonymous payers return to the public scanner; signed-in payers return to
  // their personal home.
  const handleFinish = () => {
    if (isFinishing) return
    setIsFinishing(true)
    clearActiveTransaction()
    const destination = useAuthStore.getState().isAuthenticated ? '/home' : '/'
    router.replace(destination)

    window.setTimeout(() => {
      if (window.location.pathname.startsWith('/pay/')) {
        window.location.replace(destination)
      }
    }, 1200)
  }

  const handleCopy = () => {
    if (!account) return
    navigator.clipboard.writeText(account.accountNumber)
    showNotificationToast({
      message: 'Account number copied',
      mode: 'success',
      duration: 2000,
    })
    void onTrackCopy(account.accountNumber, account.bankName)
    setHasCopiedAccount(true)
  }

  const startPaystackPayment = (channel: string) => {
    if (initializePaystack.isPending || isRedirectingToPaystack) return
    startPaystackRedirect()
    initializePaystack.mutate(
      {
        saleId: sale.id,
        serialNumber,
        channel,
        customerFingerprint: getCustomerFingerprint(),
      },
      {
        onSuccess: (result) => {
          if (result.authorizationUrl) {
            window.location.href = result.authorizationUrl
            return
          }
          cancelPaystackRedirect()
          showNotificationToast({
            message: 'Failed to start Paystack payment. Please try again.',
            mode: 'error',
          })
        },
        onError: (error: unknown) => {
          cancelPaystackRedirect()
          showNotificationToast({
            message:
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ||
              'Failed to start Paystack payment. Please try again.',
            mode: 'error',
          })
        },
      },
    )
  }

  const handlePayInstantly = () => {
    if (initializePaystack.isPending || isRedirectingToPaystack) return
    if (paystackChannels.length === 0) {
      showNotificationToast({
        message: 'No instant payment method is currently available.',
        mode: 'error',
      })
      return
    }

    openDrawer({
      type: 'channel-picker',
      direction: 'bottom',
      props: {
        selectedChannel: effectiveSelectedChannel,
        availableChannels: paystackChannels,
        onSelectChannel: (channelId: string) => {
          setSelectedChannel(channelId)
          startPaystackPayment(channelId)
        },
      },
    })
  }

  const handleChangePaymentMethod = () => {
    openDrawer({
      type: 'rail-picker',
      direction: 'bottom',
      props: {
        hasSavedCards: false,
        selectedRail,
        paystackChannels,
        onSelectRail: (rail: PaymentRail) => {
          setSelectedRail(rail)
          if (
            rail === 'multiple' &&
            !paystackChannels.includes(selectedChannel) &&
            paystackChannels[0]
          ) {
            setSelectedChannel(paystackChannels[0])
          }
        },
      },
    })
  }

  const handleChangeAccount = () => {
    if (sortedBankAccounts.length === 0) return
    openDrawer({
      type: 'select-bank',
      direction: 'bottom',
      props: {
        bankAccounts: sortedBankAccounts,
        onSelectBank: (bank: BankAccount) => {
          const index = sortedBankAccounts.findIndex(
            (acc) => acc.accountNumber === bank.accountNumber,
          )
          if (index !== -1) {
            setSelectedAccountIndex(index)
            navigator.clipboard.writeText(bank.accountNumber)
            showNotificationToast({
              message: 'Account number copied',
              mode: 'success',
              duration: 1500,
            })
            void onTrackCopy(
              bank.accountNumber,
              bank.bankName,
              fromBankName || undefined,
            )
          }
        },
      },
    })
  }

  const handleOpenBankApp = () => {
    openDrawer({
      type: 'bank-transfer',
      props: {
        onBankSelect: async (bankName: string) => {
          setFromBankName(bankName)
          if (account) {
            await onTrackCopy(account.accountNumber, account.bankName, bankName)
          }
        },
      },
    })
  }

  const handleShare = () => {
    openDrawer({
      type: 'share-transfer',
      props: {
        businessName: merchant.businessName,
        serialNumber,
        profilePhotoUrl: merchant.profilePhotoUrl,
      },
    })
  }

  if (isFinishing) {
    return <LoadingPage innerBg="#F4F6F8" />
  }

  if (isRedirectingToPaystack) {
    return <PaystackRedirectingScreen />
  }

  if (step === 'success') {
    if (
      sale.status !== 'CONFIRMED' ||
      (shouldLoadFeedbackEligibility && !feedbackEligibility.isFetched)
    ) {
      return <LoadingPage innerBg="#F4F6F8" />
    }

    return (
      <SaleSuccessScreen
        sale={sale}
        merchant={merchant}
        feedbackEligibility={feedbackEligibility.data}
        onClose={handleFinish}
      />
    )
  }

  if (step === 'paystack') {
    return (
      <PaystackWaitingScreen
        onMinimize={handleMinimize}
      />
    )
  }

  if (step === 'waiting') {
    return (
      <SaleWaitingScreen
        sale={sale}
        account={account}
        fromBankName={fromBankName}
        serialNumber={serialNumber}
        onOpenBankApp={handleOpenBankApp}
        onChangeMethod={handleChangeAccount}
        onClose={handleClose}
        onMinimize={handleMinimize}
        isClosing={cancelSale.isPending}
      />
    )
  }

  return (
    <SaleRequestScreen
      sale={sale}
      merchant={merchant}
      account={account}
      onChangeAccount={handleChangeAccount}
      onChangePaymentMethod={handleChangePaymentMethod}
      selectedRail={selectedRail}
      onCopy={handleCopy}
      onPayInstantly={handlePayInstantly}
      onShare={handleShare}
      onClose={handleClose}
      hasPaystackCollection={merchant.hasPaystackCollection}
      isSubmitting={initializePaystack.isPending}
    />
  )
}
