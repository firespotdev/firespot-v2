'use client'

import { Check, X, AlertCircle } from 'lucide-react'
import { Button } from '../ui'
import { LoaderCircle } from '../ui'
import { useRouter } from 'next/navigation'
import { useSalesStats } from '@/services/sales/hooks'
import Link from 'next/link'
import { useDrawerStore } from '@/services/drawer'

interface RecordSuccessDrawerProps {
  successDetails: any
  status: 'saving' | 'success' | 'error'
  errorMessage?: string
  setStep: (step: 'amount' | 'saving' | 'success' | 'error') => void
  setAmount: (amount: string) => void
  setDescription: (description: string) => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const RecordSuccessDrawer = ({
  successDetails,
  status,
  errorMessage,
  setStep,
  setAmount,
  setDescription,
}: RecordSuccessDrawerProps) => {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: statsData } = useSalesStats()

  const todaySalesAmount = statsData?.todaySalesAmount ?? 0

  if (status === 'saving') {
    return (
      <div className="h-dvh w-full overflow-hidden bg-[#FEFEFE] flex flex-col items-center">
        <div className="w-full h-full flex flex-col font-satoshi">
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
            <LoaderCircle innerBg="#FEFEFE" />
            <p className="text-[14px] font-medium text-black/70">
              Saving to records...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="h-dvh bg-white overflow-hidden">
        <div className="h-full flex flex-col font-satoshi">
          <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white">
            <div className="w-8" />
            <div className="w-8" />
            <Link href="/profile">
              <X className="w-6 h-6 text-black" />
            </Link>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
            <p className="text-[64px]">😢</p>

            <h1 className="text-black text-[20px] font-bold leading-none -tracking-[0.4px] mb-2 mt-10 text-center">
              Failed to record sale
            </h1>
            <p className="text-[#00000066] text-sm font-medium text-center max-w-75 leading-[125%]">
              Something went wrong, Please try again later.
            </p>
          </div>

          <div className="p-4 pb-6">
            <Link
              href="/record-sale"
              className="flex items-center justify-center w-full bg-black text-white font-bold h-12 rounded-full hover:bg-black"
            >
              Try again
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  const displayDate = successDetails.date instanceof Date 
    ? successDetails.date 
    : new Date(successDetails.createdAt || successDetails.recordedAt || new Date())

  return (
    <div className="h-dvh w-full overflow-hidden bg-[#FEFEFE] flex flex-col items-center">
      <div className="w-full max-w-125 h-full flex flex-col font-satoshi">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 shrink-0">
          <button
            onClick={() => setStep('amount')}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors shrink-0"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-black"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors shrink-0"
          >
            <X className="w-6 h-6 text-black stroke-[2.5px]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <div className="w-[64px] h-[64px] rounded-full border-4 border-[#24C166] flex items-center justify-center mb-5 shrink-0">
            <Check
              className="w-[32px] h-[32px] text-[#24C166]"
              strokeWidth={3}
            />
          </div>

          <h1 className="text-[20px] font-bold text-black -tracking-[0.4px] mb-1.5 text-center shrink-0">
            {successDetails?.isEdit ? 'Sale updated successfully' : 'Payment recorded successfully'}
          </h1>
          <p className="text-[14px] text-center text-[#878F98] max-w-[350px] mb-8 font-medium leading-[130%] shrink-0">
            {successDetails.paymentMethod} payment of NGN
            {successDetails.amount.toFixed(2)} on{' '}
            {displayDate.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            at{' '}
            {displayDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
            .
          </p>

          <div className="border border-[#F4F6F8] px-4 py-4 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] w-full flex justify-between items-center mb-8 shrink-0">
            <div className="w-full">
              <div className="flex items-center gap-1 mb-2 justify-between w-full">
                <span className="text-[#00000066] text-xs font-medium">
                  Total sales recorded today
                </span>
                <span className="text-[#24C166] text-xs font-bold">
                  +NGN {formatCurrency(successDetails.amount)}
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <h3 className="font-bold text-[22px] tracking-tight leading-none text-black">
                  &#8358; {formatCurrency(todaySalesAmount)}
                </h3>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              openDrawer({
                type: 'transaction-details',
                props: {
                  sale: successDetails,
                  todaySalesAmount,
                },
              })
            }}
            className="py-[10px] w-fit px-[14px] h-9 gap-1 shadow-[0px_2px_4px_0px_#0000000A] border border-[#0000000A] shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22 6v2.42C22 10 21 11 19.42 11H16V4.01C16 2.9 16.91 2 18.02 2c1.09.01 2.09.45 2.81 1.17C21.55 3.9 22 4.9 22 6Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M6.25 10h5.5"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="text-black text-[10px] font-bold tracking-[1px]">
              RECEIPT
            </span>
          </Button>
        </div>

        {/* Footer */}
        <div className="w-full bg-white space-y-3 px-4 pb-4 pt-4 shrink-0 mt-auto border-t border-[#F1F1F1]">
          <Button
            onClick={() => {
              setAmount('')
              setDescription('')
              setStep('amount')
            }}
            className="w-full bg-black text-white h-14 rounded-full font-bold text-[15px] hover:bg-black/90 transition-all active:scale-[0.98]"
          >
            Record another sale
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/profile')}
            className="w-full hover:bg-gray-50 bg-transparent text-black h-14 rounded-full font-bold text-[15px] transition-colors"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}

export { RecordSuccessDrawer }
