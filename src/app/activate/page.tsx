'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/library'
import { X, Zap, ArrowLeft, ChevronRight, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, LoaderCircle, showNotificationToast } from '@/components/ui'
import { useAuthStore } from '@/services/auth'
import { useCheckSerialNumber, useInitiateActivation } from '@/services/users'

type ViewMode = 'scan' | 'serial' | 'confirm' | 'callback'

const ACTIVATION_AMOUNT = 2000 // NGN 2,000

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
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
  const initialMode = (searchParams.get('mode') as ViewMode) || 'scan'
  const initialSerial = searchParams.get('serial') || ''
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
  const checkSerial = useCheckSerialNumber()
  const initiateActivation = useInitiateActivation()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Handle callback from Paystack - redirect to payment-status page
  useEffect(() => {
    if (mode === 'callback' && callbackReference) {
      // Redirect to payment-status page with the reference
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
      } catch (err) {
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
    initiateActivation.mutate(validatedSerial, {
      onSuccess: (data) => {
        // Redirect to Paystack
        window.location.href = data.authorizationUrl
      },
      onError: (error: any) => {
        const message =
          error?.response?.data?.message || 'Failed to initiate payment'
        showNotificationToast({ message })
      },
    })
  }

  if (!isAuthenticated) {
    return null
  }

  // Loading state for callback verification
  if (mode === 'callback') {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
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
      <div className="relative min-h-screen bg-white overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-10 min-h-screen">
          <div className="max-w-[500px] mx-auto w-full flex flex-col min-h-screen">
            <header className="flex items-center justify-between py-4 px-4">
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

            <div className="flex-1 flex flex-col items-center justify-center px-8">
              <p className="text-white text-[15px] font-medium text-center mb-8 leading-[140%]">
                Scan an unassigned firespot QR kit
                <br />
                to link it to your account
              </p>

              {scannerError ? (
                <div className="text-center p-6 bg-white/20 rounded-2xl max-w-sm">
                  <p className="text-white text-sm mb-2">{scannerError}</p>
                </div>
              ) : (
                <div className="w-full max-w-[280px] aspect-square relative">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl border-white" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl border-white" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl border-white" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl border-white" />
                </div>
              )}
            </div>

            <div className="p-4 pb-8">
              <button
                onClick={() => updateMode('serial')}
                className="w-full text-[#878F98] text-xs font-medium underline underline-offset-4 flex items-center justify-center gap-0.5"
              >
                Link with serial number instead
                <ChevronRight className="w-3 h-3 text-[#878F98] mt-[1%]" />
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
      <div className="min-h-screen bg-white">
        <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
          <header className="flex items-center py-4 px-4">
            <button onClick={() => updateMode('scan')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
          </header>

          <div className="flex-1 px-4">
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

          <div className="p-4 pb-8">
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
      <div className="min-h-screen bg-white">
        <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
          <header className="flex items-center justify-between py-4 px-4">
            <button onClick={() => updateMode('serial')} className="p-2 -ml-2">
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

          <div className="flex-1 px-4 flex flex-col justify-evenly">
            <div className="flex items-center justify-center">
              <div className="w-fit">
                <Image
                  src="/qr_stand.png"
                  alt="QR Kit Stand"
                  width={247}
                  height={247}
                  className="object-cover mb-4"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
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
                : `Pay NGN ${ACTIVATION_AMOUNT.toLocaleString()} to activate this QR kit`}
            </Button>
            <p className="text-[#545F6CB2] text-[11px] font-medium text-center mt-4">
              Once activated, this QR kit cannot be reassigned. It can only be
              deactivated but it would remain yours permanently.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
