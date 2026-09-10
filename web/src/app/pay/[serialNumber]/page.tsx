'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { ArrowUpRight, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMerchantBySerial } from '@/services/qr'
import { useRecordAccountCopy } from '@/services/scans'
import { showNotificationToast } from '@/components/ui'
import { LoadingPage } from '@/components/layout/LoadingPage'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { useAuthStore } from '@/services/auth'
import type { MerchantProfile } from '@/services/qr/interface'
import { SalesApi } from '@/services/sales/salesApi'
import {
  useCreatePendingSale,
  useCreatePaystackCollectSale,
  useRecordScan,
  useRecordCopy,
  useClaimSalePayer,
  usePublicSale,
  useCustomerSavedCards,
  usePayWithSavedCard,
} from '@/services/sales/hooks'
import type { PaymentRail } from '@/components/custom-drawer/rail-picker-drawer'
import { DEFAULT_PAYSTACK_CHANNEL } from '@/components/custom-drawer/channel-picker-drawer'
import { SalePaymentFlow } from '@/components/pay/sale-payment-flow'
import { SalePayAmountScreen } from '@/components/pay/sale-pay-amount-screen'
import { PaystackRedirectingScreen } from '@/components/pay/paystack-redirecting-screen'
import { PaystackWaitingScreen } from '@/components/pay/paystack-waiting-screen'
import { usePaystackRedirectState } from '@/hooks/usePaystackRedirectState'
import { sortBankAccounts } from '@/lib/utils/bank-registry'
import { QRCodeSVG } from 'qrcode.react'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'

type BankAccount = MerchantProfile['bankAccounts'][0]

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const serialNumber = params.serialNumber as string
  const saleId = searchParams.get('saleId') || ''
  const [isRecoveringActiveSale, setIsRecoveringActiveSale] = useState(
    () => !saleId,
  )

  const [selectedBankIndex, setSelectedBankIndex] = useState(0)
  const [selectedRail, setSelectedRail] = useState<PaymentRail>('multiple')
  const [selectedChannel, setSelectedChannel] = useState<string>(
    DEFAULT_PAYSTACK_CHANNEL,
  )
  const purchaseItems = usePurchaseCartStore((state) => state.items)
  const clearPurchase = usePurchaseCartStore((state) => state.clear)
  const resetPurchase = usePurchaseCartStore((state) => state.reset)
  const [hasCopyBeenRecorded, setHasCopyBeenRecorded] = useState(false)
  const [isEnteringWaiting, setIsEnteringWaiting] = useState(false)
  const recordCopy = useRecordAccountCopy()
  const createPendingSale = useCreatePendingSale()
  const createPaystackCollectSale = useCreatePaystackCollectSale()
  const {
    isRedirectingToPaystack,
    startPaystackRedirect,
    cancelPaystackRedirect,
  } = usePaystackRedirectState()
  const { mutate: recordSaleScan } = useRecordScan()
  const recordSaleCopy = useRecordCopy()
  const claimSalePayer = useClaimSalePayer()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const authUser = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: customerCards } = useCustomerSavedCards(isAuthenticated)
  const savedCards = customerCards || authUser?.savedCards || []
  const defaultSavedCard = savedCards[0]
  const payWithSavedCard = usePayWithSavedCard()
  const customerExitPath = isAuthenticated ? '/home' : '/'
  const isReturningFromPaystack =
    Boolean(saleId) && searchParams.get('payment') === 'paystack-return'

  useEffect(() => {
    resetPurchase()
  }, [resetPurchase, serialNumber])

  useEffect(() => {
    if (saleId) {
      recordSaleScan(saleId)
    }
  }, [recordSaleScan, saleId])

  const { data: merchant, isLoading, error } = useMerchantBySerial(serialNumber)
  const hasSavedCards = Boolean(
    isAuthenticated &&
      merchant?.hasPaystackCollection &&
      merchant.savedCardsCheckoutEnabled !== false &&
      savedCards.length > 0,
  )
  // Dynamic QR sale (public, limited view). A failed or cancelled dynamic sale
  // ends the flow; it must never fall back into static-payment mode.
  const {
    data: publicSale,
    isLoading: saleLoading,
    isError: saleError,
  } = usePublicSale(saleId || undefined, serialNumber)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let active = true
    const storageKey = `firespot-active-sale:${serialNumber}`

    if (saleId) {
      sessionStorage.setItem(storageKey, saleId)
      return
    }

    const storedSaleId = sessionStorage.getItem(storageKey)
    if (!storedSaleId) {
      queueMicrotask(() => {
        if (active) setIsRecoveringActiveSale(false)
      })
      return
    }

    queueMicrotask(() => {
      if (active) setIsRecoveringActiveSale(true)
    })
    SalesApi.getPublicSale(storedSaleId, serialNumber)
      .then((storedSale) => {
        if (!active) return

        if (storedSale.status === 'PENDING') {
          router.replace(
            `/pay/${encodeURIComponent(serialNumber)}?saleId=${encodeURIComponent(storedSaleId)}`,
          )
          return
        }

        if (sessionStorage.getItem(storageKey) === storedSaleId) {
          sessionStorage.removeItem(storageKey)
        }
        setIsRecoveringActiveSale(false)
      })
      .catch(() => {
        if (!active) return
        if (sessionStorage.getItem(storageKey) === storedSaleId) {
          sessionStorage.removeItem(storageKey)
        }
        setIsRecoveringActiveSale(false)
      })

    return () => {
      active = false
    }
  }, [saleId, serialNumber, router])

  useEffect(() => {
    if (!saleId || saleLoading) return
    if (saleError || error || publicSale?.status === 'CANCELLED') {
      const storageKey = `firespot-active-sale:${serialNumber}`
      if (sessionStorage.getItem(storageKey) === saleId) {
        sessionStorage.removeItem(storageKey)
      }
      router.replace(customerExitPath)
    }
  }, [
    saleId,
    saleLoading,
    saleError,
    error,
    publicSale?.status,
    serialNumber,
    customerExitPath,
    router,
  ])

  const qrCodeRef = useRef<HTMLDivElement>(null)
  const [brandedSvg, setBrandedSvg] = useState<string | null>(null)

  useEffect(() => {
    if (!error && merchant) {
      queueMicrotask(() => setBrandedSvg(null))
      return
    }

    const timer = setTimeout(() => {
      const svgElement = qrCodeRef.current?.querySelector('svg')
      if (!svgElement) return

      const svgString = new XMLSerializer().serializeToString(svgElement)
      const branded = applyBrandingToSVG(
        svgString,
        GRADIENT_START,
        GRADIENT_END,
        null,
        0,
      )
      setBrandedSvg(branded)
    }, 100)

    return () => clearTimeout(timer)
  }, [error, merchant])

  const trackCopyEvent = async (
    accountNumber: string,
    bankName: string,
    sourceBankName?: string,
  ) => {
    const isFirstCopy = !hasCopyBeenRecorded
    if (isFirstCopy) {
      setHasCopyBeenRecorded(true)
      recordCopy.mutate(
        { serialNumber, accountNumber, bankName },
        {
          onError: (err) => {
            console.error('Failed to record copy event:', err)
          },
        },
      )

      // Dynamic QR: link this merchant-initiated sale to the logged-in payer so
      // it appears in their Activity once confirmed. No-op when logged out.
      if (saleId && authUser?.id) {
        claimSalePayer.mutate({ saleId })
      }
    }

    if (saleId) {
      try {
        await recordSaleCopy.mutateAsync({
          saleId,
          serialNumber,
          targetBankName: bankName,
          targetAccountNumber: accountNumber,
          sourceBankName,
        })
      } catch (error) {
        console.error('Failed to persist transfer selection:', error)
      }
    }
  }

  if (
    (isEnteringWaiting && !saleId) ||
    isRecoveringActiveSale ||
    isLoading ||
    (saleId &&
      (saleLoading ||
        saleError ||
        error ||
        !publicSale ||
        publicSale.status === 'CANCELLED'))
  ) {
    if (isReturningFromPaystack) {
      return (
        <PaystackWaitingScreen
          onMinimize={() => router.replace(customerExitPath)}
        />
      )
    }
    return <LoadingPage innerBg="#FFFFFF" />
  }

  if (error || !merchant) {
    return (
      <div className="h-dvh bg-white overflow-hidden">
        <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi overflow-y-auto relative">
          <header className="sticky top-0 w-full z-50 mb-1 bg-white flex items-center justify-between px-4 py-2">
            <div className="flex-1" />
            <div className="flex flex-col items-center">
              <h1 className="text-base font-bold text-black">
                Firespot QR kit detected
              </h1>
              <p className="text-xs font-medium text-[#6B7280]">
                Serial Number : {serialNumber}
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <Link
                href="/"
                className="w-10 h-10 flex items-center justify-center"
              >
                <X size={24} strokeWidth={2} />
              </Link>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center px-4 pb-30">
            <div
              style={{
                background:
                  'radial-gradient(circle at top center, rgba(255, 94, 0) -25%, rgba(0, 0, 0) 40%)',
                backdropFilter: 'blur(125.30880737304688px)',
              }}
              className="p-4 rounded-[12px] flex flex-col items-center relative w-full max-w-75 mb-5"
            >
              <h3 className="text-white text-center font-bold font-sofia-pro text-xl leading-none -tracking-[0.4px]">
                SCAN TO TRANSFER
                <br />
                <span className="bg-linear-to-r from-[#FB5012] to-[#D72483] text-transparent bg-clip-text">
                  IN UNDER A MINUTE
                </span>
              </h3>

              <p className="text-[#FFFFFF99] font-sofia-pro text-center text-[8.7px] font-medium mb-2">
                Scan with your camera, send from any bank
              </p>

              <div className="rounded-xl relative mb-3">
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
                  className="rounded-[12px] p-1"
                  style={{
                    background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                  }}
                >
                  <div className="relative rounded-[10px] bg-white p-4">
                    {brandedSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: brandedSvg }}
                        className="h-40 w-40 overflow-hidden rounded-[6px] [&>svg]:h-full [&>svg]:w-full"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[6px]">
                        <QRCodeSVG
                          value="https://lite.firespot.co"
                          size={180}
                          level="H"
                          includeMargin={false}
                          className="h-full w-full"
                        />
                      </div>
                    )}

                    <div ref={qrCodeRef} className="hidden">
                      <QRCodeSVG
                        value="https://lite.firespot.co"
                        size={192}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-3 w-full gap-1 px-10">
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
                    lite.firespot.co
                  </p>
                  <Image
                    src="/images/world.png"
                    alt="world"
                    width={8.8}
                    height={8.8}
                  />
                </div>
              </div>

              <div className="flex justify-between -mx-10 w-full items-center">
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

            <div className="flex items-center gap-2 px-4 py-1 rounded-full border border-[#E5E7EB] bg-white mb-5">
              <div className="w-2 h-2 rounded-full bg-[#6B7280]" />
              <span className="text-sm text-[#6B7280] font-medium leading-none">
                Unassigned
              </span>
            </div>

            <h2 className="text-[28px] leading-none -tracking-[0.4px] font-bold text-black text-center mb-2">
              Claim this QR kit
            </h2>

            <p className="text-[#00000080] font-medium text-center text-sm max-w-75 mb-3">
              This QR kit is not assigned to any business yet. Start receiving
              transfers in under a minute without calling it out repeatedly.
            </p>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-[#F1F1F1] bg-white p-4 pb-6 rounded-t-[32px]">
            <div className="max-w-125 mx-auto">
              <Button asChild className="w-full">
                <Link
                  href={
                    authUser?.role === 'merchant'
                      ? `/activate?serial=${encodeURIComponent(serialNumber)}`
                      : `/onboarding/merchant/start?serial=${encodeURIComponent(serialNumber)}`
                  }
                >
                  {authUser?.role === 'merchant'
                    ? 'Activate this QR kit'
                    : 'Login and activate this QR kit'}
                </Link>
              </Button>

              <a
                href=""
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-xs text-[#878F98] font-medium flex items-center justify-center gap-0.5 mt-4 underline underline-offset-4"
              >
                Learn more about Firespot QR kits
                <ArrowUpRight className="w-3 h-3 text-[#878F98]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dynamic QR sale: stepped payment experience (request -> waiting -> success)
  if (saleId && publicSale) {
    return (
      <SalePaymentFlow
        sale={publicSale}
        merchant={merchant}
        serialNumber={serialNumber}
        onTrackCopy={trackCopyEvent}
      />
    )
  }

  const sortedBankAccounts = sortBankAccounts(
    merchant.bankAccounts,
  ) as BankAccount[]
  const paystackChannels = merchant.paystackCollectionChannels || []
  const effectiveSelectedChannel = paystackChannels.includes(selectedChannel)
    ? selectedChannel
    : paystackChannels[0] || selectedChannel
  const bankAccount =
    sortedBankAccounts[selectedBankIndex] || sortedBankAccounts[0]
  const purchaseTotal = purchaseItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const purchaseSaleItems = purchaseItems.map((item) => ({
    productId: item.id.split('-')[0],
    productName: item.name,
    productDescription: item.description,
    productImageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    selectedVariant: item.selectedVariant,
  }))

  const handleOpenBankDrawer = () => {
    if (
      !merchant ||
      !merchant.bankAccounts ||
      merchant.bankAccounts.length === 0
    ) {
      return
    }

    openDrawer({
      type: 'select-bank',
      direction: 'bottom',
      props: {
        bankAccounts: sortedBankAccounts,
        onSelectBank: (bank: BankAccount) => {
          const index = sortedBankAccounts.findIndex(
            (acc) => acc.accountNumber === bank.accountNumber,
          )
          if (index !== -1) {
            setSelectedBankIndex(index)
            usePurchaseCartStore.getState().setSelectedBankIndex(index)
            if (
              useDrawerStore
                .getState()
                .configs.some(
                  (config) => config.type === 'pay-current-purchase',
                )
            ) {
              openCurrentPurchase()
            }
          }
        },
      },
    })
  }

  const handleOpenPaymentMethodDrawer = () => {
    if (!merchant?.hasPaystackCollection) {
      handleOpenBankDrawer()
      return
    }

    openDrawer({
      type: 'rail-picker',
      direction: 'bottom',
      props: {
        hasSavedCards,
        selectedRail: usePurchaseCartStore.getState().selectedRail,
        paystackChannels,
        onSelectRail: (rail: PaymentRail) => {
          setSelectedRail(rail)
          usePurchaseCartStore.getState().setSelectedRail(rail)
          if (
            rail === 'multiple' &&
            !paystackChannels.includes(selectedChannel) &&
            paystackChannels[0]
          ) {
            setSelectedChannel(paystackChannels[0])
          }
          if (
            useDrawerStore
              .getState()
              .configs.some((config) => config.type === 'pay-current-purchase')
          ) {
            openCurrentPurchase(rail)
          }
        },
      },
    })
  }

  function startPaystackPayment(
    amount: number,
    description: string,
    channel: string,
  ) {
    if (amount <= 0) {
      showNotificationToast({
        message: 'Enter an amount first',
        duration: 2000,
      })
      return
    }

    if (createPaystackCollectSale.isPending || isRedirectingToPaystack) return

    let fingerprint = localStorage.getItem('firespot_customer_fingerprint')
    if (!fingerprint) {
      fingerprint =
        crypto.randomUUID?.() ||
        `fs_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem('firespot_customer_fingerprint', fingerprint)
    }

    const payerName =
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
      undefined

    closeAllDrawers()
    startPaystackRedirect()
    createPaystackCollectSale.mutate(
      {
        serialNumber,
        amount,
        description,
        channel,
        customerFingerprint: fingerprint,
        customerName: payerName,
        items: purchaseSaleItems.length > 0 ? purchaseSaleItems : undefined,
      },
      {
        onSuccess: (res) => {
          if (res.authorizationUrl) {
            clearPurchase()
            window.location.href = res.authorizationUrl
          } else {
            cancelPaystackRedirect()
            showNotificationToast({
              message: 'Failed to start payment. Please try again.',
              mode: 'error',
            })
          }
        },
        onError: (err: unknown) => {
          cancelPaystackRedirect()
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Failed to start payment. Please try again.'
          showNotificationToast({
            message: msg,
            mode: 'error',
          })
        },
      },
    )
  }

  function handlePayInstantly(amount: number, description: string) {
    if (amount <= 0) {
      showNotificationToast({
        message: 'Enter an amount first',
        duration: 2000,
      })
      return
    }

    if (
      createPaystackCollectSale.isPending ||
      createPendingSale.isPending ||
      payWithSavedCard.isPending ||
      isRedirectingToPaystack
    )
      return

    if (selectedRail === 'saved') {
      const cardToUse = defaultSavedCard
      if (!cardToUse) {
        showNotificationToast({
          message: 'No saved card found. Please choose another payment method.',
          mode: 'error',
        })
        return
      }

      if (!merchant) return

      closeAllDrawers()
      createPendingSale.mutate(
        {
          merchantId: merchant.id,
          customerFingerprint: getCustomerFingerprint(),
          serialNumber,
          amount,
          description,
          targetBankName: bankAccount?.bankName,
          items: purchaseSaleItems.length > 0 ? purchaseSaleItems : undefined,
        },
        {
          onSuccess: (pendingSale) => {
            clearPurchase()
            payWithSavedCard.mutate(
              {
                saleId: pendingSale._id,
                cardId: cardToUse.id,
              },
              {
                onSuccess: () => {
                  router.push(`/pay/${serialNumber}?saleId=${pendingSale._id}`)
                },
                onError: (err: unknown) => {
                  const msg =
                    (err as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message ||
                    'Payment failed. Please try again.'
                  showNotificationToast({
                    message: msg,
                    mode: 'error',
                  })
                },
              },
            )
          },
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ||
              'Failed to start payment. Please try again.'
            showNotificationToast({
              message: msg,
              mode: 'error',
            })
          },
        },
      )
      return
    }

    if (paystackChannels.length === 0) {
      showNotificationToast({
        message: 'No instant payment method is currently available.',
        mode: 'error',
      })
      return
    }

    openDrawer({
      type: 'channel-picker',
      direction: 'bottom',
      props: {
        selectedChannel: effectiveSelectedChannel,
        availableChannels: paystackChannels,
        onSelectChannel: (channelId: string) => {
          setSelectedChannel(channelId)
          startPaystackPayment(amount, description, channelId)
        },
      },
    })
  }

  // Payer enters an amount, copies the account, and hands off to the shared
  // waiting/confirmation flow via ?saleId (the pending sale we just created).
  const handlePayAmountCopy = (amount: number, description: string) => {
    if (!bankAccount || createPendingSale.isPending) return Promise.resolve()

    const { accountNumber, bankName } = bankAccount
    void navigator.clipboard.writeText(accountNumber).catch(() => {
      showNotificationToast({
        message: 'Could not copy the account number. Copy it on the next screen.',
        mode: 'error',
      })
    })

    let fingerprint = localStorage.getItem('firespot_customer_fingerprint')
    if (!fingerprint) {
      fingerprint =
        crypto.randomUUID?.() ||
        `fs_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem('firespot_customer_fingerprint', fingerprint)
    }

    // If a logged-in personal account is paying, attach their name so the
    // merchant sees it instead of "New".
    const payerName =
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
      undefined

    return new Promise<void>((resolve) => {
      createPendingSale.mutate(
        {
          merchantId: merchant.id,
          amount,
          description,
          customerFingerprint: fingerprint,
          customerName: payerName,
          source: window.location.search.includes('shared=true')
            ? 'Link shared'
            : 'QR scan',
          targetBankName: bankName,
          serialNumber,
          items: purchaseSaleItems.length > 0 ? purchaseSaleItems : undefined,
        },
        {
          onSuccess: (sale: { _id?: string }) => {
            const newSaleId = sale?._id
            if (!newSaleId) {
              showNotificationToast({
                message: 'Failed to start payment. Please try again.',
                mode: 'error',
              })
              resolve()
              return
            }

            const continueToWaiting = () => {
              recordCopy.mutate({ serialNumber, accountNumber, bankName })
              // Mark copied so the flow resumes at "waiting", then hand off.
              recordSaleCopy.mutate(
                {
                  saleId: newSaleId,
                  serialNumber,
                  targetBankName: bankName,
                  targetAccountNumber: accountNumber,
                },
                {
                  onSettled: () => {
                    setIsEnteringWaiting(true)
                    router.replace(`/pay/${serialNumber}?saleId=${newSaleId}`)
                    closeAllDrawers()
                    clearPurchase()
                    resolve()
                  },
                },
              )
            }

            if (authUser?.id) {
              claimSalePayer.mutate(
                { saleId: newSaleId },
                { onSettled: continueToWaiting },
              )
            } else {
              continueToWaiting()
            }
          },
          onError: () => {
            showNotificationToast({
              message: 'Failed to start payment. Please try again.',
              mode: 'error',
            })
            resolve()
          },
        },
      )
    })
  }

  function openCurrentPurchase(
    rail = usePurchaseCartStore.getState().selectedRail,
  ) {
    const currentBankIndex = usePurchaseCartStore.getState().selectedBankIndex
    const currentAccount =
      sortedBankAccounts[currentBankIndex] || sortedBankAccounts[0]
    openDrawer({
      type: 'pay-current-purchase',
      direction: 'bottom',
      props: {
        merchant,
        account: currentAccount,
        selectedRail: rail,
        savedCard: rail === 'saved' ? defaultSavedCard : undefined,
        onChangePaymentMethod: handleOpenPaymentMethodDrawer,
        onPay: handlePurchasePay,
      },
    })
  }

  const handleOpenCatalogue = () => {
    openDrawer({
      type: 'pay-catalogue',
      direction: 'bottom',
      props: {
        merchant,
        onCheckout: openCurrentPurchase,
      },
    })
  }

  function handlePurchasePay() {
    const currentItems = usePurchaseCartStore.getState().items
    const total = currentItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )
    const description = currentItems
      .map((item) =>
        item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
      )
      .join(', ')
    if (
      merchant?.hasPaystackCollection &&
      ['multiple', 'saved'].includes(
        usePurchaseCartStore.getState().selectedRail,
      )
    ) {
      return handlePayInstantly(total, description)
    } else {
      return handlePayAmountCopy(total, description)
    }
  }

  if (isRedirectingToPaystack) {
    return <PaystackRedirectingScreen />
  }

  return (
    <SalePayAmountScreen
      merchant={merchant}
      account={bankAccount}
      onChangeAccount={handleOpenBankDrawer}
      onChangePaymentMethod={handleOpenPaymentMethodDrawer}
      selectedRail={selectedRail}
      selectedItemsCount={purchaseItems.length}
      selectedItemsTotal={purchaseTotal}
      onSelectItems={handleOpenCatalogue}
      onCopy={handlePayAmountCopy}
      onPayInstantly={handlePayInstantly}
      onShare={() => {
        openDrawer({
          type: 'share-transfer',
          props: {
            businessName: merchant.businessName,
            serialNumber,
            businessImageUrl:
              merchant.businessImageUrl || merchant.profilePhotoUrl,
          },
        })
      }}
      onClose={() => router.push('/')}
      isSubmitting={
        createPendingSale.isPending ||
        createPaystackCollectSale.isPending ||
        payWithSavedCard.isPending ||
        recordSaleCopy.isPending
      }
      savedCard={selectedRail === 'saved' ? defaultSavedCard : undefined}
    />
  )
}
