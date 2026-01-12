'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Reset countdown when component mounts
  useEffect(() => {
    setCountdown(59)
  }, [])

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return

    const newValue = otp.split('')
    newValue[index] = digit
    const newOtp = newValue.join('').slice(0, 4)
    setOtp(newOtp)

    // Auto-focus next input
    if (digit && index < 3) {
      otpInputRefs.current[index + 1]?.focus()
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
    const pastedData = e.clipboardData.getData('text').slice(0, 4)
    if (/^\d+$/.test(pastedData)) {
      setOtp(pastedData)
      // Focus last input
      const lastIndex = Math.min(pastedData.length - 1, 3)
      otpInputRefs.current[lastIndex]?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 4) {
      onVerify(otp)
    }
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
    <div className="h-screen bg-white pt-8 pb-4 px-4 flex flex-col font-satoshi">
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
        <p className="text-sm font-medium text-[#00000080] mb-6 max-w-[345px]">
          We have sent a one time password to the phone number you used to
          register on firespot ({phoneNumber || '+2348179542786'}).
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div>
            <Label>Enter OTP</Label>
            <div className="flex gap-3 justify-start">
              {[0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ''}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isLoading}
                  className="w-14 h-14 border-[#D8E0E9] text-center text-lg font-semibold border focus-visible:border-black"
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center mt-2">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={otp.length !== 4 || isLoading}
          >
            {isLoading ? 'Verifying...' : 'Continue'}
          </Button>
        </form>

        {countdown > 0 ? (
          <p className="text-sm font-bold text-[#00000080] mt-6 text-center">
            Request a new code in {formatTime(countdown)}
          </p>
        ) : (
          <p className="text-sm font-bold text-[#00000080] mt-6 text-center">
            Didn't receive an OTP?{' '}
            <span className="bg-linear-to-r from-[#D72483] to-[#FB5012] text-transparent bg-clip-text">
              Resend OTP
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
