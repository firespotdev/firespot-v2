'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useLogin, useCustomerSignup, useVerifyOtp, useAuthStore } from '@/services/auth'

function CustomerLoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']) // Support 6-digit OTP
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(59)

  const loginMutation = useLogin()
  const signupMutation = useCustomerSignup()
  const verifyOtpMutation = useVerifyOtp()
  const { isAuthenticated, user } = useAuthStore()

  const redirectPath = searchParams.get('redirect')

  // Timer countdown for resending OTP
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [step, resendTimer])

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectPath) {
        router.replace(redirectPath)
      } else {
        router.replace('/customer/history')
      }
    }
  }, [isAuthenticated, user, redirectPath, router])

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setError(null)
    setIsLoading(true)

    const payload = {
      phoneNumber,
      phoneCountryCode: '+234',
    }

    // Try log in. If user is not found, automatically register them as a customer.
    loginMutation.mutate(payload, {
      onSuccess: () => {
        setIsLoading(false)
        setStep(2)
        setResendTimer(59)
      },
      onError: (err: any) => {
        const status = err?.response?.status
        if (status === 401 || err?.response?.data?.message?.includes('not found')) {
          // Trigger customer signup pipeline
          signupMutation.mutate(payload, {
            onSuccess: () => {
              setIsLoading(false)
              setStep(2)
              setResendTimer(59)
            },
            onError: (signupErr: any) => {
              setIsLoading(false)
              setError(signupErr?.response?.data?.message || 'Failed to initialize signup.')
            }
          })
        } else {
          setIsLoading(false)
          setError(err?.response?.data?.message || 'Failed to send OTP code.')
        }
      }
    })
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpString = otpCode.join('')
    if (otpString.length < 6) {
      setError('Please enter the 6-digit OTP code')
      return
    }

    setError(null)
    setIsLoading(true)

    verifyOtpMutation.mutate(
      {
        phoneNumber,
        otpCode: otpString,
      },
      {
        onSuccess: (data) => {
          setIsLoading(false)
          if (redirectPath) {
            router.replace(redirectPath)
          } else {
            router.replace('/customer/history')
          }
        },
        onError: (err: any) => {
          setIsLoading(false)
          setError(err?.response?.data?.message || 'Invalid or expired OTP code.')
        }
      }
    )
  }

  const handleResendOtp = () => {
    if (resendTimer > 0) return
    setError(null)
    setResendTimer(59)
    loginMutation.mutate({ phoneNumber, phoneCountryCode: '+234' })
  }

  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return
    const updated = [...otpCode]
    updated[index] = val.slice(-1)
    setOtpCode(updated)

    // Focus next element
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  if (step === 2) {
    return (
      <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center font-satoshi">
        <div className="w-full max-w-125 bg-white h-full flex flex-col p-6 shadow-sm relative">
          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all text-black"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2px]" />
          </button>

          <form onSubmit={handleOtpSubmit} className="flex-1 flex flex-col justify-between pt-10 pb-6">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-black mb-2">Enter the OTP to continue</h1>
              <p className="text-sm text-[#00000060] font-medium leading-relaxed mb-8">
                We have sent a one time password to your registered phone number <span className="font-bold text-black">+234 {phoneNumber}</span>.
              </p>

              {/* OTP Input Fields */}
              <div className="flex gap-2 justify-center mb-4">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 border border-[#E9EBED] rounded-xl text-center text-xl font-bold text-black focus:outline-none focus:border-black bg-[#F4F6F8]"
                  />
                ))}
              </div>

              {error && <p className="text-xs text-red-500 font-medium text-center mt-2">{error}</p>}
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0}
                className={`text-xs font-bold text-center ${resendTimer > 0 ? 'text-[#8E8E93]' : 'text-black hover:underline'}`}
              >
                {resendTimer > 0 ? `Request a new code in 00:${resendTimer.toString().padStart(2, '0')}` : 'Resend code'}
              </button>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold rounded-full flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center font-satoshi">
      <div className="w-full max-w-125 bg-white h-full flex flex-col p-6 justify-between shadow-sm">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-3xl bg-[#0085FF] flex items-center justify-center shadow-md mb-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 10V3L4 14H11V21L20 10H13Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-xl font-bold text-black mb-2">Log in or sign up</h1>
          <p className="text-[13px] text-[#00000060] font-medium leading-relaxed mb-10 max-w-xs">
            Get an OTP on your registered phone number to continue to your firespot account.
          </p>

          <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8E8E93] font-bold">Phone number</label>
              <div className="flex border border-[#E9EBED] rounded-xl overflow-hidden focus-within:border-black transition-all bg-[#F4F6F8]">
                <div className="bg-[#E9EBED] px-4 flex items-center gap-1 text-sm font-bold text-black">
                  <span className="text-base">🇳🇬</span>
                  <span>+234</span>
                </div>
                <input
                  type="tel"
                  placeholder="000 000 0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 p-3 bg-[#F4F6F8] text-sm focus:outline-none text-black font-bold tracking-wider"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold rounded-full flex items-center justify-center mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
            </Button>
          </form>

          <span className="text-[13px] text-[#8E8E93] font-bold my-6">OR</span>

          <Button
            variant="outline"
            className="w-full h-11 border border-[#E9EBED] hover:bg-gray-50 rounded-xl font-bold text-black flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Login with Google
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white flex items-center justify-center">Loading...</div>}>
      <CustomerLoginPageContent />
    </Suspense>
  )
}
