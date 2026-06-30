'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Share2, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { QRCodeSVG } from 'qrcode.react'
import { useSocket } from '@/hooks/useSocket'
import { useRecordSale } from '@/services/sales/hooks'

interface Props {
  sale: any
  onRecordConfirm: (recordedSale: any) => void
}

export function CollectPaymentDrawer({ sale: initialSale, onRecordConfirm }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const recordSaleMutation = useRecordSale()
  const { socket } = useSocket()

  const [sale, setSale] = useState(initialSale)
  const [countdown, setCountdown] = useState(59)
  const [step, setStep] = useState<'qr' | 'uploaded' | 'loading'>('qr')
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0 && step === 'qr') {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown, step])

  useEffect(() => {
    if (!socket || !sale?._id) return

    socket.emit('join-sale-room', sale._id)

    const handleReceiptUploaded = (data: any) => {
      if (data._id === sale._id) {
        setSale(data)
        setStep('uploaded')
      }
    }

    const handleSaleConfirmed = (data: any) => {
      if (data._id === sale._id) {
        onRecordConfirm(data)
        closeDrawer()
      }
    }

    socket.on('receipt.uploaded', handleReceiptUploaded)
    socket.on('sale.confirmed', handleSaleConfirmed)

    return () => {
      socket.off('receipt.uploaded', handleReceiptUploaded)
      socket.off('sale.confirmed', handleSaleConfirmed)
    }
  }, [socket, sale, onRecordConfirm, closeDrawer])

  const handleConfirmReceipt = () => {
    setStep('loading')
    recordSaleMutation.mutate(
      {
        saleId: sale._id,
        payload: {
          amount: sale.amount,
          description: sale.description,
          paymentMethod: 'Bank Transfer',
        },
      },
      {
        onSuccess: (data) => {
          onRecordConfirm(data)
          closeDrawer()
        },
        onError: (err: any) => {
          alert(err?.response?.data?.message || 'Failed to confirm receipt.')
          setStep('uploaded')
        },
      }
    )
  }

  const checkoutUrl = `${window.location.origin}/pay/${sale.serialNumber || 'default'}?saleId=${sale._id}`

  if (step === 'loading') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 bg-white rounded-t-[32px] font-satoshi">
        <Loader2 className="w-10 h-10 text-black animate-spin mb-4" />
        <span className="text-sm font-bold text-black">Confirming payment...</span>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col font-satoshi p-6 bg-white rounded-t-[32px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-black">Collect payment</h2>
        <button onClick={closeDrawer} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        {step === 'qr' ? (
          <div className="w-full flex flex-col items-center">
            <span className="text-[#00000060] text-sm font-medium">Ask customer to scan code to pay</span>
            <p className="text-3xl font-bold text-black mt-2">₦{sale.amount?.toLocaleString()}</p>

            <div className="my-6 p-4 border border-[#E9EBED] rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <QRCodeSVG value={checkoutUrl} size={180} />
            </div>

            <span className="text-xs text-[#8E8E93] font-bold mb-6">
              Refreshes in: 00:{countdown.toString().padStart(2, '0')}
            </span>

            <div className="w-full flex gap-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(checkoutUrl)
                  alert('Checkout link copied!')
                }}
                className="flex-1 h-11 bg-[#F4F6F8] hover:bg-gray-200 text-black font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copy link
              </Button>
              <Button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Firespot Pay', url: checkoutUrl })
                  }
                }}
                className="flex-1 h-11 bg-[#F4F6F8] hover:bg-gray-200 text-black font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center py-2">
            <div className="w-12 h-12 border-4 border-[#24C166] border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-black">Confirm payment receipt</h3>
            <p className="text-xs text-[#8E8E93] mt-1 max-w-xs">
              Review the payment screenshot uploaded by the customer below.
            </p>

            {sale.receiptUrl && (
              <div className="w-full mt-6 bg-[#E6F4EA] border border-[#A7F3D0] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-[#065F46]">Customer uploaded receipt</span>
                  <p className="text-xs text-[#047857] mt-0.5">Click view to inspect image</p>
                </div>
                <Button
                  onClick={() => setIsReceiptPreviewOpen(true)}
                  className="bg-white text-[#047857] hover:bg-white/90 rounded-full text-xs font-bold px-4 h-8"
                >
                  VIEW
                </Button>
              </div>
            )}

            <div className="w-full flex gap-3 mt-6">
              <Button onClick={closeDrawer} variant="outline" className="flex-1 h-12 rounded-full font-bold">
                Cancel
              </Button>
              <Button onClick={handleConfirmReceipt} className="flex-1 h-12 bg-black text-white hover:bg-black/90 font-bold rounded-full">
                Record sale
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt image overlay */}
      {isReceiptPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 font-satoshi">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 flex flex-col items-center relative">
            <button onClick={() => setIsReceiptPreviewOpen(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <h3 className="text-base font-bold text-black mb-4">Screenshot proof</h3>
            <div className="w-full h-80 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
              <img src={sale.receiptUrl} alt="Screenshot proof" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-gray-500 mt-4 mb-6">Confirm if the funds reflect in your bank account.</p>
            <div className="w-full flex gap-3">
              <Button onClick={() => setIsReceiptPreviewOpen(false)} variant="outline" className="flex-1 h-12 rounded-full font-bold">
                Close
              </Button>
              <Button onClick={handleConfirmReceipt} className="flex-1 h-12 bg-[#24C166] text-white hover:bg-[#1E9E53] font-bold rounded-full">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
