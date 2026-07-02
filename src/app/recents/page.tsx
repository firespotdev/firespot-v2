'use client'

import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSales, useSalesStats, useCancelSale } from '@/services/sales/hooks'
import { SaleItem } from '@/components/sales/SaleItem'
import { formatCurrency, cn } from '@/lib/utils'
import { Sale } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import { showNotificationToast, StatBanner } from '@/components/ui'

export default function RecentsPage() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useSalesStats()
  const { data: pendingData, isLoading: pendingLoading } = useSales({
    status: 'PENDING',
    limit: '3',
  })
  const { data: confirmedData, isLoading: confirmedLoading } = useSales({
    status: 'CONFIRMED',
    limit: '3',
  })

  const cancelSaleMutation = useCancelSale()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const handleCancel = (saleId: string) => {
    openDrawer({
      type: 'confirm-cancel',
      props: {
        onConfirm: async () => {
          try {
            await cancelSaleMutation.mutateAsync(saleId)
            showNotificationToast({
              message: 'Sale cancelled',
            })
          } catch (error) {
            throw error
          }
        },
      },
    })
  }

  const handleConfirm = (saleId: string) => {
    router.push(`/record-sale?id=${saleId}`)
  }

  return (
    <div className="h-dvh bg-[#f4f6f8] px-3 shadow-xl overflow-y-auto pb-10">
      <header className="py-3.5 px-1 flex justify-between items-center">
        <Link href="/profile" className="p-1">
          <ArrowLeft color="black" strokeWidth={2} size={24} />
        </Link>
      </header>

      <h2 className="text-[32px] leading-none font-bold text-black -tracking-[0.4px] mb-6 mt-2">
        Recent
      </h2>

      <StatBanner
        label="Total sales recorded today"
        amount={stats?.todaySalesAmount ?? 0}
        badgeText={`${(stats?.todaySalesAmount ?? 0) > 0 ? '+' : ''}NGN ${formatCurrency(stats?.todaySalesAmount ?? 0)}`}
        badgePositive={(stats?.todaySalesAmount ?? 0) > 0}
        className="mb-6"
      />

      {/* Pending Sales Section */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-black">
          Waiting for confirmation
        </h3>
        <p className="text-xs font-medium text-[#00000066] mb-3">
          Swipe right to confirm, swipe left if the payment didn’t happen.{' '}
        </p>

        <div className="bg-white rounded-xl mb-4 overflow-hidden border border-[#F1F1F1]">
          {pendingData?.data && pendingData.data.length > 0 ? (
            pendingData.data.map((sale: Sale, index: number) => {
              const roundingClass = cn(
                index === 0 && 'rounded-t-xl',
                pendingData.data.length === 1 && 'rounded-xl',
              )

              return (
                <SaleItem
                  key={sale._id}
                  sale={sale}
                  isSwipeable={true}
                  onConfirm={() => handleConfirm(sale._id)}
                  onCancel={() => handleCancel(sale._id)}
                  onClick={() => handleConfirm(sale._id)}
                  className={roundingClass}
                />
              )
            })
          ) : (
            <div className="p-8 text-center text-[#6B7280] text-sm font-medium">
              {pendingLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
              ) : (
                'No pending records'
              )}
            </div>
          )}
          <Link
            href="/history?status=PENDING"
            className="text-[#6B7280] text-[14px] font-medium w-full text-center py-3 hover:text-black transition-colors block"
          >
            View all pending records
          </Link>
        </div>
      </div>

      {/* Recorded Sales Section */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold mb-3 text-black">
          Recorded sales
        </h3>

        <div className="bg-white rounded-xl mb-4 overflow-hidden border border-[#F1F1F1]">
          {confirmedData?.data && confirmedData.data.length > 0 ? (
            confirmedData.data.map((sale: Sale) => (
              <SaleItem key={sale._id} sale={sale} onClick={() => {}} />
            ))
          ) : (
            <div className="p-8 text-center text-[#6B7280] text-sm font-medium">
              {confirmedLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
              ) : (
                'No recorded sales yet'
              )}
            </div>
          )}
          <Link
            href="/history?status=CONFIRMED"
            className="text-[#6B7280] text-[14px] font-medium w-full text-center py-3 hover:text-black transition-colors block"
          >
            View all recorded sales
          </Link>
        </div>
      </div>

      <div className="mt-8 mb-6">
        <Link
          href="/history?status=CANCELLED"
          className="bg-white text-[#6B7280] border border-[#F1F1F1] text-[13px] font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors text-center flex items-center justify-center"
        >
          View cancelled attempts
        </Link>
      </div>
    </div>
  )
}
