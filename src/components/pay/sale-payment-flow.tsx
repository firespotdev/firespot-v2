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
  if (sale.receiptUrl || sale.isCopied) return 'waiting'
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

  const handleCancelled = () => {
    showNotificationToast({
      message: 'This payment request was cancelled by the vendor',
      duration: 3000,
    })
    router.replace(`/pay/${serialNumber}`)
  }

  // Realtime confirmation; polling via usePublicSale covers socket failures
  useSaleSocket(sale.id, {
    onConfirmed: () => {
      invalidateSale()
      setStep('success')
    },
    onCancelled: handleCancelled,
    onReceiptUploaded: invalidateSale,
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
    router.replace(`/pay/${serialNumber}`)
  }

  // After a completed payment, send the payer to the home scan page.
  // Authenticated users get routed onward by the scanner page's own guard.
  const handleFinish = () => {
    router.replace('/')
  }

  const handleCopy = () => {
    if (!account) return
    navigator.clipboard.writeText(account.accountNumber)
    showNotificationToast({
      message: 'Account number copied to clipboard',
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
        onOpenBankApp={handleOpenBankApp}
        onChangeMethod={handleChangeAccount}
        onClose={handleClose}
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
