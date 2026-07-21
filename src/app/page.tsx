'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/library'
import { Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react'
import { CTACarousel } from '@/components/ui/cta-carousel'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { isTokenExpired } from '@/lib/utils/auth-redirect'

export default function ScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNavigated, setHasNavigated] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted)
  const logout = useAuthStore((state) => state.logout)
  const authReady = useAuthReady()

  // Signed-in users (personal, or merchants in personal mode) get the Recent
  // shortcut + bottom nav; logged-out visitors keep the login CTAs.
  const isSignedIn =
    authReady && isAuthenticated && !!token && !isTokenExpired(token)

  useEffect(() => {
    // Wait for the bootstrap refresh so a returning user with a valid refresh
    // cookie isn't logged out over a merely-expired access token.
    if (!authReady) return
    if (isAuthenticated && token) {
      if (isTokenExpired(token)) {
        logout()
        return
      }
      // The scanner is a neutral surface both personal users and merchants
      // (acting in personal mode via the bottom nav) can use. Merchants get
      // routed to their business profile once at login time by
      // getPostAuthDestination — not here — so switching to personal mode and
      // tapping Scan isn't bounced back to /profile. Only unfinished
      // onboarding still redirects.
      if (!onboardingCompleted) {
        router.replace('/onboarding')
      }
    }
  }, [authReady, isAuthenticated, token, onboardingCompleted, router, logout])

  // Extract serial number from QR code content
  const extractSerialNumber = useCallback(
    (scannedText: string): string | null => {
      // Expected format: {BASE_URL}/pay/{serialNumber} (new format)
      const payUrlMatch = scannedText.match(/\/pay\/([A-Z0-9-]+)/i)
      if (payUrlMatch) {
        return payUrlMatch[1].toUpperCase()
      }
      // Also accept raw serial numbers (alphanumeric, possibly with dashes)
      if (/^[A-Z0-9-]{6,}$/i.test(scannedText)) {
        return scannedText.toUpperCase()
      }
      return null
    },
    [],
  )

  // Handle navigation to payment page
  const handleScanResult = useCallback(
    (serialNumber: string) => {
      if (hasNavigated) return
      setHasNavigated(true)

      // Stop the scanner and camera
      codeReaderRef.current?.reset()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Navigate to payment page
      router.push(`/pay/${serialNumber}`)
    },
    [router, hasNavigated],
  )

  useEffect(() => {
    // Check browser capability
    const isBrowserSupported =
      typeof window !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia !== undefined

    // Don't start scanner if browser doesn't support camera
    if (!isBrowserSupported) {
      setError('Camera is not supported in this browser or environment.')
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

        // Start scanning for QR codes - only if still mounted and video element exists
        if (isMounted && videoRef.current) {
          codeReader.decodeFromVideoDevice(
            null,
            videoRef.current,
            (result, err) => {
              // Check if component is still mounted before processing result
              if (!isMounted) return

              if (result) {
                const scannedText = result.getText()
                const serialNumber = extractSerialNumber(scannedText)
                if (serialNumber) {
                  handleScanResult(serialNumber)
                }
              }
              // NotFoundException is expected when no QR code is detected, so we ignore it
              if (err && err.name !== 'NotFoundException') {
                console.error('Scanner error:', err)
              }
            },
          )
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Camera error:', err)
          setError(
            err.name === 'NotAllowedError' ||
              err.name === 'PermissionDeniedError'
              ? 'Camera access denied. Please allow camera access to scan QR codes.'
              : 'Failed to access camera. Please check your device settings.',
          )
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      // Stop scanning
      codeReaderRef.current?.reset()
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        streamRef.current = null
      }
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [extractSerialNumber, handleScanResult])

  const toggleFlash = async () => {
    if (!streamRef.current) return

    const tracks = streamRef.current.getVideoTracks()
    if (tracks.length === 0) return

    const track = tracks[0]
    try {
      await track.applyConstraints({
        // @ts-expect-error - torch is not in the standard MediaTrackConstraints type but is supported by browsers
        advanced: [{ torch: !flashOn }],
      })
      setFlashOn(!flashOn)
    } catch (err) {
      console.error('Flash toggle failed:', err)
    }
  }

  return (
    <div className="relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative z-10 h-dvh flex flex-col">
        <div className="max-w-125 mx-auto w-full flex flex-col h-full">
          <header className="sticky top-0 z-50 flex items-center justify-between py-4 px-3 bg-linear-to-b from-black/50 to-transparent">
            <Image
              src="/icons/firespot_logo.svg"
              alt="firespot logo"
              width={36}
              height={36}
            />

            <p className="text-[#FFFFFFCC] text-sm">Scan a firespot QR code</p>

            <button
              onClick={toggleFlash}
              disabled={!hasFlash}
              className={`glass-border w-9 h-9 rounded-full flex items-center bg-black/40 justify-center transition-colors`}
            >
              <Zap fill="#ffffff" stroke="#ffffff" className={`w-5 h-5`} />
            </button>
          </header>

          {/* Scanner */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="flex-1 flex items-center justify-center">
              {error ? (
                <div className="text-center p-6 bg-black/60 rounded-[12px] max-w-sm">
                  <p className="text-white text-sm mb-2">
                    Camera access denied
                  </p>
                  <p className="text-gray-400 text-xs">
                    Please ensure you're using a supported browser and have
                    granted camera permissions.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-75 aspect-square relative">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl border-white"></div>
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl border-white"></div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl border-white"></div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl border-white"></div>
                </div>
              )}
            </div>
          </div>

          {isSignedIn ? (
            <div className="flex justify-center pb-28">
              <Link
                href="/activity"
                className="glass-border inline-flex items-center justify-center gap-1.5 w-23.5 py-2 pl-2 pr-3 rounded-4xl bg-[#FFFFFF1A] text-[#FFFFFF80] text-sm font-medium"
              >
                <ClockCounterClockwiseIcon size={20} color="#FFFFFF99" />
                Recent
              </Link>
            </div>
          ) : (
            <div className="py-4 bg-linear-to-t from-black/50 to-transparent">
              <CTACarousel>
                <div className="bg-[#FFFFFF66] rounded-[12px] px-4 py-3.5">
                  <h3 className="text-white font-bold text-sm">
                    Login to your Firespot Lite account
                  </h3>
                  <p className="text-[#E1E1E1] text-xs mb-3.5 border-b border-[#FFFFFF1F] pb-3.75">
                    Manage your QR kits and account numbers
                  </p>
                  <Link
                    href="/login"
                    className="block w-full bg-[#FFFFFF33] text-white text-[10px] tracking-[1px] py-2.5 font-bold rounded-full text-center transition-colors shadow-[0px_2px_24px_0px_#0000000A]"
                  >
                    LOG IN
                  </Link>
                </div>

                <div className="bg-[#FFFFFF66] rounded-[12px] px-4 py-3.5">
                  <h3 className="text-white font-bold text-sm">
                    Get your Firespot QR Kit
                  </h3>
                  <p className="text-[#E1E1E1] text-xs mb-3.5 border-b border-[#FFFFFF1F] pb-3.75">
                    All your account numbers in one scan.
                  </p>
                  <Link
                    href="/login?intent=merchant"
                    className="block w-full bg-white text-black text-[10px] tracking-[1px] py-2.5 font-bold rounded-full text-center transition-colors shadow-[0px_2px_24px_0px_#0000000A]"
                  >
                    SIGN UP
                  </Link>
                </div>

                <div className="bg-[#FFFFFF66] rounded-[12px] px-4 py-3.5">
                  <h3 className="text-white font-bold text-sm">
                    Pay for your purchases faster
                  </h3>
                  <p className="text-[#E1E1E1] text-xs mb-3.5 border-b border-[#FFFFFF1F] pb-3.75">
                    Transfer from any Nigerian Bank
                  </p>
                  <Link
                    href="https://firespot.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-white text-black text-[10px] tracking-[1px] py-2.5 font-bold rounded-full text-center transition-colors shadow-[0px_2px_24px_0px_#0000000A]"
                  >
                    HOW IT WORKS
                  </Link>
                </div>
              </CTACarousel>
            </div>
          )}
        </div>
      </div>

      {isSignedIn && <BottomNav variant="dark" />}
    </div>
  )
}
