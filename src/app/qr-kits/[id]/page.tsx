'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, Download, Share } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/services/auth'
import { useUserQRKit, useQRCodeSVG, useUpdateQRKit } from '@/services/qr'
import { Button, LoaderCircle, showNotificationToast } from '@/components/ui'
import { Pencil } from 'lucide-react'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'
import { useUserProfile } from '@/services/users'
import { getInitials } from '@/lib/utils'
import { downloadElementAsPDF } from '@/lib/utils/pdf-download'
import { useDrawerStore } from '@/services/drawer'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

export default function QRKitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: qrKit, isLoading, error } = useUserQRKit(id)
  const { data: svgContent } = useQRCodeSVG(qrKit?.qrCodeSvgUrl)
  const { data: profile } = useUserProfile()

  const [isDownloading, setIsDownloading] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [kitName, setKitName] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const updateQRKit = useUpdateQRKit()

  useEffect(() => {
    if (qrKit?.name) {
      setKitName(qrKit.name)
    }
  }, [qrKit?.name])

  const handleUpdateName = async () => {
    if (!kitName.trim() || kitName === qrKit?.name) {
      setIsEditingName(false)
      return
    }

    try {
      await updateQRKit.mutateAsync({
        id,
        data: { name: kitName.trim() },
      })
      showNotificationToast({
        message: 'Name updated successfully',
        duration: 2000,
      })
      setIsEditingName(false)
    } catch (error) {
      console.error('Failed to update name:', error)
      showNotificationToast({
        message: 'Failed to update name',
        duration: 2000,
      })
    }
  }

  // Apply gradient branding to SVG
  const brandedSvg = useMemo(() => {
    if (!svgContent) return null
    return applyBrandingToSVG(svgContent, GRADIENT_START, GRADIENT_END, null, 0)
  }, [svgContent])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <LoaderCircle innerBg="#FFFFFF" />
      </div>
    )
  }

  if (error || !qrKit) {
    return (
      <div className="min-h-dvh bg-white flex flex-col font-satoshi">
        <header className="flex items-center py-4 px-4">
          <Link href="/qr-kits">
            <ArrowLeft className="w-6 h-6 text-black" />
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#00000080] font-medium text-sm">
            QR kit not found
          </p>
        </div>
      </div>
    )
  }

  const isActive = qrKit.activationStatus === 'activated'
  const displayId = qrKit.serialNumber.slice(-8)

  const handleDownloadPDF = async () => {
    if (!cardRef.current || isDownloading) return

    setIsDownloading(true)
    try {
      await downloadElementAsPDF(cardRef.current, {
        filename: `firespot-qr-kit-${qrKit.serialNumber}.pdf`,
        scale: 3,
        backgroundColor: '#000000',
      })
      showNotificationToast({
        message: 'PDF downloaded successfully',
        duration: 2000,
      })
    } catch (error) {
      console.error('Failed to download PDF:', error)
      showNotificationToast({
        message: 'Failed to download PDF',
        duration: 2000,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f4f6f8]">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col font-satoshi">
        <header className="flex flex-col items-center py-1.5 px-4 sticky top-0 z-10 bg-[#F4F6F8]">
          <div className="w-full flex items-center">
            <Link href="/qr-kits">
              <ArrowLeft className="w-6 h-6 text-black" />
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-base font-bold text-black">
                {qrKit.name || qrKit.serialNumber}
              </h1>
              <p className="text-xs text-[#00000066] font-medium">
                Collecting payments
              </p>
            </div>
            <div className="w-6" />
          </div>
        </header>

        <div className="flex-1 pb-8">
          <div className="flex justify-center mt-4 px-4">
            <div
              ref={cardRef}
              style={{
                background:
                  'radial-gradient(circle at top center, rgba(255, 94, 0) -25%, rgba(0, 0, 0) 40%)',
                backdropFilter: 'blur(125.30880737304688px)',
              }}
              className="py-6 px-6 rounded-2xl flex flex-col items-center relative w-full max-w-75"
            >
              <h2 className="text-white text-center font-bold font-sofia-pro text-xl leading-none -tracking-[0.4px]">
                SCAN TO TRANSFER
                <br />
                <span className="bg-linear-to-r from-[#FB5012] to-[#D72483] text-transparent bg-clip-text">
                  IN UNDER A MINUTE
                </span>
              </h2>

              <p className="text-[#FFFFFF99] font-sofia-pro text-center text-[8.7px] font-medium mb-3.5">
                Scan with your camera, send from any bank
              </p>

              {/* QR Code with Gradient Border */}
              <div className="rounded-xl relative mb-4">
                {/* SVG Gradient Definition */}
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                  <defs>
                    <linearGradient
                      id="qrGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0.32%" stopColor="#FB5012" />
                      <stop offset="100.3%" stopColor="#D72483" />
                    </linearGradient>
                  </defs>
                </svg>

                <div
                  className="rounded-2xl p-1"
                  style={{
                    background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                  }}
                >
                  <div className="bg-white p-2 rounded-[1.2rem] relative">
                    {brandedSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: brandedSvg }}
                        className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
                      />
                    ) : qrKit.qrCodeSvgUrl ? (
                      <Image
                        src={qrKit.qrCodeSvgUrl}
                        alt="QR Code"
                        width={192}
                        height={192}
                        className="h-48 w-48"
                      />
                    ) : (
                      <div className="h-48 w-48 bg-gray-100 flex items-center justify-center rounded-lg">
                        <p className="text-sm text-gray-400">No QR code</p>
                      </div>
                    )}

                    {/* Business Logo Overlay*/}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-13 h-13 rounded-full overflow-hidden border-[3px] shadow-lg border-white z-10 bg-white">
                      {profile?.profilePhotoUrl ? (
                        <Image
                          src={profile.profilePhotoUrl}
                          alt="Business Logo"
                          width={52}
                          height={52}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="bg-[#FF6B35] w-full h-full flex items-center justify-center">
                          <span className="text-base font-bold text-white inline-block">
                            {getInitials(profile?.businessName ?? '')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4 w-full gap-1 px-10">
                <div className="bg-[#FFFFFF33] rounded-full px-1 flex justify-between items-center gap-1 w-1/2">
                  <p className="text-white text-[6px] pl-0.5 font-sofia">
                    scan with
                  </p>
                  <div className="flex items-center gap-0.5 justify-center">
                    <div className="camera w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="#000000"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-camera-icon lucide-camera"
                      >
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    </div>

                    <div className="snapchat w-[8.7px] h-[8.7px] flex rounded-full bg-[#FFFC00] items-center justify-center">
                      <svg
                        fill="#000000"
                        height="5.5px"
                        width="5.5px"
                        version="1.1"
                        id="Layer_1"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 512.853 512.853"
                        xmlSpace="preserve"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          {' '}
                          <g>
                            {' '}
                            <g>
                              {' '}
                              <path d="M500.907,376.747c-64.853-11.093-93.867-75.947-97.28-83.627v-0.853c-3.413-6.827-4.267-11.947-2.56-16.213 c3.413-7.68,17.92-12.8,27.307-15.36c2.56-0.853,5.12-1.707,6.827-2.56c17.92-7.68,27.307-17.067,27.307-28.16 c0-8.533-6.827-17.067-17.067-20.48c-3.413-1.707-7.68-2.56-11.947-2.56c-2.56,0-6.827,0.853-11.093,2.56 c-8.533,3.413-15.36,5.973-20.48,5.973c-1.707,0-3.413,0-5.12-0.853c0.853-2.56,0.853-5.12,0.853-8.533v-1.707 c1.707-34.987,5.12-78.507-6.827-104.107c-34.987-76.8-107.52-82.773-128.853-82.773h-10.24c-21.333,0-93.867,5.973-128,82.773 c-11.947,25.6-9.387,69.12-6.827,104.107c0.853,3.413,0.853,6.827,0.853,10.24c-1.707,0-4.267,0.853-6.827,0.853 c-6.827,0-13.653-1.707-22.187-5.973c-11.947-5.12-34.987,2.56-37.547,17.92c-1.707,8.533,1.707,20.48,27.307,30.72 c1.707,0.853,4.267,1.707,7.68,2.56c8.533,2.56,23.04,7.68,26.453,15.36c1.707,3.413,0.853,9.387-2.56,16.213 c-1.707,2.56-31.573,71.68-98.987,82.773C4.267,376.747,0,382.72,0,389.547c0,2.56,0.853,4.267,1.707,5.973 c5.12,13.653,27.307,22.187,67.413,29.013c0.853,2.56,1.707,7.68,2.56,10.24c0.853,3.413,1.707,7.68,2.56,11.947 c0.853,4.267,5.12,11.093,15.36,11.093c3.413,0,7.68-0.853,11.947-1.707c6.827-1.707,15.36-3.413,26.453-3.413 c6.827,0,12.8,0.853,19.627,2.56c11.947,1.707,23.04,9.387,34.987,17.92c17.92,12.8,34.133,22.187,67.413,22.187 c0.853,0,1.707,0,2.56,0s2.56,0,3.413,0c29.013,0,54.613-7.68,76.8-22.187c11.947-7.68,23.04-16.213,34.987-17.92 c5.973-0.853,12.8-1.707,18.773-1.707c10.24,0,18.773,0.853,26.453,2.56c5.12,0.853,9.387,1.707,12.8,1.707 c6.827,0,12.8-4.267,14.507-11.093c0.853-4.267,1.707-7.68,2.56-11.947c0.853-1.707,1.707-6.827,2.56-9.387 c40.107-5.973,59.733-15.36,65.707-28.16c0.853-1.707,1.707-4.267,1.707-5.973C512.853,384.427,507.733,377.6,500.907,376.747z M440.32,408.32c-10.24,0.853-11.947,11.093-14.507,22.187c-0.853,2.56-1.707,5.973-2.56,9.387c-1.707,0-4.267,0-8.533-0.853 c-8.533-1.707-17.92-3.413-29.867-3.413c-6.827,0-13.653,0.853-21.333,1.707c-15.36,2.56-29.013,11.947-41.813,21.333 C302.933,472.32,281.6,478.293,256,478.293c-0.853,0-1.707,0-3.413,0c-0.231,0-0.445,0-0.64,0c-0.073,0-0.146,0-0.213,0 c-28.16,0-41.813-8.533-58.027-19.627c-12.8-9.387-25.6-18.773-41.813-21.333c-6.827-0.853-14.507-1.707-21.333-1.707 c-12.8,0-23.04,1.707-29.867,3.413c-3.413,0.853-5.973,1.707-8.533,1.707c-0.853-3.413-1.707-6.827-2.56-10.24 c-2.56-11.093-4.267-21.333-14.507-23.04c-37.547-5.12-50.347-12.8-54.613-16.213c69.973-14.507,102.4-82.773,106.667-92.16 c5.12-11.093,5.973-21.333,2.56-29.867c-6.827-15.36-25.6-21.333-37.547-24.747c-2.56,0-4.267-0.853-5.973-1.707 C71.68,236.8,69.12,231.68,69.12,230.827c0-2.56,5.973-5.973,11.093-5.973c1.707,0,2.56,0,2.56,0 c10.24,5.12,20.48,7.68,29.013,7.68c12.8,0,19.627-5.973,21.333-7.68s2.56-3.413,2.56-5.973c0-5.12-0.853-10.24-0.853-15.36 c-2.56-33.28-5.12-74.24,5.12-96.427c29.867-67.413,93.867-72.533,112.64-72.533h8.533h0.853c18.773,0,82.773,5.12,113.493,70.827 c9.387,22.187,6.827,63.147,5.12,96.427v1.707c0,5.12-0.853,9.387-0.853,13.653c0,2.56,0.853,5.12,2.56,6.827 c1.707,1.707,7.68,6.827,20.48,7.68c8.533-0.853,17.067-3.413,27.307-7.68c1.707-0.853,5.973-0.853,9.387,0.853 c4.267,1.707,5.973,4.267,5.973,5.12c0,1.707-3.413,6.827-17.067,11.947c-1.707,0.853-4.267,1.707-6.827,2.56 c-11.093,3.413-29.867,9.387-36.693,24.747c-4.267,8.533-2.56,18.773,2.56,29.867c3.413,8.533,34.987,78.507,105.813,93.013 C488.96,395.52,477.013,402.347,440.32,408.32z"></path>{' '}
                            </g>{' '}
                          </g>{' '}
                        </g>
                      </svg>
                    </div>

                    <div className="google w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
                      <svg
                        width="5.5px"
                        height="5.5px"
                        viewBox="-3 0 262 262"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid"
                      >
                        <path
                          d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                          fill="#4285F4"
                        />
                        <path
                          d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                          fill="#34A853"
                        />
                        <path
                          d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                          fill="#FBBC05"
                        />
                        <path
                          d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                          fill="#EB4335"
                        />
                      </svg>
                    </div>
                    <div className="chrome w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
                      <svg
                        width="8.7px"
                        height="8.7px"
                        viewBox="-0.5 0 257 257"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMinYMin meet"
                      >
                        <defs>
                          <linearGradient
                            x1="49.998%"
                            y1=".706%"
                            x2="49.998%"
                            y2="96.99%"
                            id="a"
                          >
                            <stop stopColor="#86BBE5" offset="0%" />
                            <stop stopColor="#1072BA" offset="100%" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M127.789.035s75.32-3.38 115.253 72.328H121.38s-22.96-.74-42.573 27.114c-5.634 11.691-11.69 23.734-4.894 47.468-9.79-16.586-51.975-90.04-51.975-90.04S51.693 3.028 127.788.035z"
                          fill="#EF3F36"
                        />
                        <path
                          d="M239.133 192.229s-34.756 66.94-120.253 63.63c10.564-18.276 60.848-105.358 60.848-105.358s12.149-19.508-2.183-50.425c-7.29-10.74-14.72-21.973-38.664-27.96 19.262-.175 103.95 0 103.95 0s31.726 52.715-3.698 120.113z"
                          fill="#FCD900"
                        />
                        <path
                          d="M16.973 192.757s-40.601-63.56 5.035-135.958c10.529 18.276 60.813 105.358 60.813 105.358s10.846 20.283 44.756 23.31c12.924-.95 26.375-1.76 43.56-19.472C161.663 182.757 119.16 256 119.16 256s-61.552 1.127-102.188-63.243z"
                          fill="#61BC5B"
                        />
                        <path
                          d="M118.845 256.493l17.113-71.412s18.804-1.48 34.58-18.769c-9.79 17.22-51.693 90.181-51.693 90.181z"
                          fill="#5AB055"
                        />
                        <path
                          d="M70.462 129.056c0-31.48 25.53-57.01 57.01-57.01 31.48 0 57.01 25.53 57.01 57.01 0 31.481-25.53 57.01-57.01 57.01-31.48-.035-57.01-25.529-57.01-57.01z"
                          fill="#FFF"
                        />
                        <path
                          d="M80.004 129.056c0-26.198 21.234-47.467 47.468-47.467 26.198 0 47.467 21.234 47.467 47.467 0 26.199-21.233 47.468-47.467 47.468-26.199 0-47.468-21.269-47.468-47.468z"
                          fill="url(#a)"
                        />
                        <path
                          d="M242.795 72.152l-70.462 20.67s-10.634-15.6-33.487-20.67c19.825-.106 103.949 0 103.949 0z"
                          fill="#EACA05"
                        />
                        <path
                          d="M72.54 144.339c-9.896-17.149-50.602-87.434-50.602-87.434l52.186 51.622s-5.353 11.022-3.345 26.797l1.76 9.015z"
                          fill="#DF3A32"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFFFFF33] rounded-full px-1 flex justify-between items-center gap-0.5 w-1/2">
                  <p className="text-white text-[6px] font-sofia">
                    <span className="text-[#FFFFFF80]">or go to </span>
                    pay.firespot.co
                  </p>
                  <Image
                    src="/images/world.png"
                    alt="world"
                    width={8.8}
                    height={8.8}
                  />
                </div>
              </div>

              <div className="flex justify-between -mx-10 w-full items-center mt-6">
                <div className="flex items-center">
                  <Image
                    src="/icons/firespot_logo.svg"
                    alt="Firespot"
                    width={12}
                    height={12}
                  />
                  <span className="text-white text-[8px] font-medium ml-1">
                    firespot
                  </span>
                </div>
                <div className="flex gap-1 absolute right-4">
                  <span className="font-sofia-pro font-medium text-[#FFFFFF80] -tracking-[3%] text-[5.81px]">
                    Powered by Firespot
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white py-5 px-4">
          <div className="w-full">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-5">
                <span className="text-sm font-medium text-[#00000080]">
                  Name
                </span>
                <div className="flex-1 ml-4 flex justify-end min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 w-full max-w-[220px] min-w-0">
                      <input
                        type="text"
                        value={kitName}
                        onChange={(e) => setKitName(e.target.value)}
                        className="flex-1 min-w-0 text-sm font-bold text-black bg-[#F4F6F8] rounded-lg px-2 py-1 outline-none border border-[#0075FF]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateName()
                          if (e.key === 'Escape') {
                            setKitName(qrKit.name || '')
                            setIsEditingName(false)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleUpdateName}
                        disabled={updateQRKit.isPending}
                        className="shrink-0 w-fit h-8 text-xs font-bold px-3"
                      >
                        {updateQRKit.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm font-bold text-black truncate">
                        {qrKit.name || 'Not set'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="p-1"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#00000066]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-5">
                <span className="text-sm font-medium text-[#00000080]">
                  Status
                </span>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <>
                      <Check className="w-4 h-4 text-[#34C759]" />
                      <span className="text-sm font-bold text-[#34C759]">
                        Active
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-[#FF3B30]">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-5">
                <span className="text-sm font-medium text-[#00000080]">
                  Serial Number
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black">
                    FS-{displayId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qrKit.serialNumber)
                      showNotificationToast({
                        message: 'Copied',
                        duration: 2000,
                      })
                    }}
                    className="p-1"
                  >
                    <Copy className="w-4 h-4 text-[#00000066]" />
                  </button>
                </div>
              </div>
            </div>

            <div className="my-5 bg-[#F0F7FF] rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#0075FF] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <p className="text-sm text-[#00000080] font-medium">
                Download and print your QR kit to start receiving payments and
                connecting with your customers.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#F1F1F1] pt-5">
              <Button
                variant="default"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>
                  {isDownloading ? 'Generating...' : 'Download PDF version'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
