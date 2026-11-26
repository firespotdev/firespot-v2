'use client'

import { format } from 'date-fns'
import { Check, Copy } from 'lucide-react'
import {
  AppCard,
  Button,
  CircularIconButton,
  showNotificationToast,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { type ReportDetails, reportCategoryLabel } from '@/services/reports'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-[14px] font-medium text-[#00000080]">
        {label}
      </span>
      <span className="text-right text-[14px] font-medium text-black">
        {children}
      </span>
    </div>
  )
}

const copy = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    showNotificationToast({ message: 'Reference copied', mode: 'success' })
  } catch {
    showNotificationToast({ message: 'Could not copy the reference', mode: 'error' })
  }
}

/** The outcome of a resolved report. Firespot can't refund automatically yet. */
export function ReportResolved({
  report,
  onClose,
}: {
  report: ReportDetails
  onClose: () => void
}) {
  const inFavour = report.decision === 'customer'
  const shopName = report.sale?.merchant.businessName || 'the merchant'
  const fallback = inFavour
    ? `Firespot reviewed the evidence and ruled in your favour. ${shopName} has been asked to make it right.`
    : `Firespot reviewed the evidence from both sides and ruled in ${shopName}'s favour.`

  return (
    <div className="mx-auto flex h-dvh max-w-125 flex-col overflow-hidden bg-linear-to-b from-white to-[#F4F6F8] font-satoshi">
      <div className="flex shrink-0 justify-end px-4 py-3">
        <CircularIconButton size="lg" onClick={onClose} />
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-7 pt-8">
        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#24C166]">
          <Check className="h-8 w-8 text-[#24C166]" strokeWidth={3} />
        </div>
        <h1 className="mt-7 mb-2.5 text-center text-[20px] font-bold leading-none text-black">
          Dispute resolved
        </h1>
        <p className="mb-6 text-center text-[14px] font-medium leading-[140%] text-[#00000080]">
          {report.resolutionNote || fallback}
        </p>

        <AppCard
          variant="bordered"
          padding="md"
          className="w-full shadow-[0px_2px_8px_0px_#0000000A]"
        >
          <p className="pb-1 text-[11px] font-bold tracking-[1.5px] text-[#9CA3AF]">
            RESOLUTION DETAILS
          </p>
          <Row label="Decision">
            {inFavour ? 'Ruled in your favour' : "Ruled in the merchant's favour"}
          </Row>
          <Row label="Issue">{reportCategoryLabel(report.category)}</Row>
          {report.sale && (
            <Row label="Amount">NGN {formatCurrency(report.sale.amount)}</Row>
          )}
          {report.resolvedAt && (
            <Row label="Date and time">
              {format(new Date(report.resolvedAt), "MMM d, yyyy '·' h:mm a")}
            </Row>
          )}
          {report.sale?.reference && (
            <Row label="Reference">
              <button
                type="button"
                onClick={() => void copy(report.sale!.reference!)}
                className="inline-flex items-center gap-2"
              >
                {report.sale.reference}
                <Copy size={16} />
              </button>
            </Row>
          )}
        </AppCard>
      </div>

      <div className="mx-auto w-full shrink-0 px-7 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button onClick={onClose} className="h-12">
          Back to activity
        </Button>
      </div>
    </div>
  )
}
