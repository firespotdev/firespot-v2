'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { BrowserMultiFormatReader } from '@zxing/library'
import { X, Zap, ArrowLeft, ChevronRight, Check, LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, LoaderCircle, showNotificationToast } from '@/components/ui'
import { useAuthStore } from '@/services/auth'
import {
  useCheckSerialNumber,
  useInitiateActivation,
  useUserProfile,
} from '@/services/users'
import { useQRKitPricing } from '@/services/qr-orders'
import { QRKitPreview } from '@/components/qr'
import { PaystackRedirectingScreen } from '@/components/pay/paystack-redirecting-screen'
import { usePaystackRedirectState } from '@/hooks/usePaystackRedirectState'

type ViewMode = 'scan' | 'serial' | 'confirm' | 'callback'
type ApiError = {
  response?: {
    data?: {
      message?: string
    }
  }
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      }
    >
      <ActivatePageContent />
    </Suspense>
  )
}

function ActivatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Get initial mode from URL params
  const initialSerial = searchParams.get('serial') || ''
  const initialMode =
    (searchParams.get('mode') as ViewMode) ||
    (initialSerial ? 'serial' : 'scan')
  const callbackReference = searchParams.get('reference') || ''

  const [mode, setMode] = useState<ViewMode>(initialMode)
  const [serialNumber, setSerialNumber] = useState(initialSerial)
  const [validatedSerial, setValidatedSerial] = useState(initialSerial)
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'checking' | 'available' | 'already_bound' | 'not_found'
  >('idle')

  // Scanner state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  // API hooks
  const { data: user } = useUserProfile()
  const checkSerial = useCheckSerialNumber()
  const initiateActivation = useInitiateActivation()
  const {
    isRedirectingToPaystack,
    startPaystackRedirect,
    cancelPaystackRedirect,
  } = usePaystackRedirectState()
  const { pricing } = useQRKitPricing()

  const isSerialReservedForUser = Boolean(
    checkSerial.data?.status === 'available' &&
      checkSerial.data?.reservedForMerchantId &&
      checkSerial.data.reservedForMerchantId ===
        (user?.id || (user as { _id?: string })?._id),
  )

  // Prepaid physical orders skip the activation charge; the server validates it.
  const isActivationFree =
    !!(user?.availableKitEntitlements && user.availableKitEntitlements > 0) ||
    isSerialReservedForUser

  // Redirect to login if not authenticated (merchant intent: kit claimants
  // go straight to business setup, never personal onboarding)
  useEffect(() => {
    if (!isAuthenticated) {
      const params = new URLSearchParams()
      params.set('intent', 'merchant')
      params.set('redirect', '/activate')
      if (initialSerial) params.set('serial', initialSerial)
      router.push(`/login?${params.toString()}`)
    }
  }, [isAuthenticated, router, initialSerial])

  // Activation requires a business (bank account + name). Personal users
  // claiming a kit are sent through merchant setup first, then back here.
  useEffect(() => {
    if (isAuthenticated && user && !user.businessName) {
      const returnUrl = initialSerial
        ? `/activate?serial=${initialSerial}`
        : '/activate'
      router.replace(
        `/onboarding/merchant?redirect=${encodeURIComponent(returnUrl)}`,
      )
    }
  }, [isAuthenticated, user, initialSerial, router])

  // Handle callback from Paystack - redirect to payment-status page
  useEffect(() => {
    if (mode === 'callback' && callbackReference) {
      router.replace(`/payment-status?reference=${callbackReference}`)
    }
  }, [mode, callbackReference, router])

  // Update URL when mode changes
  const updateMode = useCallback(
    (newMode: ViewMode, serial?: string) => {
      setMode(newMode)
      const params = new URLSearchParams()
      params.set('mode', newMode)
      if (serial) {
        params.set('serial', serial)
        setValidatedSerial(serial)
      }
      router.replace(`/activate?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  // Scanner setup
  useEffect(() => {
    if (mode !== 'scan') return

    const isBrowserSupported =
      typeof window !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia !== undefined

    if (!isBrowserSupported) {
      setScannerError('Camera is not supported in this browser.')
      return
    }

    let isMounted = true
    const codeReader = new BrowserMultiFormatReader()
    codeReaderRef.current = codeReader

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Check if flash is available
        const tracks = stream.getVideoTracks()
        if (tracks.length > 0) {
          const track = tracks[0]
          const capabilities =
            track.getCapabilities?.() as MediaTrackCapabilities & {
              torch?: boolean
            }
          if (capabilities?.torch) {
            setHasFlash(true)
          }
        }

        // Start scanning
        if (isMounted && videoRef.current) {
          codeReader.decodeFromVideoDevice(null, videoRef.current, (result) => {
            if (result) {
              const scannedText = result.getText()
              // Extract serial number from QR code URL
              // Expected format: {BASE_URL}/pay/{serialNumber} (new format)
              const payMatch = scannedText.match(/\/pay\/([A-Z0-9-]+)/i)
              if (payMatch) {
                const serial = payMatch[1]
                setSerialNumber(serial.toUpperCase())
                handleSerialValidation(serial.toUpperCase())
              }
            }
          })
        }
      } catch {
        if (isMounted) {
          setScannerError('Camera access denied. Please allow camera access.')
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      codeReaderRef.current?.reset()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
    // Scanner is restarted only when its view opens; serial validation is
    // intentionally read from the current render callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const toggleFlash = async () => {
    if (!streamRef.current) return

    const tracks = streamRef.current.getVideoTracks()
    if (tracks.length === 0) return

    const track = tracks[0]
    try {
      await track.applyConstraints({
        // @ts-expect-error - torch is not in the standard type
        advanced: [{ torch: !flashOn }],
      })
      setFlashOn(!flashOn)
    } catch (err) {
      console.error('Flash toggle failed:', err)
    }
  }

  const handleSerialValidation = useCallback(
    (serial: string) => {
      if (!serial || serial.length < 6) {
        setValidationStatus('idle')
        return
      }

      setValidationStatus('checking')
      checkSerial.mutate(serial, {
        onSuccess: (data) => {
          setValidationStatus(data.status)
          if (data.status === 'available') {
            updateMode('confirm', data.serialNumber)
          }
        },
        onError: () => {
          setValidationStatus('not_found')
        },
      })
    },
    [checkSerial, updateMode],
  )

  // Auto-validate serial number if provided in URL
  useEffect(() => {
    if (initialSerial && mode === 'serial' && validationStatus === 'idle') {
      handleSerialValidation(initialSerial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSerialValidation])

  const handleSerialInputChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setSerialNumber(upperValue)
    setValidationStatus('idle')

    // Auto-validate after user stops typing
    if (upperValue.length >= 6) {
      const timer = setTimeout(() => {
        handleSerialValidation(upperValue)
      }, 500)
      return () => clearTimeout(timer)
    }
  }

  const handlePayment = () => {
    if (initiateActivation.isPending || isRedirectingToPaystack) return
    if (!isActivationFree) startPaystackRedirect()
    initiateActivation.mutate(validatedSerial, {
      onSuccess: (data) => {
        if (data.isAutoActivated || !data.authorizationUrl) {
          cancelPaystackRedirect()
          showNotificationToast({
            message: data.message || 'QR kit activated!',
            mode: 'success',
          })
          //router.push('/profile')
          window.location.href = '/profile'
          return
        }

        // Paystack Redirect
        window.location.href = data.authorizationUrl
      },
      onError: (error: unknown) => {
        cancelPaystackRedirect()
        const apiError = error as ApiError
        const message =
          apiError.response?.data?.message || 'Failed to initiate payment'
        showNotificationToast({ message, mode: 'error' })
      },
    })
  }

  if (isRedirectingToPaystack) {
    return <PaystackRedirectingScreen />
  }

  const handleProceedWithoutLinking = () => {
    router.push('/order-qr-kit?kitType=digital')
  }

  if (!isAuthenticated) {
    return null
  }

  // Loading state for callback verification
  if (mode === 'callback') {
    return (
      <div className="min-h-dvh bg-[#F4F6F8] flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle innerBg="#F4F6F8" />
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    )
  }

  // Scanner View
  if (mode === 'scan') {
    return (
      <div className="relative h-dvh bg-white overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-10 h-full flex flex-col">
          <div className="max-w-125 mx-auto w-full flex flex-col h-full">
            <header className="sticky top-0 z-50 flex items-center justify-between py-4 px-4 bg-white/80 backdrop-blur-sm">
              <Link
                href="/profile"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20"
              >
                <X className="w-5 h-5 text-black" />
              </Link>

              <h1 className="text-black font-bold text-base">
                Activate a Firespot QRkit
              </h1>

              <button
                onClick={toggleFlash}
                disabled={!hasFlash}
                className="w-9 h-9 rounded-full flex items-center bg-[#F0F0F0] justify-center"
              >
                <Zap
                  fill={flashOn ? '#F0F0F0' : '#666666'}
                  stroke={flashOn ? '#F0F0F0' : '#666666'}
                  className="w-5 h-5"
                />
              </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
              <p className="text-white text-[15px] font-medium text-center mb-8 leading-[140%]">
                Scan an unassigned firespot QR kit
                <br />
                to link it to your account
              </p>

              {scannerError ? (
                <div className="text-center p-6 bg-white/20 rounded-[12px] max-w-sm">
                  <p className="text-white text-sm mb-2">{scannerError}</p>
                </div>
              ) : (
                <div className="w-full max-w-70 aspect-square relative">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl border-white" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl border-white" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl border-white" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl border-white" />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-50 mt-auto shrink-0 space-y-4 rounded-t-[12px] bg-white p-6 backdrop-blur-sm">
              <button
                onClick={() => updateMode('serial')}
                className="mx-auto flex px-3.5 h-9 w-fit items-center justify-center gap-2 rounded-full bg-[#0000000A] border border-[#0000000A] shadow-[0px_2px_4px_0px_#0000000A] text-[10px] font-bold tracking-[1px] text-black"
              >
                <LinkIcon size={16} />
                LINK WITH SERIAL NUMBER
              </button>

              <button
                type="button"
                onClick={handleProceedWithoutLinking}
                className="mx-auto flex items-center justify-center gap-0.5 text-xs font-medium text-[#878F98] underline underline-offset-4 disabled:opacity-50"
              >
                Buy a digital QR kit
                <ChevronRight size={12} className="text-[#878F98] mt-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Serial Number Input View
  if (mode === 'serial') {
    const isError =
      validationStatus === 'already_bound' || validationStatus === 'not_found'
    const isSuccess = validationStatus === 'available'

    return (
      <div className="h-dvh bg-white overflow-hidden">
        <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi">
          <header className="sticky top-0 z-50 flex items-center py-4 px-4 bg-white">
            <button
              type="button"
              onClick={() => updateMode('scan')}
              aria-label="Back to QR scanner"
              className="p-2 -ml-2"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
          </header>

          <div className="flex-1 px-4 overflow-y-auto">
            <h1 className="text-xl font-bold text-black mb-2 leading-none">
              Link with serial number
            </h1>
            <p className="text-[#00000080] font-medium text-sm mb-8">
              Enter the serial number shown on the back of an unassigned QRkit
              to link it to your account.
            </p>

            <div className="space-y-2">
              <Label className="mb-0">Serial number</Label>
              <div className="relative">
                <Input
                  value={serialNumber}
                  onChange={(e) => handleSerialInputChange(e.target.value)}
                  placeholder="Enter your serial number"
                  className={`pr-10 placeholder:text-[#22222299] placeholder:text-sm ${
                    isError
                      ? 'border-[#FF002E] focus-visible:border-[#FF002E] focus-visible:ring-[#FF002E]/20'
                      : ''
                  }`}
                />
                {validationStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  </div>
                )}
                {isSuccess && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </div>
              {isError && (
                <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
                    !
                  </span>
                  {validationStatus === 'already_bound'
                    ? 'This serial number is already binded with another account.'
                    : 'Serial number not found.'}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 pb-8 bg-white">
            <button
              onClick={() => updateMode('scan')}
              className="w-full text-[#878F98] text-xs font-medium underline underline-offset-4 flex items-center justify-center gap-0.5"
            >
              Link with QR code instead
              <ChevronRight className="w-3 h-3 text-[#878F98] mt-[1%]" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Payment Confirmation View
  if (mode === 'confirm') {
    return (
      <div className="h-dvh bg-white overflow-hidden">
        <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi">
          <header className="sticky top-0 z-50 flex items-center justify-between py-4 px-4 bg-white">
            <button
              type="button"
              onClick={() => updateMode('serial')}
              aria-label="Back to serial number"
              className="p-2 -ml-2"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-black">
                Firespot QR kit detected
              </h1>
              <p className="text-[#6B7280] text-xs font-medium">
                Serial Number : {validatedSerial}
              </p>
            </div>
            <div className="w-6 h-6"></div>
          </header>

          <div className="flex-1 px-4 flex flex-col justify-evenly overflow-y-auto">
            <div className="flex items-center justify-center">
              <QRKitPreview />
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>

          <div className="p-4 pb-6 border-t border-[#F1F1F1] rounded-[12px]">
            <Button
              onClick={handlePayment}
              disabled={initiateActivation.isPending}
              className="w-full bg-[#24C166] hover:bg-[#24C166]/90 text-white rounded-[48px] h-12 font-bold"
            >
              {initiateActivation.isPending
                ? 'Processing...'
                : isActivationFree
                  ? 'Activate this QR kit'
                  : `Pay NGN ${pricing.activationAmount.toLocaleString()} to activate this QR kit`}
            </Button>
            <p className="text-[#545F6CB2] text-[11px] font-medium text-center mt-4">
              {isActivationFree
                ? '⚠️ Important: Activating your QR kit is free. No one should ever collect an activation fee from you.'
                : '⚠️ Important: No one should collect activation fees on behalf of Firespot. Payment happens only inside the app.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
