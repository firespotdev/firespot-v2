'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Loader2, Plus, Share2, X } from 'lucide-react'
import Link from 'next/link'
import {
  useArchiveSale,
  useArchiveAllPendingSales,
  useConfirmAllSales,
  useConfirmSale,
  useSales,
  useSalesStats,
} from '@/services/sales/hooks'
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
  const [activeTab, setActiveTab] = useState<RecentTab>('unconfirmed')
  const [showConfirmAllTooltip, setShowConfirmAllTooltip] = useState(true)
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

  const confirmSaleMutation = useConfirmSale()
  const confirmAllSalesMutation = useConfirmAllSales()
  const archiveAllSalesMutation = useArchiveAllPendingSales()
  const archiveSaleMutation = useArchiveSale()
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowConfirmAllTooltip(false)
    }, 3000)

    return () => window.clearTimeout(timeout)
  }, [])

  const hasMutationInProgress =
    confirmAllSalesMutation.isPending ||
    archiveAllSalesMutation.isPending ||
    confirmSaleMutation.isPending ||
    archiveSaleMutation.isPending

  const getMutationMessage = (error: unknown, fallback: string) => {
    const apiError = error as {
      response?: { data?: { message?: string | string[] } }
    }
    const message = apiError.response?.data?.message
    return Array.isArray(message) ? message[0] : message || fallback
  }

  const handleArchive = (saleId: string) => {
    if (hasMutationInProgress) {
      return
    }
    archiveSaleMutation.mutate(saleId, {
      onSuccess: () => {
        showNotificationToast({
          message: 'Sale archived',
          mode: 'success',
        })
      },
      onError: (error) => {
        showNotificationToast({
          message: getMutationMessage(error, 'Failed to archive sale.'),
          mode: 'error',
        })
      },
    })
  }

  const handleConfirm = (saleId: string) => {
    if (hasMutationInProgress) {
      return
    }
    confirmSaleMutation.mutate(saleId, {
      onSuccess: () => {
        setActiveTab('confirmed')
        showNotificationToast({
          message: 'Payment confirmed',
          mode: 'success',
        })
      },
      onError: (error) => {
        showNotificationToast({
          message: getMutationMessage(error, 'Failed to confirm payment.'),
          mode: 'error',
        })
      },
    })
  }

  const handleConfirmAll = () => {
    if (hasMutationInProgress || pendingSales.length === 0) return
    confirmAllSalesMutation.mutate(undefined, {
      onSuccess: ({ count }) => {
        setActiveTab('confirmed')
        showNotificationToast({
          message:
            count === 1 ? '1 payment confirmed' : `${count} payments confirmed`,
          mode: 'success',
        })
      },
      onError: (error) => {
        showNotificationToast({
          message: getMutationMessage(error, 'Failed to confirm all payments.'),
          mode: 'error',
        })
      },
    })
  }

  const handleArchiveAll = () => {
    if (hasMutationInProgress || pendingSales.length === 0) return

    archiveAllSalesMutation.mutate(undefined, {
      onSuccess: ({ count }) => {
        showNotificationToast({
          message:
            count === 1 ? '1 payment archived' : `${count} payments archived`,
          mode: 'success',
        })
      },
      onError: (error) => {
        showNotificationToast({
          message: getMutationMessage(error, 'Failed to archive all payments.'),
          mode: 'error',
        })
      },
    })
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
          actions={
            activeTab === 'unconfirmed' ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Archive all unconfirmed sales"
                  onClick={handleArchiveAll}
                  disabled={hasMutationInProgress || pendingSales.length === 0}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0000000A] bg-[#0000000A] text-black shadow-[0px_2px_4px_0px_#0000000A] disabled:cursor-not-allowed"
                >
                  {archiveAllSalesMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <X className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>

                <div className="relative">
                  {showConfirmAllTooltip && (
                    <div
                      role="tooltip"
                      className="absolute bottom-[calc(100%+28px)] right-[-8px] z-20 whitespace-nowrap rounded-[10px] bg-black px-3.5 py-2 text-[13px] font-bold text-white shadow-lg"
                    >
                      Confirm all
                      <span className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-black" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Confirm all unconfirmed sales"
                    onClick={handleConfirmAll}
                    disabled={
                      hasMutationInProgress || pendingSales.length === 0
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24C166] text-white shadow-[0px_2px_4px_0px_#1433204D] disabled:cursor-not-allowed disabled:bg-[#D0D5DD] disabled:shadow-[0px_2px_4px_0px_#0000000A]"
                  >
                    {confirmAllSalesMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    )}
                  </button>
                </div>
              </div>
            ) : undefined
          }
          splitLayout
          className="mb-6"
        />

        <section className="flex flex-1 flex-col">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-bold text-black">
                {activeTab === 'unconfirmed'
                  ? 'Waiting for confirmation'
                  : 'Confirmed sales'}
              </h2>
            </div>
            {activeTab === 'unconfirmed' && (
              <p className="mb-3 mt-1 text-xs font-medium text-[#00000066]">
                Swipe right to confirm, swipe left to archive.
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
                  onArchive={() => handleArchive(sale._id)}
                  isConfirming={
                    confirmSaleMutation.isPending &&
                    confirmSaleMutation.variables === sale._id
                  }
                  isArchiving={
                    archiveSaleMutation.isPending &&
                    archiveSaleMutation.variables === sale._id
                  }
                  actionsDisabled={hasMutationInProgress}
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
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Link
                      href="/record-sale"
                      className="flex h-9 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-bold tracking-[1px] text-white"
                    >
                      <Plus size={18} />
                      NEW SALE
                    </Link>
                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="flex h-9 items-center gap-2 rounded-full border border-[#DFDFDF] bg-[#F1F1F1] px-4 text-[10px] font-bold tracking-[1px] text-black"
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
          className="mt-7 flex h-11 items-center justify-center rounded-[12px] bg-white px-4 text-center text-[13px] font-medium text-[#6B7280]"
        >
          View archived sales
        </Link>
      </div>
    </div>
  )
}
