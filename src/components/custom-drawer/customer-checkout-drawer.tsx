'use client'

import { useState, useEffect } from 'react'
import { X, Copy, ChevronRight, UploadCloud, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { useUploadReceipt } from '@/services/sales/hooks'
import { useSocket } from '@/hooks/useSocket'
import { showNotificationToast } from '@/components/ui'

// Popular Nigerian banks data
const NIGERIAN_BANKS = [
  { name: 'GTB', code: '058', logo: 'GTB' },
  { name: 'Access', code: '044', logo: 'Access' },
  { name: 'Firstbank', code: '011', logo: 'Firstbank' },
  { name: 'OPay', code: '999992', logo: 'OPay' },
  { name: 'Kuda', code: '50211', logo: 'Kuda' },
  { name: 'Moniepoint', code: '50515', logo: 'Moniepoint' },
  { name: 'Providus', code: '101', logo: 'Providus' },
  { name: 'WEMA', code: '035', logo: 'WEMA' },
  { name: 'Sterling', code: '070', logo: 'Sterling' },
  { name: 'UBA', code: '033', logo: 'UBA' },
  { name: 'Zenith', code: '057', logo: 'Zenith' },
  { name: 'Union', code: '032', logo: 'Union' },
]

interface Props {
  bankAccount: any
  totalAmount: number
  activeSaleId: string
  merchant: any
  onCopy: () => void
}

export function CustomerCheckoutDrawer({ bankAccount, totalAmount, activeSaleId, merchant, onCopy }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const uploadReceiptMutation = useUploadReceipt()
  const { socket } = useSocket()

  const [checkoutStep, setCheckoutStep] = useState<'waiting' | 'uploading' | 'review' | 'confirmed'>('waiting')
  const [isBankAppsOpen, setIsBankAppsOpen] = useState(false)
  const [uploadedReceiptFile, setUploadedReceiptFile] = useState<File | null>(null)

  // Socket updates for checkout state
  useEffect(() => {
    if (!socket || !activeSaleId) return

    socket.emit('join-sale-room', activeSaleId)

    const handleSaleConfirmed = (data: any) => {
      if (data._id === activeSaleId) {
        setCheckoutStep('confirmed')
      }
    }

    const handleSaleCancelled = (data: any) => {
      if (data._id === activeSaleId) {
        alert('This sale checkout has been cancelled by the vendor.')
        closeDrawer()
      }
    }

    socket.on('sale.confirmed', handleSaleConfirmed)
    socket.on('sale.cancelled', handleSaleCancelled)

    return () => {
      socket.off('sale.confirmed', handleSaleConfirmed)
      socket.off('sale.cancelled', handleSaleCancelled)
    }
  }, [socket, activeSaleId, closeDrawer])

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeSaleId) return

    setUploadedReceiptFile(file)
    setCheckoutStep('uploading')

    uploadReceiptMutation.mutate(
      { saleId: activeSaleId, file },
      {
        onSuccess: () => {
          setCheckoutStep('review')
        },
        onError: (err: any) => {
          alert(err?.response?.data?.message || 'Failed to upload receipt proof.')
          setCheckoutStep('waiting')
        }
      }
    )
  }

  const handleOpenBankApp = (bankName: string) => {
    setIsBankAppsOpen(false)
    showNotificationToast({ message: `Opening ${bankName} app...` })
  }

  if (checkoutStep === 'uploading') {
    return (
      <div className="w-full flex flex-col items-center text-center py-12 bg-white rounded-t-[32px] font-satoshi">
        <Loader2 className="w-12 h-12 text-[#0085FF] animate-spin mb-4" />
        <h3 className="text-base font-bold text-black">Uploading receipt proof...</h3>
        <p className="text-xs text-[#00000060] mt-1">Please wait while we send the screenshot to the merchant.</p>
      </div>
    )
  }

  if (checkoutStep === 'review') {
    return (
      <div className="w-full flex flex-col items-center text-center py-8 bg-white rounded-t-[32px] font-satoshi">
        <div className="w-12 h-12 border-4 border-[#24C166] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-black">Waiting for confirmation...</h3>
        <p className="text-xs text-[#00000060] mt-1 max-w-xs mb-6">Your vendor is currently reviewing your payment proof.</p>

        {uploadedReceiptFile && (
          <div className="w-full bg-[#E6F4EA] border border-[#A7F3D0] rounded-xl p-3.5 flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-[#065F46] truncate max-w-[200px]">
              Receipt_{uploadedReceiptFile.name}
            </span>
            <button onClick={() => setCheckoutStep('waiting')} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  if (checkoutStep === 'confirmed') {
    return (
      <div className="w-full flex flex-col items-center text-center py-8 bg-white rounded-t-[32px] font-satoshi">
        <div className="w-16 h-16 bg-[#E6F4EA] rounded-full flex items-center justify-center text-[#24C166] mb-6">
          <Check className="w-8 h-8 stroke-[3px]" />
        </div>
        <h3 className="text-lg font-bold text-black">{merchant?.businessName || 'Merchant'} notified</h3>
        <p className="text-sm text-[#00000060] mt-1 max-w-xs mb-8">
          Transfer of ₦{totalAmount.toLocaleString()} confirmed successfully.
        </p>
        <Button onClick={closeDrawer} className="w-full h-12 bg-black text-white font-bold rounded-full">
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col font-satoshi p-6 bg-white rounded-t-[32px] max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 border-b border-[#F4F6F8] pb-3">
        <h2 className="text-base font-bold text-black">Complete Payment</h2>
        <button onClick={closeDrawer} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>

      {isBankAppsOpen ? (
        <div className="flex flex-col gap-4 py-2">
          <span className="text-xs text-[#00000060] font-bold">Select your bank</span>
          <div className="grid grid-cols-4 gap-4 py-2">
            {NIGERIAN_BANKS.map((bankObj) => (
              <button
                key={bankObj.code}
                onClick={() => handleOpenBankApp(bankObj.name)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-[#F4F6F8] border border-[#E9EBED] rounded-xl flex items-center justify-center font-bold text-xs text-black">
                  {bankObj.logo}
                </div>
                <span className="text-[11px] font-bold text-black truncate max-w-[70px]">{bankObj.name}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => setIsBankAppsOpen(false)} variant="outline" className="w-full h-11 rounded-full font-bold mt-4">
            Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-12 h-12 border-4 border-[#0085FF] border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-bold text-black">Waiting for your payment...</h3>
          <p className="text-xs text-[#00000060] mt-1 max-w-xs mb-6">
            Confirmation usually takes anywhere from a few seconds to some minutes after you transfer.
          </p>

          {/* Account Details Box */}
          {bankAccount && (
            <div className="w-full bg-[#F4F6F8] rounded-2xl p-4 text-left flex justify-between items-center mb-4 border border-[#E9EBED]">
              <div className="flex flex-col">
                <span className="text-xs text-[#00000060]">Transferring to</span>
                <span className="text-sm font-bold text-black mt-1">{bankAccount.bankName} ({bankAccount.accountNumber})</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bankAccount.accountNumber)
                  onCopy()
                }}
                className="p-1.5 bg-[#E9EBED] hover:bg-gray-200 rounded-full"
              >
                <Copy className="w-4 h-4 text-black" />
              </button>
            </div>
          )}

          {/* Open Bank Selector */}
          <button
            onClick={() => setIsBankAppsOpen(true)}
            className="w-full flex items-center justify-between p-4 border border-[#E9EBED] rounded-xl hover:bg-gray-50 mb-4"
          >
            <div className="flex flex-col text-left">
              <span className="text-xs text-[#00000060]">Transferring from</span>
              <span className="text-sm font-bold text-black mt-0.5">Open your bank app</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </button>

          {/* Screenshot Upload Dropzone */}
          <div className="w-full relative flex items-center justify-center p-6 border-2 border-dashed border-[#E9EBED] rounded-2xl hover:bg-gray-50 transition-all cursor-pointer mb-6 bg-[#F4F6F8]">
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="w-8 h-8 text-[#0085FF] mb-2" />
              <span className="text-sm font-bold text-black">Tap to upload receipt</span>
              <p className="text-xs text-[#00000040] mt-0.5">PNG, JPG or WEBP screenshots</p>
            </div>
          </div>

          <button onClick={closeDrawer} className="text-xs font-bold text-[#FF3B30] hover:underline">
            Change payment method
          </button>
        </div>
      )}
    </div>
  )
}
