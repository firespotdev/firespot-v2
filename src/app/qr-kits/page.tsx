'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, CirclePlus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { LoaderCircle } from '@/components/ui'
import { useUserQRKits } from '@/services/qr'
import Image from 'next/image'

export default function QRKitsPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: qrKitsData, isLoading } = useUserQRKits()

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
      <div className="min-h-dvh bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  const qrKits = qrKitsData?.data || []

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="max-w-[500px] mx-auto min-h-dvh flex flex-col font-satoshi">
        <header className="flex items-center py-4 px-4 sticky top-0 z-10 bg-[#F4F6F8]">
          <Link href="/profile">
            <ArrowLeft className="w-6 h-6 text-black" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold text-black">
            Manage QR kits
          </h1>
          <Link href="/activate" className="w-10 flex justify-end">
            <Plus className="w-6 h-6 text-black" />
          </Link>
        </header>

        {/* QR Kits List */}
        <div className="flex-1 px-4 pt-2">
          {qrKits.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-[#00000080] font-medium text-sm">
                No QR kits found
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden">
              {qrKits.map((qrKit, index) => {
                const isActive = qrKit.activationStatus === 'activated'
                const statusText = isActive ? 'Active' : 'Inactive'

                return (
                  <Link
                    key={qrKit._id}
                    href={`/qr-kits/${qrKit._id}`}
                    className="w-full flex items-center gap-3 p-3 border-b border-[#F1F1F1] last:border-b-0 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-linear-to-br from-[#FB5012] to-[#D72483]'
                          : 'bg-[#F1F1F1]'
                      }`}
                    >
                      <Image
                        src={
                          isActive
                            ? '/icons/qr_white.svg'
                            : '/icons/qr_black.svg'
                        }
                        alt="QR"
                        width={16}
                        height={16}
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-bold text-[#111827]">
                        {qrKit.name || qrKit.serialNumber || `QR kit ${index + 1}`}
                      </p>
                      <p className="text-xs font-medium text-[#6B7280] mt-0.5">
                        {statusText}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-[#9CA3AF] shrink-0" />
                  </Link>
                )
              })}
              <Link
                href="/activate"
                className="flex items-center gap-3 px-4 py-3"
              >
                <CirclePlus
                  fill="#0075FF"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  size={24}
                />
                <span className="text-sm text-[#0075FF] font-bold">
                  Activate another QR kit
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
