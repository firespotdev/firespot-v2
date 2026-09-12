'use client'

import { ChevronRight, Plus, Trash2, X } from 'lucide-react'
import type { Sale } from '@/services/sales/interface'
import {
  useOngoingSales,
  useClearAllOngoingSales,
  useCancelSale,
} from '@/services/sales/hooks'
import { Label, showNotificationToast } from '@/components/ui'

export interface OngoingSalesDrawerProps {
  onSelectSale: (sale: Sale) => void
  onNewSale: () => void
  closeDrawer: () => void
}

function formatSaleTime(dateStr: string | Date) {
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return ''
  }
}

const formatMoney = (val: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)

export function OngoingSalesDrawer({
  onSelectSale,
  onNewSale,
  closeDrawer,
}: OngoingSalesDrawerProps) {
  const { data: sales = [], isLoading } = useOngoingSales()
  const cancelSaleMutation = useCancelSale()
  const clearAllMutation = useClearAllOngoingSales()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    cancelSaleMutation.mutate(id, {
      onSuccess: () => {
        showNotificationToast({
          message: 'Sale cancelled',
          mode: 'success',
          duration: 1500,
        })
      },
      onError: (error: unknown) => {
        showNotificationToast({
          message:
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Failed to cancel sale.',
          mode: 'error',
        })
      },
    })
  }

  const handleClearAll = () => {
    clearAllMutation.mutate(undefined, {
      onSuccess: () => {
        showNotificationToast({
          message: 'All ongoing sales cleared',
          mode: 'success',
          duration: 1500,
        })
      },
    })
  }

  const openCount = sales.length

  return (
    <div className="flex h-full w-full flex-col bg-[#F4F6F8] select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3.5">
        <h2 className="text-[20px] font-bold text-black">Ongoing sales</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className=" text-black flex justify-center items-center"
        >
          <X size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 font-family-satoshi">
        {openCount === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 py-8">
            <div className="relative mb-10 text-[64px] flex items-center justify-center">
              🛍️
            </div>

            <h3 className="text-[20px] font-bold text-black mb-3">
              Add items to cart
            </h3>
            <p className="text-[14px] font-medium text-[#64748B] max-w-[230px] mb-4">
              Hold multiple sales simultaneously and collect or record them
              whenever you&apos;re ready.
            </p>

            <button
              type="button"
              onClick={onNewSale}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFDFDF80] bg-[#EBEDF0] px-3 h-9 text-[10px] font-bold uppercase tracking-[1px] text-black transition-colors"
            >
              <Plus size={16} strokeWidth={2} />
              <span>New sale</span>
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <Label>{openCount} open</Label>
            <div className="overflow-hidden rounded-[12px] bg-white border border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A]">
              {sales.map((sale) => {
                const totalQty = (sale.items || []).reduce(
                  (sum, item) => sum + (item.quantity || 1),
                  0,
                )
                const itemsCount = totalQty > 0 ? totalQty : 1
                const title =
                  sale.description ||
                  (sale.items && sale.items.length > 0
                    ? sale.items.map((item) => item.productName).join(', ')
                    : 'No description yet')
                const formattedTime = formatSaleTime(sale.createdAt)

                return (
                  <div
                    key={sale._id}
                    onClick={() => onSelectSale(sale)}
                    className="group border-b border-[#F1F1F1] p-3 last:border-b-0 cursor-pointer"
                  >
                    {/* Top Row: Description & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-black">
                          {title}
                        </p>
                        <p className="text-[13px] font-medium text-[#64748B] mt-0.5">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                          {formattedTime ? ` · ${formattedTime}` : ''}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-[#9CA3AF] shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>

                    {/* Bottom Row: Trash & Amount */}
                    <div className="flex items-center justify-between mt-3">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, sale._id)}
                        disabled={cancelSaleMutation.isPending}
                        aria-label="Delete sale"
                        className="grid size-9 place-items-center rounded-[10px] bg-[#F1F1F1] text-black"
                      >
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                      <p className="text-[14px] font-bold text-black">
                        NGN {formatMoney(sale.amount || 0)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Bottom Actions & Footnote */}
      <div className="p-3 w-full border-t border-[#E5E7EB]">
        {openCount > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFDFDF80] bg-[#EBEDF0] px-4 h-9 text-[10px] font-bold uppercase tracking-[1px] text-black transition-colors"
            >
              <Trash2 size={16} strokeWidth={2} />
              <span>Clear all</span>
            </button>

            <button
              type="button"
              onClick={onNewSale}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFDFDF80] bg-[#EBEDF0] px-4 h-9 text-[10px] font-bold uppercase tracking-[1px] text-black transition-colors"
            >
              <Plus size={16} strokeWidth={2} />
              <span>New sale</span>
            </button>
          </div>
        )}

        <p className="text-center text-[11px] font-medium text-[#00000066]">
          Disappears after midnight everyday
        </p>
      </div>
    </div>
  )
}
