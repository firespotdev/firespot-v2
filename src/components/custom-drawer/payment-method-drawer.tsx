import { useState } from 'react'
import { useDrawerStore } from '@/services/drawer'
import { AlertCircle, ArrowLeft, Check } from 'lucide-react'

interface Props {
  onSubmit: (method: string) => void
}

const paymentMethods = [
  { id: 'Bank Transfer', label: 'Bank Transfer' },
  { id: 'Cash', label: 'Cash' },
  { id: 'POS', label: 'POS' },
  { id: 'Other', label: 'Other' },
]

export function PaymentMethodDrawer({ onSubmit }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [selectedMethod, setSelectedMethod] = useState('')

  return (
    <div className="w-full flex flex-col font-satoshi relative pb-6 overflow-y-auto">
      <div className="flex items-center justify-between mt-2 mb-7 px-4">
        <ArrowLeft
          onClick={closeDrawer}
          color="#000000"
          strokeWidth={2}
          className="w-5.5 h-5.5"
        />
        <h2 className="text-[16px] font-bold text-black flex-1 text-center">
          How were you paid
        </h2>
        <button
          onClick={() => onSubmit('Other')}
          className="text-[13px] font-medium text-black border-b border-black shrink-0 pb-px mr-1 hover:opacity-80"
        >
          Skip
        </button>
      </div>

      <div className="p-3">
        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-3">
          {paymentMethods
            .filter((method) => method.id !== 'Other')
            .map((method) => {
              const isSelected = selectedMethod === method.id

              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method.id)
                    onSubmit(method.id)
                  }}
                  type="button"
                  className="w-full flex items-center justify-between gap-3 py-5 px-4 border-b border-[#EBEBEB] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-black">
                      {method.id === 'Bank Transfer' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="m12.37 2.15 9 3.6c.35.14.63.56.63.93V10c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V6.68c0-.37.28-.79.63-.93l9-3.6c.2-.08.54-.08.74 0ZM22 22H2v-3c0-.55.45-1 1-1h18c.55 0 1 .45 1 1v3ZM4 18v-7M8 18v-7M12 18v-7M16 18v-7M20 18v-7M1 22h22"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : method.id === 'Cash' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M17 20.5H7c-3 0-5-1.5-5-5v-7c0-3.5 2-5 5-5h10c3 0 5 1.5 5 5v7c0 3.5-2 5-5 5Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 9h1c3 0 4-1 4-4V4M22 9h-1c-3 0-4-1-4-4V4M2 15h1c3 0 4 1 4 4v1M22 15h-1c-3 0-4 1-4 4v1"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : method.id === 'POS' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3.93 15.88 15.88 3.93M11.101 18.28l1.2-1.2M13.793 15.589l2.39-2.39"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="m3.601 10.239 6.64-6.64c2.12-2.12 3.18-2.13 5.28-.03l4.91 4.91c2.1 2.1 2.09 3.16-.03 5.28l-6.64 6.64c-2.12 2.12-3.18 2.13-5.28.03l-4.91-4.91c-2.1-2.1-2.1-3.15.03-5.28ZM2 21.998h20"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M8.672 14.33c0 1.29.99 2.33 2.22 2.33h2.51c1.07 0 1.94-.91 1.94-2.03 0-1.22-.53-1.65-1.32-1.93l-4.03-1.4c-.79-.28-1.32-.71-1.32-1.93 0-1.12.87-2.03 1.94-2.03h2.51c1.23 0 2.22 1.04 2.22 2.33M12 6v12"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-[15px] font-bold text-black">
                      {method.label}
                    </span>
                  </div>

                  <div
                    className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-[#0075FF] bg-[#0075FF]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 text-white"
                        strokeWidth={3.5}
                      />
                    )}
                  </div>
                </button>
              )
            })}
        </div>

        <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-4">
          {paymentMethods
            .filter((method) => method.id === 'Other')
            .map((method) => {
              const isSelected = selectedMethod === method.id

              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method.id)
                    onSubmit(method.id)
                  }}
                  type="button"
                  className="w-full flex items-center justify-between gap-3 py-5 px-4 border-b border-[#EBEBEB] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-black">
                      {method.id === 'Bank Transfer' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="m12.37 2.15 9 3.6c.35.14.63.56.63.93V10c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V6.68c0-.37.28-.79.63-.93l9-3.6c.2-.08.54-.08.74 0ZM22 22H2v-3c0-.55.45-1 1-1h18c.55 0 1 .45 1 1v3ZM4 18v-7M8 18v-7M12 18v-7M16 18v-7M20 18v-7M1 22h22"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : method.id === 'Cash' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M17 20.5H7c-3 0-5-1.5-5-5v-7c0-3.5 2-5 5-5h10c3 0 5 1.5 5 5v7c0 3.5-2 5-5 5Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 9h1c3 0 4-1 4-4V4M22 9h-1c-3 0-4-1-4-4V4M2 15h1c3 0 4 1 4 4v1M22 15h-1c-3 0-4 1-4 4v1"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : method.id === 'POS' ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3.93 15.88 15.88 3.93M11.101 18.28l1.2-1.2M13.793 15.589l2.39-2.39"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeMiterlimit="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="m3.601 10.239 6.64-6.64c2.12-2.12 3.18-2.13 5.28-.03l4.91 4.91c2.1 2.1 2.09 3.16-.03 5.28l-6.64 6.64c-2.12 2.12-3.18 2.13-5.28.03l-4.91-4.91c-2.1-2.1-2.1-3.15.03-5.28ZM2 21.998h20"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M8.672 14.33c0 1.29.99 2.33 2.22 2.33h2.51c1.07 0 1.94-.91 1.94-2.03 0-1.22-.53-1.65-1.32-1.93l-4.03-1.4c-.79-.28-1.32-.71-1.32-1.93 0-1.12.87-2.03 1.94-2.03h2.51c1.23 0 2.22 1.04 2.22 2.33M12 6v12"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <path
                            d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-[15px] font-bold text-black">
                      {method.label}
                    </span>
                  </div>

                  <div
                    className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-[#0075FF] bg-[#0075FF]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 text-white"
                        strokeWidth={3.5}
                      />
                    )}
                  </div>
                </button>
              )
            })}
        </div>

        <div className="bg-[#F4F4F4] rounded-[12px] p-3 flex items-center gap-2 border border-[#00000014]">
          <AlertCircle size={28} color="#00000066" strokeWidth={2} />
          <p className="text-xs text-[#00000066] leading-[1.4] font-medium">
            You will not receive a payout for these transactions. Sales are
            recorded for accounting purposes only.
          </p>
        </div>
      </div>
    </div>
  )
}
