'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useAuthStore } from '@/services/auth'

type BankAccount = MerchantProfile['bankAccounts'][0]
type SaleStep = 'request' | 'waiting' | 'success'

interface SalePaymentFlowProps {
  sale: PublicSale
  merchant: MerchantProfile
  serialNumber: string
  onTrackCopy: (accountNumber: string, bankName: string) => void
}

function deriveStep(sale: PublicSale): SaleStep {
  if (sale.status === 'CONFIRMED') return 'success'
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
  const queryClient = useQueryClient()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const cancelSale = useCancelSaleAsCustomer()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const customerExitPath = isAuthenticated ? '/home' : '/'

  const [step, setStep] = useState<SaleStep>(() => deriveStep(sale))
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0)
  const [fromBankName, setFromBankName] = useState<string | null>(null)

  // sortBankAccounts widens the type; the data is the merchant's own accounts
  const sortedBankAccounts = sortBankAccounts(
    merchant.bankAccounts || [],
  ) as BankAccount[]
  const account: BankAccount | undefined =
    sortedBankAccounts[selectedAccountIndex] || sortedBankAccounts[0]

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
      setStep('success')
    },
    onCancelled: handleCancelled,
    onReceiptUploaded: invalidateSale,
    onPaymentDeclared: invalidateSale,
  })

  // Polling fallback: react to status changes on the fetched sale
  useEffect(() => {
    if (sale.status === 'CONFIRMED') {
      setStep('success')
    } else if (sale.status === 'CANCELLED') {
      handleCancelled()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.status])

  const handleClose = () => {
    if (cancelSale.isPending) return
    cancelSale.mutate(
      { saleId: sale.id, serialNumber },
      {
        onSuccess: () => {
          clearActiveTransaction()
          router.replace(customerExitPath)
        },
        onError: (error: any) => {
          showNotificationToast({
            message:
              error?.response?.data?.message ||
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
    clearActiveTransaction()
    router.replace(customerExitPath)
  }

  const handleCopy = () => {
    if (!account) return
    navigator.clipboard.writeText(account.accountNumber)
    showNotificationToast({
      message: 'Account number copied',
      mode: 'success',
      duration: 2000,
    })
    onTrackCopy(account.accountNumber, account.bankName)
    setStep('waiting')
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
          }
        },
      },
    })
  }

  const handleOpenBankApp = () => {
    openDrawer({
      type: 'bank-transfer',
      props: {
        onBankSelect: (bankName: string) => setFromBankName(bankName),
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

  if (step === 'success') {
    return (
      <SaleSuccessScreen
        sale={sale}
        merchant={merchant}
        onClose={handleFinish}
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
      onCopy={handleCopy}
      onShare={handleShare}
      onClose={handleClose}
    />
  )
}
