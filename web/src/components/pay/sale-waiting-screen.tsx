'use client'

import Link from 'next/link'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { ArrowUpRight, Check, ChevronRight, Copy, X } from 'lucide-react'
import {
  AppCard,
  BankLogo,
  Button,
  Spinner,
  TagFooter,
  showNotificationToast,
} from '@/components/ui'
import { CopySuccess } from 'iconsax-reactjs'
import { BankIcon } from '@phosphor-icons/react'
import { useMarkSalePaidByCustomer } from '@/services/sales/hooks'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'

type BankAccount = MerchantProfile['bankAccounts'][0]

interface SaleWaitingScreenProps {
  sale: PublicSale
  merchant: MerchantProfile
  account?: BankAccount
  copied: boolean
  fromBankName: string | null
  serialNumber: string
  onCopy: () => void
  onOpenBankApp: () => void
  onChangeMethod: () => void
  onClose: () => void
  onMinimize: () => void
  isClosing?: boolean
}

export function SaleWaitingScreen({
  sale,
  merchant,
  account,
  copied,
  fromBankName,
  serialNumber,
  onCopy,
  onOpenBankApp,
  onChangeMethod,
  onClose,
  onMinimize,
  isClosing = false,
}: SaleWaitingScreenProps) {
  const markPaid = useMarkSalePaidByCustomer()
  const notified = Boolean(sale.customerMarkedPaidAt) || markPaid.isSuccess
  const merchantName = sale.merchant?.businessName || merchant.businessName

  return (
    <div className="h-dvh overflow-hidden bg-linear-to-b from-white to-[#F4F6F8]">
      <div className="mx-auto flex h-full max-w-125 flex-col">
        <header className="flex shrink-0 items-center justify-end px-3 py-3">
          <button
            type="button"
            onClick={notified ? onMinimize : onClose}
            disabled={isClosing}
            aria-label={notified ? 'Close' : 'Cancel payment'}
            className="flex size-9 items-center justify-center rounded-[12px] bg-[#00000014] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <X size={24} color="#868788" />
          </button>
        </header>
        <main
          className={`flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 text-center ${notified ? 'py-8' : 'pb-8 pt-6'}`}
        >
          <div className="my-auto flex w-full shrink-0 flex-col items-center">
            <div
              className={
                notified
                  ? 'flex size-[68px] shrink-0 items-center justify-center rounded-full border-4 border-[#24C166] text-[#24C166]'
                  : 'flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-[#E7E7E7] bg-[#F4F4F4] text-black shadow-[0px_4px_8px_0px_#0000000A]'
              }
            >
              {notified ? (
                <Check size={34} strokeWidth={3} />
              ) : copied ? (
                <CopySuccess size={28} color="currentColor" />
              ) : (
                <Copy size={28} />
              )}
            </div>
            <h1
              className={`${notified ? 'mt-6 max-w-75' : 'mt-3'} text-xl font-bold leading-[130%] -tracking-[0.4px] text-black`}
            >
              {notified
                ? `${merchantName} has been notified about your payment.`
                : copied
                  ? 'Account number copied'
                  : 'Copy account number to continue'}
            </h1>
            <p
              className={`${notified ? 'mt-2 text-[#00000080]' : 'mt-1.5 text-[#6B7280]'} max-w-90 text-sm font-medium leading-5`}
            >
              {notified
                ? 'You will get a transaction receipt when the seller confirms the payment on their end.'
                : 'Seller usually takes anywhere from a few seconds to some minutes after you transfer to confirm.'}
            </p>
            {notified ? (
              <>
                {/* Receipt requests are paused for now.
                <Button
                  type="button"
                  variant="secondary"
                  disabled
                  aria-describedby="pending-receipt-description"
                  title="Receipt requests are not available yet. Your receipt arrives after seller confirmation."
                  className="mt-6 h-9 w-fit gap-1.5 border border-[#0000000A] bg-[#0000000A] px-3.5 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A] disabled:cursor-not-allowed disabled:opacity-100"
                >
                  <Receipt1 size={16} color="currentColor" />
                  REQUEST A RECEIPT
                </Button>
                <span id="pending-receipt-description" className="sr-only">
                  Receipt requests are not available yet. Your receipt arrives
                  after seller confirmation.
                </span>
                */}
                <AppCard className="mt-6 w-full text-left">
                  <Link
                    href={`/business?businessId=${encodeURIComponent(merchant.id)}`}
                    className="flex items-center gap-3 p-3 outline-none transition-colors hover:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <MerchantAvatar
                      profilePhotoUrl={
                        merchant.businessImageUrl || merchant.profilePhotoUrl
                      }
                      alt={merchantName}
                      size={36}
                      className="rounded-full ring-2 ring-[#F1F1F1]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-black">
                        {merchantName}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium leading-[140%] text-[#00000080]">
                        Get updates from this seller
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-[#B8B8B8]"
                    />
                  </Link>
                </AppCard>
              </>
            ) : (
              <>
                {account?.accountNumber && (
                  <div className="mt-4 w-full divide-y divide-[#F1F1F1] rounded-[12px] border border-[#F1F1F1] bg-white text-left shadow-[0px_4px_8px_0px_#0000000A]">
                    <div className="flex items-center gap-3.5 px-5 py-4">
                      <BankLogo
                        bankName={account.bankName}
                        size={24}
                        className="shrink-0 rounded-[6px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#64748B]">
                          Transferring to
                        </p>
                        <p className="truncate text-sm font-bold uppercase text-[#0F172A]">
                          {account.bankName} ({account.accountNumber})
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy account number"
                        onClick={onCopy}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#0000000A] bg-[#F5F5F5] shadow-[0px_2px_4px_0px_#0000000A] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {copied ? (
                          <CopySuccess size={16} color="currentColor" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!copied}
                      onClick={onOpenBankApp}
                      className="flex w-full items-center gap-3.5 px-5 py-4 text-left outline-none hover:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
                    >
                      {fromBankName ? (
                        <BankLogo
                          bankName={fromBankName}
                          size={24}
                          className="shrink-0 rounded-[6px]"
                        />
                      ) : (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[#737C8C]">
                          <BankIcon
                            size={18}
                            weight="fill"
                            className="text-white"
                          />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-[#64748B]">
                          Transferring from
                        </span>
                        <span className="block truncate text-sm font-bold text-[#0F172A]">
                          {fromBankName || 'Open your bank app'}
                        </span>
                      </span>
                      <span className="flex size-9 items-center justify-center rounded-full border border-[#0000000A] bg-[#F5F5F5] shadow-[0px_2px_4px_0px_#0000000A] outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <ArrowUpRight size={16} />
                      </span>
                    </button>
                  </div>
                )}
                <Button
                  type="button"
                  disabled={markPaid.isPending || !copied}
                  className="mt-4 h-13 rounded-[12px] border border-[#F4F6F8] bg-white text-sm text-[#0075FF] shadow-[0px_4px_8px_0px_#0000000A] hover:bg-white/90"
                  onClick={() => {
                    if (markPaid.isPending) return
                    markPaid.mutate(
                      { saleId: sale.id, serialNumber },
                      {
                        onError: (error) =>
                          showNotificationToast({
                            message:
                              (
                                error as {
                                  response?: { data?: { message?: string } }
                                }
                              )?.response?.data?.message ||
                              'Could not notify the merchant. Please try again.',
                            mode: 'error',
                          }),
                      },
                    )
                  }}
                >
                  {markPaid.isPending ? <Spinner /> : 'I have sent the money'}
                </Button>
              </>
            )}
          </div>
        </main>
        {!notified && (
          <div className="flex shrink-0 justify-center px-4 pt-3">
            <button
              type="button"
              onClick={onChangeMethod}
              className="h-9 rounded-full bg-[#F1F1F1] px-4 text-[10px] font-bold uppercase tracking-[1px] text-black"
            >
              Change payment method
            </button>
          </div>
        )}
        <TagFooter
          color="#999999"
          className="shrink-0 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8"
        />
      </div>
    </div>
  )
}
