'use client'

import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSales, useSalesStats, useCancelSale } from '@/services/sales/hooks'
import { SwipeableItem } from '@/components/recents/SwipeableItem'
import { getBankLogo } from '@/lib/utils/bank-account'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'

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

  const handleCancel = (saleId: string) => {
    toast.promise(cancelSaleMutation.mutateAsync(saleId), {
      loading: 'Cancelling record...',
      success: 'Record cancelled',
      error: 'Failed to cancel record',
    })
  }

  const handleConfirm = (saleId: string) => {
    router.push(`/record-sale?id=${saleId}`)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return format(new Date(dateString), "MMM d, yyyy '·' h:mm a")
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="h-dvh bg-[#f4f6f8] px-3 shadow-xl overflow-y-auto pb-10">
      <header className="py-3.5 px-1 flex justify-between items-center">
        <Link href="/profile" className="p-1">
          <ArrowLeft color="black" strokeWidth={2} size={24} />
        </Link>
        <div className="w-6"></div>
        <div className="w-6"></div>
      </header>

      <h2 className="text-[32px] leading-none font-bold text-black -tracking-[0.4px] mb-6 mt-2">
        Recent
      </h2>

      {/* Stats Card */}
      <div className="border border-[#F4F6F8] px-4 py-4 bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] w-full flex justify-between items-center mb-6 shrink-0">
        <div className="w-full">
          <div className="flex items-center gap-1 mb-2 justify-between w-full">
            <span className="text-[#00000066] text-xs font-medium">
              Total sales recorded today
            </span>
            <span
              className={cn(
                'text-xs font-bold',
                (stats?.todaySalesAmount ?? 0) > 0
                  ? 'text-[#24C166]'
                  : 'text-[#00000066]',
              )}
            >
              {(stats?.todaySalesAmount ?? 0) > 0 ? '+' : ''}NGN{' '}
              {formatCurrency(stats?.todaySalesAmount ?? 0)}
            </span>
          </div>
          <div className="flex items-end gap-1.5">
            <h3 className="font-bold text-[22px] tracking-tight leading-none text-black">
              ₦ {formatCurrency(stats?.todaySalesAmount ?? 0)}
            </h3>
          </div>
        </div>
      </div>

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
            pendingData.data.map((sale: any) => (
              <SwipeableItem
                key={sale._id}
                onConfirm={() => handleConfirm(sale._id)}
                onCancel={() => handleCancel(sale._id)}
              >
                <div className="p-3 border-b border-[#F1F1F1] last:border-b-0 bg-white cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform">
                          <Image
                            src="/images/default_avatar.png"
                            alt="user"
                            width={36}
                            height={36}
                          />
                        </div>
                        <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-[4.4px] border border-white bg-white">
                          <Image
                            src={getBankLogo(sale.targetBankName)}
                            alt="bank"
                            className="rounded-[4.4px] object-cover"
                            width={16}
                            height={16}
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827] mb-0.5">
                          {sale.customerType || 'New'} customer
                        </h4>
                        <p className="text-[#6B7280] text-[11px] font-medium uppercase tracking-tight">
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <p className="text-[14px] font-bold text-[#111827] mb-0.5">
                          {sale.amount
                            ? `₦${formatCurrency(sale.amount)}`
                            : 'Enter amount'}
                        </p>
                        <span className="text-[11px] font-medium text-[#D97706]">
                          From {sale.source || 'QR kit scan'}
                        </span>
                      </div>
                      <ChevronRight className="text-[#9CA3AF]" size={18} />
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            ))
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
            className="text-[#6B7280] text-[14px] font-medium w-full text-center py-3 hover:text-black transition-colors block border-t border-[#F1F1F1]"
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
            confirmedData.data.map((sale: any) => (
              <div
                key={sale._id}
                className="cursor-pointer p-3 border-b border-[#F1F1F1] last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform">
                        <Image
                          src="/images/default_avatar.png"
                          alt="user"
                          width={36}
                          height={36}
                        />
                      </div>
                      <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-[4.4px] border border-white bg-white">
                        <Image
                          src={getBankLogo(sale.targetBankName)}
                          alt="bank"
                          className="rounded-[4.4px] object-cover"
                          width={16}
                          height={16}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#111827] mb-0.5">
                        {sale.customerType || 'New'} customer
                      </h4>
                      <p className="text-[#6B7280] text-[11px] font-medium uppercase tracking-tight">
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <p className="text-[14px] font-bold text-[#111827] mb-0.5">
                        ₦{formatCurrency(sale.amount || 0)}
                      </p>
                      <span className="text-[11px] font-medium text-[#24C166]">
                        {sale.paymentMethod || 'Paid'}
                      </span>
                    </div>
                    <ChevronRight className="text-[#9CA3AF]" size={18} />
                  </div>
                </div>
              </div>
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
