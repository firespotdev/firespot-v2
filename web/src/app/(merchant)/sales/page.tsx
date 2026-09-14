'use client'

import { useEffect, useRef, useState, useTransition, Suspense } from 'react'
import {
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Share,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import {
  useArchiveSale,
  useArchiveAllPendingSales,
  useConfirmSale,
  useInfiniteSales,
  useSalesStats,
} from '@/services/sales/hooks'
import { SaleItem } from '@/components/sales/SaleItem'
import { cn, formatCurrency } from '@/lib/utils'
import type { Sale } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import {
  EmptyState,
  GreenSpinner,
  showNotificationToast,
  StatBanner,
  TabSwitch,
} from '@/components/ui'
import { useUserProfile } from '@/services/users'
import { useUserQRKits } from '@/services/qr'

type SalesTab = 'unconfirmed' | 'confirmed'

const TAB_OPTIONS = [
  { label: 'UNCONFIRMED', value: 'unconfirmed' },
  { label: 'CONFIRMED', value: 'confirmed' },
] satisfies Array<{ label: string; value: SalesTab }>

function SalesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as SalesTab | null

  const activeTab: SalesTab =
    urlTab === 'confirmed' ? 'confirmed' : 'unconfirmed'
  const [showReviewAllHint, setShowReviewAllHint] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowReviewAllHint(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [])

  const handleTabChange = (newTab: SalesTab) => {
    startTransition(() => {
      router.replace(`/sales?tab=${newTab}`)
    })
  }

  const { data: stats, isLoading: statsLoading } = useSalesStats({
    preset: 'today',
  })
  const pendingQuery = useInfiniteSales({ status: 'PENDING' })
  const confirmedQuery = useInfiniteSales({ status: 'RECORDED' })
  const { data: profile } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()

  const confirmSaleMutation = useConfirmSale()
  const archiveAllSalesMutation = useArchiveAllPendingSales()
  const archiveSaleMutation = useArchiveSale()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const flatten = (query: typeof pendingQuery) =>
    query.data?.pages.flatMap((page) => page.data) || []

  const pendingSales = flatten(pendingQuery)
  const confirmedSales = flatten(confirmedQuery)

  const activeQuery =
    activeTab === 'unconfirmed' ? pendingQuery : confirmedQuery
  const activeSales =
    activeTab === 'unconfirmed' ? pendingSales : confirmedSales
  const isLoading = activeQuery.isLoading
  const metricLabel =
    activeTab === 'unconfirmed'
      ? 'Total unconfirmed sales'
      : 'Total sales confirmed today'
  const metricAmount =
    activeTab === 'unconfirmed'
      ? stats?.pendingSalesAmount || 0
      : stats?.todaySalesAmount || 0
  const confirmedTodayCount = stats?.todaySalesCount ?? 0

  // Infinite scroll sentinel
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = activeQuery
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) fetchNextPage()
    })
    observer.observe(node)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, activeTab])

  const hasMutationInProgress =
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
    if (hasMutationInProgress) return
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
    if (hasMutationInProgress) return
    confirmSaleMutation.mutate(saleId, {
      onSuccess: () => {
        handleTabChange('confirmed')
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

  const handleReviewAll = () => {
    if (pendingSales.length === 0) return
    setShowReviewAllHint(false)
    openDrawer({
      type: 'unconfirmed-details',
      props: {
        sales: pendingSales,
        initialIndex: 0,
        onConfirmSuccess: () => {
          // Handled inside drawer
        },
      },
    })
  }

  const handleOpenSaleDetails = (sale: Sale, index: number) => {
    if (activeTab === 'unconfirmed') {
      openDrawer({
        type: 'unconfirmed-details',
        props: {
          sales: pendingSales,
          initialIndex: index,
        },
      })
      return
    }

    openDrawer({
      type: 'transaction-details',
      props: { sale },
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
        imageUrl: profile?.businessImageUrl || profile?.profilePhotoUrl,
        serialNumber: firstKit.serialNumber,
      },
    })
  }

  const emptyState =
    activeTab === 'unconfirmed'
      ? {
          title: 'You’re all caught up',
          details:
            "No payments need your attention right now. We'll notify you when a new payment needs confirmation.",
        }
      : {
          title: 'No confirmed sales yet',
          details:
            'Sales you confirm or record will appear here for quick access.',
        }

  return (
    <div className="min-h-dvh bg-linear-to-br from-[#f4f6f8] to-[#f2f4f6]">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        {/* Top bar with Plus on left, TabSwitch in center, Close on right */}
        <header className="flex items-center justify-between py-1.75">
          <button
            type="button"
            onClick={() => openDrawer({ type: 'record-sale' })}
            aria-label="New sale"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-black"
          >
            <Plus size={24} />
          </button>

          <TabSwitch
            value={activeTab}
            onChange={handleTabChange}
            options={TAB_OPTIONS}
            maxW="max-w-[250px]"
            bgClassName="bg-[#EBEDF0]"
            className="mx-auto"
            inactiveClassName="text-black font-bold"
          />

          <Link
            href="/profile"
            aria-label="Close to profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-black"
          >
            <X size={24} />
          </Link>
        </header>

        {/* Sales Heading */}
        <h1 className="mt-6 mb-4 text-[32px] font-bold leading-none -tracking-[0.4px] text-black">
          Sales
        </h1>

        {/* StatBanner */}
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0000000A] bg-[#0000000A] text-black shadow-[0px_2.22px_4.44px_0px_#0000000A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {archiveAllSalesMutation.isPending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <X className="h-4.5 w-4.5" strokeWidth={2} />
                  )}
                </button>

                <div className="relative">
                  {/* Review all tooltip pointing down to the checkmark button */}
                  {showReviewAllHint && pendingSales.length > 0 && (
                    <button
                      type="button"
                      onClick={handleReviewAll}
                      className="absolute bottom-[calc(100%+12px)] right-[-6px] z-20 whitespace-nowrap rounded-[8px] bg-black px-3 h-[34px] text-[14px] font-bold text-white cursor-pointer"
                    >
                      Review all
                      <span className="absolute -bottom-1 right-5 h-3 w-3 rotate-45 bg-black" />
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label="Review all unconfirmed sales"
                    onClick={handleReviewAll}
                    disabled={
                      hasMutationInProgress || pendingSales.length === 0
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24C166] text-white shadow-[0px_2.22px_4.44px_0px_#1433204D] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:shadow-[0px_2.22px_4.44px_0px_#0000000A] active:scale-95 transition-transform"
                  >
                    <Check className="h-4.5 w-4.5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            ) : undefined
          }
          splitLayout
          className="mb-3"
        />

        {/* Confirmed Today Green Banner (Switches tab to confirmed when clicked) */}
        {confirmedTodayCount > 0 && activeTab === 'unconfirmed' && (
          <button
            type="button"
            onClick={() => handleTabChange('confirmed')}
            className="mb-6 flex w-full items-center gap-2.5 rounded-[8px] border border-[#24C16633] bg-[#DFF0E9] px-3 h-[32px] text-[#24C166] text-left"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#24C166] text-white">
              <Check size={10} strokeWidth={3} />
            </span>
            <span className="flex-1 text-[13px] font-medium leading-tight text-[#33A061]">
              {confirmedTodayCount} sale{confirmedTodayCount === 1 ? '' : 's'}{' '}
              confirmed and recorded today
            </span>
            <ChevronRight
              className="shrink-0 text-[#24C166]"
              size={16}
              strokeWidth={2}
            />
          </button>
        )}

        {/* Content list or empty state */}
        <section className="flex flex-1 flex-col">
          {!isLoading && activeSales.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={
                    activeTab === 'confirmed'
                      ? 'text-[14px] font-bold text-black mt-3'
                      : 'text-[14px] font-bold text-black italic'
                  }
                >
                  {activeTab === 'unconfirmed'
                    ? `${activeSales.length} awaiting confirmation...`
                    : `${activeSales.length} Confirmed sales`}
                </h2>
              </div>
              {activeTab === 'unconfirmed' && (
                <p className="mt-0.5 text-xs font-medium text-[#00000066]">
                  Swipe right to confirm, swipe left if the payment didn&apos;t
                  happen.
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <GreenSpinner size={6} innerBg="#F4F6F8" />
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
                  onClick={() => handleOpenSaleDetails(sale, index)}
                  variant={
                    activeTab === 'unconfirmed'
                      ? 'recent-unconfirmed'
                      : 'recent-confirmed'
                  }
                  className={cn(
                    index === 0 && 'rounded-t-[12px]',
                    index === activeSales.length - 1 &&
                      activeTab !== 'confirmed' &&
                      'rounded-b-[12px]',
                  )}
                />
              ))}

              {/* View all recorded sales link at bottom of confirmed card */}
              {activeTab === 'confirmed' && (
                <Link
                  href="/history?mode=recorded"
                  className="flex items-center justify-center px-4 h-11 text-[13px] font-medium text-[#6B7280]"
                >
                  <span>View all recorded sales</span>
                </Link>
              )}

              {/* Scroll sentinel — pulls the next page in as it comes into view. */}
              {hasNextPage && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-4"
                >
                  {isFetchingNextPage && (
                    <GreenSpinner size={5} innerBg="#F4F6F8" />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Preserved untouched EmptyState */
            <div className="flex flex-1 items-center justify-center py-10">
              <EmptyState
                emoji={<span className="text-[64px] leading-none">📭</span>}
                title={emptyState.title}
                details={emptyState.details}
                cta={
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => openDrawer({ type: 'record-sale' })}
                      className="flex h-9 items-center gap-2 rounded-full border border-[#DFDFDF80] bg-[#EBEDF0] px-4 text-[10px] font-bold tracking-[1px] text-black"
                    >
                      <Plus size={16} />
                      NEW SALE
                    </button>
                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="flex h-9 items-center gap-2 rounded-full border border-[#DFDFDF80] bg-[#EBEDF0] px-4 text-[10px] font-bold tracking-[1px] text-black"
                    >
                      <Share size={16} />
                      SHARE PROFILE
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </section>

        {/* Preserved untouched View archived sales button */}
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

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F4F6F8]">
          <GreenSpinner size={6} innerBg="#F4F6F8" />
        </div>
      }
    >
      <SalesPageContent />
    </Suspense>
  )
}
