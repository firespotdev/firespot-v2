'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Input, Label, Button, Spinner } from '@/components/ui'

interface OtpVerificationProps {
  phoneNumber: string
  onVerify: (otp: string) => void
  onResend: () => void
  onBack: () => void
  isLoading?: boolean
  error?: string
}

export function OtpVerification({
  phoneNumber,
  onVerify,
  onResend,
  onBack,
  isLoading = false,
  error,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(59)
  const [localError, setLocalError] = useState<string | undefined>(error)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  useEffect(() => {
    setCountdown(59)
  }, [])

  useEffect(() => {
    setLocalError(error)
    if (error) {
      isSubmittingRef.current = false
    }
  }, [error])

  const triggerVerify = (code: string) => {
    if (code.length === 6 && !isLoading && !isSubmittingRef.current) {
      isSubmittingRef.current = true
      onVerify(code)
    }
  }

  const handleChange = (index: number, value: string) => {
    if (localError) setLocalError(undefined)

    if (value.length > 1) {
      const pastedData = value.slice(0, 6)
      if (/^\d+$/.test(pastedData)) {
        setOtp(pastedData)
        const lastIndex = Math.min(pastedData.length - 1, 5)
        otpInputRefs.current[lastIndex]?.focus()

        triggerVerify(pastedData)
        return
      }
    }

    if (!/^\d*$/.test(value)) return

    const defaultValue = ' '.repeat(6)
    const currentOtpArray = (otp || defaultValue).split('')
    currentOtpArray[index] = value || ' '
    const newOtp = currentOtpArray.join('').trim().slice(0, 6)

    setOtp(newOtp)

    if (value && index < 5) {
      setTimeout(() => {
        otpInputRefs.current[index + 1]?.focus()
      }, 0)
    }

    if (newOtp.length === 6 && index === 5 && value) {
      triggerVerify(newOtp)
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      setOtp(pastedData)
      // Focus last input or first empty
      const lastIndex = Math.min(pastedData.length - 1, 5)
      otpInputRefs.current[lastIndex]?.focus()

      triggerVerify(pastedData)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerVerify(otp)
  }

  const handleResend = () => {
    if (countdown === 0) {
      setCountdown(59)
      onResend()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="h-dvh bg-white">
      <div className="max-w-125 mx-auto h-full pt-8 pb-4 px-4 flex flex-col font-satoshi">
        <button
          onClick={onBack}
          className="self-start mb-6"
          type="button"
          disabled={isLoading}
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="flex-1 flex flex-col w-full">
          <h1 className="font-bold text-[20px] text-black mb-3">
            Enter the OTP to continue
          </h1>
          <p className="text-sm font-medium text-[#00000080] mb-6 max-w-86.25">
            We have sent a one time password to the phone number you used to
            register on firespot ({phoneNumber || '+2348179542786'}).
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div>
              <Label>Enter OTP</Label>
              <div className="flex gap-3 justify-start">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    value={otp[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={isLoading}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    className="w-14 h-14 border-[#D8E0E9] text-center text-lg font-semibold border"
                  />
                ))}
              </div>
              {localError && (
                <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
                    !
                  </span>
                  {localError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              {isLoading ? <Spinner /> : 'Continue'}
            </Button>
          </form>

          {countdown > 0 ? (
            <p className="text-sm font-bold text-[#00000080] mt-6 text-center">
              Request a new code in {formatTime(countdown)}
            </p>
          ) : (
            <p className="text-sm font-bold text-[#00000080] mt-6 text-center">
              Didn't receive an OTP?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="bg-linear-to-r from-[#D72483] to-[#FB5012] text-transparent bg-clip-text cursor-pointer hover:opacity-80 disabled:opacity-50"
              >
                Resend OTP
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
