'use client'

import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Copy,
  Landmark,
  Loader,
  Loader2,
  Paperclip,
  Trash2,
  X,
} from 'lucide-react'
import {
  Button,
  GreenSpinner,
  LoaderCircle,
  showNotificationToast,
  TagFooter,
} from '@/components/ui'
import { BankLogo } from '@/components/ui/bank-logo'
import { useDeleteReceipt, useUploadReceipt } from '@/services/sales/hooks'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'

type BankAccount = MerchantProfile['bankAccounts'][0]

interface SaleWaitingScreenProps {
  sale: PublicSale
  account?: BankAccount
  fromBankName: string | null
  onOpenBankApp: () => void
  onChangeMethod: () => void
  onClose: () => void
}

export function SaleWaitingScreen({
  sale,
  account,
  fromBankName,
  onOpenBankApp,
  onChangeMethod,
  onClose,
}: SaleWaitingScreenProps) {
  const uploadReceipt = useUploadReceipt()
  const deleteReceipt = useDeleteReceipt()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receiptName, setReceiptName] = useState<string | null>(null)

  const hasReceipt = Boolean(sale.receiptUrl) || uploadReceipt.isSuccess
  const isUploading = uploadReceipt.isPending

  const title = hasReceipt
    ? 'Waiting for confirmation...'
    : fromBankName
      ? 'Still checking...'
      : 'Waiting for your payment...'
  const subtitle = hasReceipt
    ? 'Your vendor may still be reviewing this.'
    : fromBankName
      ? 'You can paste or upload your transfer receipt to speed this up.'
      : 'Confirmation usually takes anywhere from a few seconds to some minutes after you transfer.'

  const displayedReceiptName =
    receiptName || `Receipt_${sale.reference?.replace('FS-', '') || 'transfer'}`

  const handleFile = (file: File) => {
    setReceiptName(file.name.replace(/\.[^.]+$/, ''))
    uploadReceipt.mutate(
      { saleId: sale.id, file },
      {
        onError: () => {
          setReceiptName(null)
          showNotificationToast({
            message: 'Failed to upload receipt. Please try again.',
            duration: 2500,
          })
        },
      },
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const file = new File([blob], 'pasted-receipt.png', {
            type: imageType,
          })
          handleFile(file)
          return
        }
      }
      showNotificationToast({
        message: 'No image found in your clipboard',
        duration: 2000,
      })
    } catch {
      showNotificationToast({
        message: 'Could not read your clipboard',
        duration: 2000,
      })
    }
  }

  const handleDeleteReceipt = () => {
    deleteReceipt.mutate(sale.id, {
      onSuccess: () => {
        setReceiptName(null)
        uploadReceipt.reset()
      },
      onError: () => {
        showNotificationToast({
          message: 'Failed to remove receipt',
          duration: 2000,
        })
      },
    })
  }

  return (
    <div className="h-dvh overflow-hidden">
      <div className="max-w-125 mx-auto h-full flex flex-col bg-[#f4f6f8]">
        {/* Header */}
        <header className="flex items-center justify-end px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
          >
            <X size={16} color="#868788" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 flex flex-col justify-center items-center">
          <GreenSpinner size={16} innerBg="#f4f6f8" />

          <h1 className="font-bold text-[20px] text-black -tracking-[0.4px] text-center mt-6">
            {title}
          </h1>
          <p className="text-sm text-[#6B7280] font-medium text-center mt-2 max-w-85">
            {subtitle}
          </p>

          {/* Transfer details (hidden once receipt is uploaded, per design) */}
          {!hasReceipt && account && (
            <div className="w-full bg-white border border-[#F1F1F1] rounded-[12px] divide-y divide-[#F1F1F1] mt-4">
              <div className="flex items-center gap-3 p-4">
                <BankLogo
                  bankName={account.bankName}
                  size={24}
                  className="rounded-[6px] border border-[#0000001A]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#64748B]">
                    Transferring to
                  </p>
                  <p className="font-bold text-sm text-black truncate uppercase">
                    {account.bankName} ({account.accountNumber})
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Copy account number"
                  onClick={() => {
                    navigator.clipboard.writeText(account.accountNumber)
                    showNotificationToast({
                      message: 'Account number copied',
                      duration: 1500,
                    })
                  }}
                  className="h-9 w-9 rounded-full bg-[#0000000A] border border-[#0000000A] flex items-center justify-center shrink-0 shadow-[0px_2px_4px_0px_#0000000A]"
                >
                  <Copy size={16} className="text-black" />
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenBankApp}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                {fromBankName ? (
                  <BankLogo
                    bankName={fromBankName}
                    size={24}
                    className="rounded-[6px] border border-[#0000001A]"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-[6px] bg-[#5C5C7A] flex items-center justify-center shrink-0">
                    <Landmark size={16} className="text-white" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-[#64748B]">
                    Transferring from
                  </span>
                  <span className="block font-bold text-sm text-black truncate">
                    {fromBankName || 'Open your bank app'}
                  </span>
                </span>
                <span className="h-9 w-9 rounded-full bg-[#0000000A] border border-[#0000000A] flex items-center justify-center shrink-0 shadow-[0px_2px_4px_0px_#0000000A]">
                  <ArrowUpRight size={16} className="text-black" />
                </span>
              </button>
            </div>
          )}

          {/* Receipt card */}
          <div
            className={`w-full bg-white border-[0.5px] border-[#0000000A] rounded-[12px] shadow-[0px_0px_0px_1px_#E5E7EB] mt-9 ${hasReceipt ? 'mt-8' : ''}`}
          >
            {hasReceipt ? (
              <div className="flex items-center gap-3 p-4">
                <span className="w-4 h-4 rounded-full bg-[#24C166] flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
                <p className="flex-1 min-w-0 font-medium text-sm text-black truncate">
                  {displayedReceiptName} uploaded
                </p>
                <button
                  type="button"
                  aria-label="Delete receipt"
                  onClick={handleDeleteReceipt}
                  disabled={deleteReceipt.isPending}
                  className="h-9 w-9 rounded-full bg-[#0000000A] border border-[#0000000A] flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  {deleteReceipt.isPending ? (
                    <Loader size={16} className="animate-spin text-red-500" />
                  ) : (
                    <Trash2 size={16} color="black" />
                  )}
                </button>
              </div>
            ) : isUploading ? (
              <div className="flex items-center gap-3 p-4">
                <Loader
                  size={20}
                  className="animate-spin text-[#0075FF] shrink-0"
                />
                <p className="flex-1 text-sm text-[#6B7280]">Uploading...</p>
                <button
                  type="button"
                  aria-label="Cancel upload"
                  onClick={() => uploadReceipt.reset()}
                  className="h-9 w-9 rounded-full bg-[#0000000A] border border-[0000000A] flex items-center justify-center shrink-0 shadow-[0px_2px_4px_0px_#0000000A]"
                >
                  <X size={16} color="black" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <Paperclip
                    size={20}
                    className="text-[#6B7280] shrink-0 -rotate-5"
                  />
                  <span className="text-sm font-medium text-[#6B7280] truncate">
                    Tap to upload receipt
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="bg-[#0000000A] rounded-full h-9 px-4 flex items-center gap-1.5 text-[10px] font-bold border border-[#0000000A] tracking-[1px] text-black uppercase shrink-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M8 12.2h7M8 16.2h4.38M10 6h4c2 0 2-1 2-2 0-2-1-2-2-2h-4C9 2 8 2 8 4s1 2 2 2Z"
                      stroke="#000000"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                    <path
                      d="M16 4.02c3.33.18 5 1.41 5 5.98v6c0 4-1 6-6 6H9c-5 0-6-2-6-6v-6c0-4.56 1.67-5.8 5-5.98"
                      stroke="#000000"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                  Paste
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!hasReceipt && (
            <Button
              variant="secondary"
              onClick={onChangeMethod}
              className="w-full bg-[#F1F1F1] hover:bg-[#F1F1F1]/90 text-black font-bold text-base rounded-full h-12 mt-4 shrink-0"
            >
              Change payment method
            </Button>
          )}
        </div>

        <TagFooter className="py-8" />
      </div>
    </div>
  )
}
