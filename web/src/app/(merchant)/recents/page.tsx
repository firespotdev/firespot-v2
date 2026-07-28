'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, Plus, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSales, useSalesStats, useCancelSale } from '@/services/sales/hooks'
import { SaleItem } from '@/components/sales/SaleItem'
import { cn, formatCurrency } from '@/lib/utils'
import type { Sale } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import {
  EmptyState,
  showNotificationToast,
  StatBanner,
  TabSwitch,
} from '@/components/ui'
import { useUserProfile } from '@/services/users'
import { useUserQRKits } from '@/services/qr'

type RecentTab = 'unconfirmed' | 'confirmed'

const TAB_OPTIONS = [
  { label: 'UNCONFIRMED', value: 'unconfirmed' },
  { label: 'CONFIRMED', value: 'confirmed' },
] satisfies Array<{ label: string; value: RecentTab }>

export default function RecentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RecentTab>('unconfirmed')
  const { data: stats, isLoading: statsLoading } = useSalesStats({
    preset: 'today',
  })
  const { data: pendingData, isLoading: pendingLoading } = useSales({
    status: 'PENDING',
    limit: '4',
  })
  const { data: confirmedData, isLoading: confirmedLoading } = useSales({
    status: 'RECORDED',
    limit: '4',
  })
  const { data: profile } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()

  const cancelSaleMutation = useCancelSale()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const pendingSales = pendingData?.data || []
  const confirmedSales = confirmedData?.data || []
  const activeSales =
    activeTab === 'unconfirmed' ? pendingSales : confirmedSales
  const isLoading =
    activeTab === 'unconfirmed' ? pendingLoading : confirmedLoading
  const metricLabel =
    activeTab === 'unconfirmed'
      ? 'Total unconfirmed sales'
      : 'Total sales confirmed today'
  const metricAmount =
    activeTab === 'unconfirmed'
      ? stats?.pendingSalesAmount || 0
      : stats?.todaySalesAmount || 0

  const handleCancel = (saleId: string) => {
    openDrawer({
      type: 'confirm-cancel',
      props: {
        onConfirm: async () => {
          await cancelSaleMutation.mutateAsync(saleId)
          showNotificationToast({ message: 'Sale cancelled' })
        },
      },
    })
  }

  const handleConfirm = (saleId: string) => {
    router.push(`/record-sale?confirm=${saleId}`)
  }

  const handleShareProfile = () => {
    const firstKit = qrKitsData?.data?.[0]
    if (!firstKit) {
      openDrawer({ type: 'obtain-kit' })
      return
    }
    openDrawer({
      type: 'profile-share',
      props: {
        businessName: profile?.businessName || 'Your Business',
        profilePhotoUrl: profile?.profilePhotoUrl,
        serialNumber: firstKit.serialNumber,
      },
    })
  }

  const emptyState =
    activeTab === 'unconfirmed'
      ? {
          title: 'You’re all caught up',
          details:
            'There are no payments to confirm at the moment. You’ll get a notification when a new sale comes through.',
        }
      : {
          title: 'No confirmed sales yet',
          details:
            'Sales you confirm or record will appear here for quick access.',
        }

  return (
    <div className="min-h-dvh bg-[#F4F6F8] font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        <header className="flex items-center py-3.5">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <ArrowLeft color="black" strokeWidth={2} size={24} />
          </Link>
          <TabSwitch
            value={activeTab}
            onChange={setActiveTab}
            options={TAB_OPTIONS}
            bgClassName="bg-[#E6E8EB]"
            maxW="max-w-[250px]"
            className="mx-auto"
            inactiveClassName="text-black font-bold"
          />
          <span className="h-10 w-10 shrink-0" />
        </header>

        <h1 className="mb-6 mt-2 text-[32px] font-bold leading-none -tracking-[0.4px] text-black">
          Recent
        </h1>

        <StatBanner
          label={metricLabel}
          amount={metricAmount}
          currency="₦"
          isLoading={statsLoading}
          badgeText={
            activeTab === 'confirmed' && metricAmount > 0
              ? `+NGN ${formatCurrency(metricAmount)}`
              : undefined
          }
          className="mb-7"
        />

        <section className="flex flex-1 flex-col">
          <div>
            <h2 className="text-[15px] font-bold text-black">
              {activeTab === 'unconfirmed'
                ? 'Waiting for confirmation'
                : 'Confirmed sales'}
            </h2>
            {activeTab === 'unconfirmed' && (
              <p className="mb-3 mt-1 text-xs font-medium text-[#00000066]">
                Swipe right to confirm, swipe left if the payment didn’t
                happen.
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
            </div>
          ) : activeSales.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-[12px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
              {activeSales.map((sale: Sale, index: number) => (
                <SaleItem
                  key={sale._id}
                  sale={sale}
                  isSwipeable={activeTab === 'unconfirmed'}
                  onConfirm={() => handleConfirm(sale._id)}
                  onCancel={() => handleCancel(sale._id)}
                  onClick={() => {
                    if (activeTab === 'unconfirmed') {
                      handleConfirm(sale._id)
                      return
                    }
                    openDrawer({
                      type: 'transaction-details',
                      props: { sale },
                    })
                  }}
                  variant={
                    activeTab === 'unconfirmed'
                      ? 'recent-unconfirmed'
                      : 'recent-confirmed'
                  }
                  className={cn(
                    index === 0 && 'rounded-t-[12px]',
                    index === activeSales.length - 1 && 'rounded-b-[12px]',
                  )}
                />
              ))}
              <Link
                href={
                  activeTab === 'unconfirmed'
                    ? '/history?status=UNCONFIRMED'
                    : '/history?mode=recorded'
                }
                className="block w-full py-3 text-center text-[14px] font-medium text-[#6B7280] transition-colors hover:text-black"
              >
                {activeTab === 'unconfirmed'
                  ? 'View all unconfirmed sales'
                  : 'View all recorded sales'}
              </Link>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-10">
              <EmptyState
                emoji={<span className="text-[64px] leading-none">📫</span>}
                title={emptyState.title}
                details={emptyState.details}
                cta={
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Link
                      href="/record-sale"
                      className="flex h-11 items-center gap-2 rounded-full bg-black px-5 text-[11px] font-bold tracking-[1px] text-white"
                    >
                      <Plus size={18} />
                      NEW SALE
                    </Link>
                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="flex h-11 items-center gap-2 rounded-full border border-[#DFDFDF] bg-[#F1F1F1] px-5 text-[11px] font-bold tracking-[1px] text-black"
                    >
                      <Share2 size={18} />
                      SHARE PROFILE
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </section>

        <Link
          href="/history?status=ARCHIVED"
          className="mt-7 flex min-h-14 items-center justify-center rounded-[12px] border border-[#F1F1F1] bg-white px-4 text-center text-[14px] font-medium text-[#6B7280]"
        >
          View archived sales
        </Link>
      </div>
    </div>
  )
}
