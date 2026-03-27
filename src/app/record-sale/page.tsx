'use client'

import { Suspense, useState } from 'react'

export default function RecordSalePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <RecordSaleContent />
    </Suspense>
  )
}

function RecordSaleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pendingSaleId = searchParams.get('id')

  const createManualSaleMutation = useCreateManualSale()
  const recordSaleMutation = useRecordSale()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [step, setStep] = useState<'amount' | 'saving' | 'success' | 'error'>(
    'amount',
  )
  const [successDetails, setSuccessDetails] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1))
      return
    }

    setAmount((prev) => {
      if (key === '.' && prev.includes('.')) return prev
      if (key === '.' && prev === '') return '0.'
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
      if (prev.length >= 10) return prev
      if (prev === '0' && key !== '.') return key
      return prev + key
    })
  }

  const submitSale = (method: string = 'Other') => {
    // Close drawer and show saving state immediately
    useDrawerStore.getState().closeDrawer()
    setSuccessDetails({
      amount: Number(amount),
      paymentMethod: method,
      date: new Date(),
    })
    setStep('saving')

    const mutation = pendingSaleId ? recordSaleMutation : createManualSaleMutation
    const payload = {
      amount: Number(amount),
      description,
      paymentMethod: method,
    }

    if (pendingSaleId) {
      recordSaleMutation.mutate(
        { saleId: pendingSaleId, payload },
        {
        onSuccess: (data) => {
            setSuccessDetails(data)
            setStep('success')
          },
          onError: (error: any) => {
            setErrorMessage(
              error?.response?.data?.message ||
                'Failed to record sale. Please try again.',
            )
            setStep('error')
          },
        },
      )
    } else {
      createManualSaleMutation.mutate(payload, {
        onSuccess: (data) => {
          setSuccessDetails(data)
          setStep('success')
        },
        onError: (error: any) => {
          setErrorMessage(
            error?.response?.data?.message ||
              'Failed to record sale. Please try again.',
          )
          setStep('error')
        },
      })
    }
  }

  const handleRecordSaleClick = () => {
    openDrawer({
      type: 'payment-method',
      props: { onSubmit: submitSale },
    })
  }

  if (
    (step === 'saving' || step === 'success' || step === 'error') &&
    successDetails
  ) {
    return (
      <RecordSuccessDrawer
        successDetails={successDetails}
        status={step}
        errorMessage={errorMessage}
        setStep={setStep}
        setAmount={setAmount}
        setDescription={setDescription}
      />
    )
  }

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ]

  const isRecording =
    amount.length > 0 && amount !== '0' && amount !== '0.' && amount !== '.'
  const displayAmount = amount === '' ? '0' : amount

  return (
    <div className="h-dvh bg-white flex flex-col items-center">
      <div className="relative w-full max-w-125 bg-white h-dvh flex flex-col font-satoshi shadow-sm">
        {/* Top Bar */}
        <div className="flex justify-between items-center px-4 py-1.5">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors text-black shrink-0"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5px]" />
          </button>
          <h1 className="text-[17px] font-bold text-black flex-1 text-center shrink-0">
            Enter amount received
          </h1>
          <Link href="/recents" className="p-2 -mr-2 rounded-full shrink-0">
            <Image
              src="/icons/history.svg"
              alt="Recent"
              width={24}
              height={24}
            />
          </Link>
        </div>

        {/* Dynamic Amount Display */}
        <div className="flex-1 flex flex-col justify-center items-center px-4">
          <div className="flex items-center justify-center leading-none">
            <span className="text-[62px] font-medium text-black font-sofia-pro -tracking-[4px] leading-none mr-1">
              ₦
            </span>
            {amount === '' && (
              <div className="w-[2px] h-[52px] bg-[#0085FF] mx-1 rounded-full shrink-0" />
            )}
            <span
              className={`text-[62px] font-medium -tracking-[4px] font-sofia-pro leading-none ${amount === '' ? 'text-[#9CA3AF]' : 'text-black'}`}
            >
              {displayAmount}
            </span>
            {amount !== '' && (
              <div className="w-[2px] h-[52px] bg-[#0085FF] mx-1 rounded-full animate-caret-blink shrink-0" />
            )}
          </div>
        </div>

        {/* Input and Keypad Container */}
        <div className="w-full flex flex-col pb-3">
          <div className="px-3 mb-3 w-full mx-auto">
            <div className="relative flex items-center justify-center w-full border border-[#E9EBED] rounded-[10px] px-4 py-3.5 focus-within:border-gray-400 transition-colors overflow-hidden">
              {description === '' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <PencilLine size={16} color="#9CA3AF" className="mr-1.5" />
                  <span className="text-[15px] font-medium text-[#9CA3AF]">
                    What's this payment for?
                  </span>
                </div>
              )}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-center text-[15px] font-medium text-black focus:outline-none bg-transparent relative z-10"
              />
            </div>
          </div>

          <div className="w-full border-t border-[#F4F6F8]">
            {keypadRows.map((row, i) => (
              <div key={i} className="flex border-b border-[#F4F6F8] h-[72px]">
                {row.map((key, j) => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={`flex-1 flex items-center justify-center transition-colors active:bg-gray-50 flex-col
                      ${j === 1 ? 'border-x border-[#F4F6F8]' : ''}
                    `}
                  >
                    {key === 'backspace' ? (
                      <Delete
                        className="w-6 h-6 text-black"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <span className="text-[28px] font-medium text-black">
                        {key}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="w-full p-3 pb-0 bg-white shrink-0">
            <Button
              onClick={handleRecordSaleClick}
              disabled={!isRecording}
              className={`w-full h-14 rounded-full font-bold text-base transition-colors ${
                isRecording
                  ? 'bg-black text-white hover:bg-black/90 active:scale-[0.98]'
                  : 'bg-[#F4F6F8] text-[#9CA3AF] hover:bg-[#F4F6F8]'
              }`}
            >
              Record sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
