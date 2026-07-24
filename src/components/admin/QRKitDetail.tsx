'use client'

import { useState, useEffect, useRef } from 'react'
import {
  useQRCodeSVG,
  useAssignQRKits,
  useReassignQRKits,
  useUnassignQRKits,
} from '@/services/qr'
import type { QRKit } from '@/services/qr'
import { applyBrandingToSVG } from '@/lib/utils/svg-branding'
import { downloadElementAsPDF } from '@/lib/utils/pdf-download'
import { formatCurrency } from '@/lib/utils'
import { useQRKitPricing } from '@/services/pricing/pricingApi'
import AgentSelect from './AgentSelect'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { adminToast } from './AdminToast'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface QRKitDetailProps {
  qrKit: QRKit
  onClose: () => void
}

function StatusBadge({
  status,
  type,
}: {
  status: string
  type: 'activation' | 'payment'
}) {
  const getStyles = () => {
    if (type === 'activation') {
      switch (status) {
        case 'activated':
          return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case 'deactivated':
          return 'bg-gray-100 text-gray-700 border-gray-200'
        default:
          return 'bg-amber-100 text-amber-700 border-amber-200'
      }
    } else {
      switch (status) {
        case 'successful':
          return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case 'failed':
          return 'bg-red-100 text-red-700 border-red-200'
        default:
          return 'bg-amber-100 text-amber-700 border-amber-200'
      }
    }
  }

  return (
    <span
      className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium capitalize ${getStyles()}`}
    >
      {status}
    </span>
  )
}

export default function QRKitDetail({ qrKit, onClose }: QRKitDetailProps) {
  const { data: svgData, isLoading } = useQRCodeSVG(qrKit.qrCodeSvgUrl)
  const { pricing } = useQRKitPricing()
  const [brandedSvg, setBrandedSvg] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const assignQRKits = useAssignQRKits()
  const reassignQRKits = useReassignQRKits()
  const unassignQRKits = useUnassignQRKits()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [showAssignSection, setShowAssignSection] = useState(false)
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)

  const currentAgentId =
    typeof qrKit.agentId === 'string'
      ? qrKit.agentId
      : qrKit.agentId?._id || null

  useEffect(() => {
    if (svgData) {
      const branded = applyBrandingToSVG(
        svgData,
        GRADIENT_START,
        GRADIENT_END,
        null,
        20,
      )
      setBrandedSvg(branded)
    }
  }, [svgData])

  const handleDownloadPDF = async () => {
    if (!cardRef.current || isDownloading) return

    setIsDownloading(true)
    try {
      await downloadElementAsPDF(cardRef.current, {
        filename: `firespot-qr-kit-${qrKit.serialNumber}.pdf`,
        scale: 3,
        backgroundColor: '#000000',
      })
      adminToast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Failed to download PDF:', error)
      adminToast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUnassign = async () => {
    try {
      await unassignQRKits.mutateAsync({
        qrKitIds: [qrKit._id],
      })
      setShowAssignSection(false)
      setSelectedAgentId(null)
      adminToast.success('QR kit unassigned successfully')
    } catch (error) {
      adminToast.error(
        error instanceof Error ? error.message : 'Failed to unassign QR kit',
      )
    }
  }

  const handleAssign = async () => {
    if (!selectedAgentId) {
      return
    }

    try {
      if (currentAgentId) {
        // Reassign from current agent to new agent
        await reassignQRKits.mutateAsync({
          fromAgentId: currentAgentId,
          toAgentId: selectedAgentId,
          qrKitIds: [qrKit._id],
        })
        adminToast.success('QR kit reassigned successfully')
      } else {
        // Assign to new agent
        await assignQRKits.mutateAsync({
          agentId: selectedAgentId,
          qrKitIds: [qrKit._id],
        })
        adminToast.success('QR kit assigned successfully')
      }
      setShowAssignSection(false)
      setSelectedAgentId(null)
    } catch (error) {
      adminToast.error(
        error instanceof Error ? error.message : 'Operation failed',
      )
    }
  }

  const isLoadingOperation =
    assignQRKits.isPending ||
    reassignQRKits.isPending ||
    unassignQRKits.isPending

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/10 backdrop-blur-sm transition-opacity">
        <div
          className="h-full w-full max-w-3xl animate-in slide-in-from-right bg-white shadow-2xl duration-300 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                QR Kit Details
              </h2>
              <p className="font-mono text-sm text-gray-500">
                {qrKit.serialNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  {isLoading ? (
                    <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-gray-100">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
                    </div>
                  ) : brandedSvg ? (
                    <div
                      ref={cardRef}
                      style={{
                        background:
                          'radial-gradient(circle at top center, rgba(255, 94, 0) -25%, rgba(0, 0, 0) 40%)',
                        backdropFilter: 'blur(125.30880737304688px)',
                      }}
                      className="py-6 px-6 rounded-2xl flex flex-col items-center relative w-full max-w-[300px]"
                    >
                      <h2 className="text-white text-center font-bold text-xl leading-none tracking-tight">
                        SCAN TO TRANSFER
                        <br />
                        <span className="bg-linear-to-r from-[#FB5012] to-[#D72483] text-transparent bg-clip-text">
                          IN UNDER A MINUTE
                        </span>
                      </h2>

                      <p className="text-[#FFFFFF99] text-center text-[8.7px] font-medium mb-3.5">
                        Scan with your camera, send from any bank
                      </p>

                      <div className="rounded-xl relative mb-4">
                        <svg
                          style={{ position: 'absolute', width: 0, height: 0 }}
                        >
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
                            <div
                              dangerouslySetInnerHTML={{ __html: brandedSvg }}
                              className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4 w-full gap-1 px-10">
                        <div className="bg-[#FFFFFF33] rounded-full px-1 flex justify-between items-center gap-1 w-1/2">
                          <p className="text-white text-[6px] pl-0.5">
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
                                viewBox="0 0 512.853 512.853"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M500.907,376.747c-64.853-11.093-93.867-75.947-97.28-83.627v-0.853c-3.413-6.827-4.267-11.947-2.56-16.213 c3.413-7.68,17.92-12.8,27.307-15.36c2.56-0.853,5.12-1.707,6.827-2.56c17.92-7.68,27.307-17.067,27.307-28.16 c0-8.533-6.827-17.067-17.067-20.48c-3.413-1.707-7.68-2.56-11.947-2.56c-2.56,0-6.827,0.853-11.093,2.56 c-8.533,3.413-15.36,5.973-20.48,5.973c-1.707,0-3.413,0-5.12-0.853c0.853-2.56,0.853-5.12,0.853-8.533v-1.707 c1.707-34.987,5.12-78.507-6.827-104.107c-34.987-76.8-107.52-82.773-128.853-82.773h-10.24c-21.333,0-93.867,5.973-128,82.773 c-11.947,25.6-9.387,69.12-6.827,104.107c0.853,3.413,0.853,6.827,0.853,10.24c-1.707,0-4.267,0.853-6.827,0.853 c-6.827,0-13.653-1.707-22.187-5.973c-11.947-5.12-34.987,2.56-37.547,17.92c-1.707,8.533,1.707,20.48,27.307,30.72 c1.707,0.853,4.267,1.707,7.68,2.56c8.533,2.56,23.04,7.68,26.453,15.36c1.707,3.413,0.853,9.387-2.56,16.213 c-1.707,2.56-31.573,71.68-98.987,82.773C4.267,376.747,0,382.72,0,389.547c0,2.56,0.853,4.267,1.707,5.973 c5.12,13.653,27.307,22.187,67.413,29.013c0.853,2.56,1.707,7.68,2.56,10.24c0.853,3.413,1.707,7.68,2.56,11.947 c0.853,4.267,5.12,11.093,15.36,11.093c3.413,0,7.68-0.853,11.947-1.707c6.827-1.707,15.36-3.413,26.453-3.413 c6.827,0,12.8,0.853,19.627,2.56c11.947,1.707,23.04,9.387,34.987,17.92c17.92,12.8,34.133,22.187,67.413,22.187 c0.853,0,1.707,0,2.56,0s2.56,0,3.413,0c29.013,0,54.613-7.68,76.8-22.187c11.947-7.68,23.04-16.213,34.987-17.92 c5.973-0.853,12.8-1.707,18.773-1.707c10.24,0,18.773,0.853,26.453,2.56c5.12,0.853,9.387,1.707,12.8,1.707 c6.827,0,12.8-4.267,14.507-11.093c0.853-4.267,1.707-7.68,2.56-11.947c0.853-1.707,1.707-6.827,2.56-9.387 c40.107-5.973,59.733-15.36,65.707-28.16c0.853-1.707,1.707-4.267,1.707-5.973C512.853,384.427,507.733,377.6,500.907,376.747z M440.32,408.32c-10.24,0.853-11.947,11.093-14.507,22.187c-0.853,2.56-1.707,5.973-2.56,9.387c-1.707,0-4.267,0-8.533-0.853 c-8.533-1.707-17.92-3.413-29.867-3.413c-6.827,0-13.653,0.853-21.333,1.707c-15.36,2.56-29.013,11.947-41.813,21.333 C302.933,472.32,281.6,478.293,256,478.293c-0.853,0-1.707,0-3.413,0c-0.231,0-0.445,0-0.64,0c-0.073,0-0.146,0-0.213,0 c-28.16,0-41.813-8.533-58.027-19.627c-12.8-9.387-25.6-18.773-41.813-21.333c-6.827-0.853-14.507-1.707-21.333-1.707 c-12.8,0-23.04,1.707-29.867,3.413c-3.413,0.853-5.973,1.707-8.533,1.707c-0.853-3.413-1.707-6.827-2.56-10.24 c-2.56-11.093-4.267-21.333-14.507-23.04c-37.547-5.12-50.347-12.8-54.613-16.213c69.973-14.507,102.4-82.773,106.667-92.16 c5.12-11.093,5.973-21.333,2.56-29.867c-6.827-15.36-25.6-21.333-37.547-24.747c-2.56,0-4.267-0.853-5.973-1.707 C71.68,236.8,69.12,231.68,69.12,230.827c0-2.56,5.973-5.973,11.093-5.973c1.707,0,2.56,0,2.56,0 c10.24,5.12,20.48,7.68,29.013,7.68c12.8,0,19.627-5.973,21.333-7.68s2.56-3.413,2.56-5.973c0-5.12-0.853-10.24-0.853-15.36 c-2.56-33.28-5.12-74.24,5.12-96.427c29.867-67.413,93.867-72.533,112.64-72.533h8.533h0.853c18.773,0,82.773,5.12,113.493,70.827 c9.387,22.187,6.827,63.147,5.12,96.427v1.707c0,5.12-0.853,9.387-0.853,13.653c0,2.56,0.853,5.12,2.56,6.827 c1.707,1.707,7.68,6.827,20.48,7.68c8.533-0.853,17.067-3.413,27.307-7.68c1.707-0.853,5.973-0.853,9.387,0.853 c4.267,1.707,5.973,4.267,5.973,5.12c0,1.707-3.413,6.827-17.067,11.947c-1.707,0.853-4.267,1.707-6.827,2.56 c-11.093,3.413-29.867,9.387-36.693,24.747c-4.267,8.533-2.56,18.773,2.56,29.867c3.413,8.533,34.987,78.507,105.813,93.013 C488.96,395.52,477.013,402.347,440.32,408.32z" />
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
                                    id="chromeGrad"
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
                                  fill="url(#chromeGrad)"
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
                          <p className="text-white text-[6px]">
                            <span className="text-[#FFFFFF80]">or go to </span>
                            pay.firespot.co
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/images/world.png"
                            alt="world"
                            width={8.8}
                            height={8.8}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between w-full items-center mt-6 px-2">
                        <div className="flex items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/icons/firespot_logo.svg"
                            alt="Firespot"
                            width={12}
                            height={12}
                          />
                          <span className="text-white text-[8px] font-medium ml-1">
                            firespot
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <span className="font-medium text-[#FFFFFF80] tracking-tight text-[5.81px]">
                            Powered by Firespot
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      No QR code available
                    </div>
                  )}

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading || !brandedSvg}
                    className="mt-4 w-full rounded-2xl bg-black text-center px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <span className="inline-block font-medium">
                        Download PDF
                      </span>
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Agent Assignment
                  </h3>

                  {showAssignSection ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {currentAgentId
                            ? 'Reassign to Agent'
                            : 'Assign to Agent'}
                        </label>
                        <AgentSelect
                          value={selectedAgentId}
                          onChange={setSelectedAgentId}
                          placeholder="Select an agent"
                          disabled={isLoadingOperation}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAssign}
                          disabled={isLoadingOperation || !selectedAgentId}
                          className="flex-1 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingOperation
                            ? 'Processing...'
                            : currentAgentId
                              ? 'Reassign'
                              : 'Assign'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAssignSection(false)
                            setSelectedAgentId(null)
                          }}
                          disabled={isLoadingOperation}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {qrKit.agentId ? (
                        <dl className="space-y-2">
                          {typeof qrKit.agentId === 'string' ? (
                            <div>
                              <dt className="text-xs text-gray-400">
                                Agent ID
                              </dt>
                              <dd className="font-mono text-sm text-gray-900">
                                {qrKit.agentId}
                              </dd>
                            </div>
                          ) : (
                            <>
                              <div>
                                <dt className="text-xs text-gray-400">Name</dt>
                                <dd className="text-sm font-medium text-gray-900">
                                  {qrKit.agentId.name}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-gray-400">
                                  Agent ID
                                </dt>
                                <dd className="font-mono text-sm text-gray-900">
                                  {qrKit.agentId.agentId}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-gray-400">Phone</dt>
                                <dd className="text-sm text-gray-900">
                                  {qrKit.agentId.phoneNumber}
                                </dd>
                              </div>
                              {(qrKit.agentId.state ||
                                qrKit.agentId.lga ||
                                qrKit.agentId.bustop) && (
                                <div>
                                  <dt className="text-xs text-gray-400">
                                    Location
                                  </dt>
                                  <dd className="text-sm text-gray-900">
                                    {[
                                      qrKit.agentId.state,
                                      qrKit.agentId.lga,
                                      qrKit.agentId.bustop,
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </dd>
                                </div>
                              )}
                            </>
                          )}
                          {qrKit.assignedToAgentAt && (
                            <div>
                              <dt className="text-xs text-gray-400">
                                Assigned At
                              </dt>
                              <dd className="text-sm text-gray-900">
                                {formatDate(qrKit.assignedToAgentAt)}
                              </dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No agent assigned
                        </p>
                      )}

                      {!showAssignSection && (
                        <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
                          {currentAgentId && (
                            <>
                              <button
                                onClick={() => setShowAssignSection(true)}
                                disabled={isLoadingOperation}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => setShowUnassignConfirm(true)}
                                disabled={isLoadingOperation}
                                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Unassign
                              </button>
                            </>
                          )}
                          {!currentAgentId && (
                            <button
                              onClick={() => setShowAssignSection(true)}
                              disabled={isLoadingOperation}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Assign Agent
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <div>
                      <p className="mb-1 text-xs text-gray-400">Activation</p>
                      <StatusBadge
                        status={qrKit.activationStatus}
                        type="activation"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-gray-400">Payment</p>
                      <StatusBadge
                        status={qrKit.paymentStatus}
                        type="payment"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-gray-400">Link</p>
                      {qrKit.linkStatus ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            qrKit.linkStatus === 'linked'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {qrKit.linkStatus}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-gray-400">Serial Number</dt>
                      <dd className="font-mono text-sm font-medium text-gray-900">
                        {qrKit.serialNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Type</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {qrKit.isDigital ? 'Digital' : 'Physical'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Source</dt>
                      <dd className="text-sm font-medium capitalize text-gray-900">
                        {qrKit.source?.replace('-', ' ') || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">
                        Activation Amount
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {pricing.activationAmount === 0
                          ? 'Free'
                          : `₦${formatCurrency(pricing.activationAmount)}`}
                      </dd>
                    </div>
                    {qrKit.merchantId && (
                      <div>
                        <dt className="text-xs text-gray-400">Merchant</dt>
                        <dd className="text-sm text-gray-900">
                          {typeof qrKit.merchantId === 'string' ? (
                            <span className="font-mono">
                              {qrKit.merchantId}
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {qrKit.merchantId.businessName && (
                                <p className="font-medium">
                                  {qrKit.merchantId.businessName}
                                </p>
                              )}
                              {qrKit.merchantId.merchantSlug && (
                                <p className="font-mono text-xs text-gray-500">
                                  Slug: {qrKit.merchantId.merchantSlug}
                                </p>
                              )}
                              {qrKit.merchantId.phoneNumber && (
                                <p className="text-xs text-gray-500">
                                  {qrKit.merchantId.phoneNumber}
                                </p>
                              )}
                              <p className="font-mono text-xs text-gray-400">
                                ID: {qrKit.merchantId._id}
                              </p>
                            </div>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Timestamps
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-gray-400">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(qrKit.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Last Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(qrKit.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showUnassignConfirm}
        onOpenChange={setShowUnassignConfirm}
        title="Unassign QR Kit"
        description="Are you sure you want to unassign this QR kit from the agent? This action can be undone by reassigning the kit later."
        confirmLabel="Unassign"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleUnassign}
        isLoading={unassignQRKits.isPending}
      />
    </>
  )
}
