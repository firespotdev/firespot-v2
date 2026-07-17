'use client'

import { Check, X, AlertCircle, Clock } from 'lucide-react'
import { Button, StatBanner, TagFooter } from '../ui'
import { LoaderCircle } from '../ui'
import { useRouter } from 'next/navigation'
import { useSalesStats } from '@/services/sales/hooks'
import Link from 'next/link'
import { useDrawerStore } from '@/services/drawer'
import { cn, formatCurrency } from '@/lib/utils'

interface RecordSuccessDrawerProps {
  successDetails: any
  status: 'saving' | 'success' | 'error'
  errorMessage?: string
  setStep: (step: 'input' | 'saving' | 'success' | 'error') => void
  setAmount: (amount: string) => void
  setDescription: (description: string) => void
  onRecordAnother?: () => void
}

const RecordSuccessDrawer = ({
  successDetails,
  status,
  errorMessage,
  setStep,
  setAmount,
  setDescription,
  onRecordAnother,
}: RecordSuccessDrawerProps) => {
  const router = useRouter()
  const { openDrawer, closeDrawer, closeAllDrawers } = useDrawerStore()
  const { data: statsData, isLoading: isLoadingStats } = useSalesStats()

  const todaySalesAmount = statsData?.todaySalesAmount ?? 0

  const formatDueDate = (dateInput: any) => {
    if (!dateInput) return ''
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    const day = date.getDate()
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    let suffix = 'th'
    if (day === 1 || day === 21 || day === 31) suffix = 'st'
    else if (day === 2 || day === 22) suffix = 'nd'
    else if (day === 3 || day === 23) suffix = 'rd'

    return `${day}${suffix} ${month}, ${year}`
  }

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
            <button
              onClick={() => {
                closeAllDrawers()
                router.push('/profile')
              }}
            >
              <X className="w-6 h-6 text-black" />
            </button>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
            <p className="text-[64px]">😢</p>

            <h1 className="text-black text-[20px] font-bold leading-none -tracking-[0.4px] mb-2 mt-10 text-center">
              Failed to record sale
            </h1>
            <p className="text-[#00000066] text-sm font-medium text-center max-w-75 leading-[125%]">
              {errorMessage || 'Something went wrong, Please try again later.'}
            </p>
          </div>

          <div className="p-4 pb-6">
            <button
              onClick={() => {
                if (onRecordAnother) {
                  onRecordAnother()
                } else {
                  setAmount('')
                  setDescription('')
                  setStep('input')
                }
                closeAllDrawers()
                router.push('/record-sale')
              }}
              className="flex items-center justify-center w-full bg-black text-white font-bold h-12 rounded-full hover:bg-black cursor-pointer"
            >
              {errorMessage ? 'Record new' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  const displayDate =
    successDetails.date instanceof Date
      ? successDetails.date
      : new Date(
          successDetails.createdAt || successDetails.recordedAt || new Date(),
        )

  return (
    <div className="h-dvh w-full overflow-hidden bg-[#FEFEFE] flex flex-col items-center">
      <div className="w-full max-w-125 h-full flex flex-col font-satoshi">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 shrink-0">
          <button
            onClick={() => {
              if (!(successDetails?.hasBeenEdited || successDetails?.isEdit)) {
                setStep('input')
                closeAllDrawers()
              }
            }}
            disabled={successDetails?.hasBeenEdited || successDetails?.isEdit}
            className={cn(
              'p-2 -ml-2 rounded-full transition-colors shrink-0',
              successDetails?.hasBeenEdited || successDetails?.isEdit
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-gray-50 cursor-pointer',
            )}
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
            onClick={() => {
              if (onRecordAnother) {
                onRecordAnother()
              } else {
                setAmount('')
                setDescription('')
                setStep('input')
              }
              closeAllDrawers()
              if (statsData?.pendingSalesCount! > 0) {
                router.push('/recents')
              } else {
                router.push('/profile')
              }
            }}
            className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-6 h-6 text-black stroke-[2.5px]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          {successDetails?.isPaidInFull === false ||
          (successDetails?.balanceOwed && successDetails.balanceOwed > 0) ? (
            <div className="flex items-center justify-center mb-4.5 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="76"
                height="76"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z"
                  stroke="#bb8123"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="m15.71 15.18-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1"
                  stroke="#bb8123"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          ) : (
            <div className="w-[64px] h-[64px] rounded-full border-4 border-[#24C166] flex items-center justify-center mb-5 shrink-0">
              <Check
                className="w-[32px] h-[32px] text-[#24C166]"
                strokeWidth={3}
              />
            </div>
          )}

          <h1 className="text-[20px] font-bold text-black -tracking-[0.4px] mb-1.5 text-center leading-[140%]">
            {successDetails?.isEdit ? (
              'Sale updated successfully'
            ) : successDetails?.isPaidInFull === false ||
              (successDetails?.balanceOwed &&
                successDetails.balanceOwed > 0) ? (
              <>
                Partial payment
                <br />
                recorded successfully
              </>
            ) : (
              <>
                Full payment
                <br />
                recorded successfully
              </>
            )}
          </h1>
          <p className="text-[14px] text-center font-medium text-[#00000080] max-w-[350px] mb-8 leading-[135%] shrink-0">
            {successDetails?.isPaidInFull === false ||
            (successDetails?.balanceOwed && successDetails.balanceOwed > 0) ? (
              <>
                {successDetails.paymentMethod} payment of NGN{' '}
                {formatCurrency(successDetails.amountPaid ?? 0)} on{' '}
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
                . NGN {formatCurrency(successDetails.balanceOwed ?? 0)}{' '}
                outstanding balance due
                {successDetails?.dueDate
                  ? ` by ${formatDueDate(successDetails.dueDate)}`
                  : ''}
                .
              </>
            ) : (
              <>
                {successDetails.paymentMethod} payment of NGN{' '}
                {formatCurrency(successDetails.amount ?? 0)} on{' '}
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
              </>
            )}
          </p>

          <StatBanner
            label="Total sales recorded today"
            amount={todaySalesAmount}
            badgeText={`+NGN ${formatCurrency(successDetails?.amountPaid ?? successDetails?.amount ?? 0)}`}
            badgePositive={true}
            isLoading={isLoadingStats}
            className="mb-8"
          />

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

        <div className="w-full bg-white space-y-3 px-4 pb-4 pt-4 shrink-0 mt-auto border-t border-[#F1F1F1]">
          <Button
            onClick={() => {
              if (onRecordAnother) {
                onRecordAnother()
              } else {
                setAmount('')
                setDescription('')
                setStep('input')
              }
              closeAllDrawers()
            }}
            className="w-full bg-black text-white h-12 rounded-full font-bold text-[16px] hover:bg-black/90 transition-all active:scale-[0.98]"
          >
            Record another sale
          </Button>
          {/* Dynamic-QR (collect) sales show branding; manual sales get a
              Dismiss action back to the profile/recents. */}
          {successDetails?.isCollection ? (
            <TagFooter className="py-4" />
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                if (onRecordAnother) {
                  onRecordAnother()
                } else {
                  setAmount('')
                  setDescription('')
                  setStep('input')
                }
                closeAllDrawers()
                if (statsData?.pendingSalesCount! > 0) {
                  router.push('/recents')
                } else {
                  router.push('/profile')
                }
              }}
              className="w-full hover:bg-gray-50 bg-transparent text-black h-14 rounded-full font-bold text-[15px] transition-colors"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export { RecordSuccessDrawer }
