'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/library'
import { Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function ScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNavigated, setHasNavigated] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

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
    <div className="relative min-h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative z-10 min-h-screen">
        <div className="max-w-[500px] mx-auto w-full flex flex-col min-h-screen">
          <header className="flex items-center justify-between py-4 px-3">
            <Image
              src="/icons/firespot_logo.svg"
              alt="firespot logo"
              width={36}
              height={36}
            />

            <p className="text-[#FFFFFFCC] text-sm">
              Scan a firespot QR code to pay
            </p>

            <button
              onClick={toggleFlash}
              disabled={!hasFlash}
              className={`w-9 h-9 rounded-full flex items-center bg-[#FFFFFF66] justify-center shadow-[0_0_10px_0_rgba(255,255,255,0.3)] transition-colors`}
            >
              <Zap fill="#ffffff" stroke="#ffffff" className={`w-5 h-5`} />
            </button>
          </header>

          {/* Scanner */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="flex-1 flex items-center justify-center">
              {error ? (
                <div className="text-center p-6 bg-black/60 rounded-2xl max-w-sm">
                  <p className="text-white text-sm mb-2">{error}</p>
                  <p className="text-gray-400 text-xs">
                    Please ensure you're using a supported browser and have
                    granted camera permissions.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-[300px] aspect-square relative">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl border-white"></div>
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl border-white"></div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl border-white"></div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl border-white"></div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Carousel */}
          <div className="py-4 px-4">
            <div className="bg-[#FFFFFF33] backdrop-blur-sm rounded-[16px] p-4">
              <h3 className="text-white font-bold text-[15px] font-satoshi mb-1">
                Login to your Firespot Lite account
              </h3>
              <p className="text-[#E1E1E1] text-xs font-satoshi mb-4">
                Manage your QR kits and account numbers
              </p>
              <Link
                href="/login"
                className="block w-full bg-[#FFFFFF33] hover:bg-[#FFFFFF4D] text-white text-sm font-bold py-2.5 rounded-full text-center transition-colors"
              >
                LOG IN
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
