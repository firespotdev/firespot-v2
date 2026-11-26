'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Archive, Repeat } from 'lucide-react'
import { showNotificationToast } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  type ReportDetails,
  reportCategoryLabel,
  useCloseReport,
  useFollowUpReport,
} from '@/services/reports'
import { ReportHeader } from './report-header'
import { REPORT_STATUS_LABEL, reportTimeline } from './report-timeline'
import { ReportTimelineList } from './report-timeline-list'

const apiMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

const PILL =
  'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#0000000A] bg-[#0000000A] px-3.5 text-[10px] font-bold tracking-[1px] text-black disabled:opacity-40 shadow-[0px_4px_8px_0px_#0000000A]'

/** Where an open or closed report stands, with follow up and close. */
export function ReportStatus({
  report,
  onBack,
}: {
  report: ReportDetails
  onBack: () => void
}) {
  const followUp = useFollowUpReport()
  const closeReport = useCloseReport()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const isOpen = report.status === 'pending' || report.status === 'in_review'
  const status = REPORT_STATUS_LABEL[report.status]
  const reference = report.sale?.reference

  const handleFollowUp = () => {
    if (report.nextFollowUpAt) {
      showNotificationToast({
        message: `You can follow up again ${format(new Date(report.nextFollowUpAt), "MMM d 'at' h:mm a")}.`,
      })
      return
    }
    followUp.mutate(report._id, {
      onSuccess: () =>
        showNotificationToast({
          message: 'Firespot has been nudged about your dispute',
          mode: 'success',
        }),
      onError: (error) =>
        showNotificationToast({
          message:
            apiMessage(error) || 'Could not follow up. Please try again.',
          mode: 'error',
        }),
    })
  }

  const handleClose = async () => {
    try {
      await closeReport.mutateAsync(report._id)
      setConfirmingClose(false)
      showNotificationToast({ message: 'Dispute closed', mode: 'success' })
    } catch (error) {
      showNotificationToast({
        message:
          apiMessage(error) || 'Could not close the dispute. Please try again.',
        mode: 'error',
      })
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-125 bg-linear-to-b from-[#FFFFFF] to-[#F4F6F8]">
      <ReportHeader title="Dispute status" onBack={onBack} />

      <main className="space-y-3 px-4 mt-4">
        <section className="rounded-[12px] border border-[#00000014] bg-white px-4 py-3 shadow-[0px_4px_8px_0px_#0000000A]">
          <p
            className={`text-[10px] font-bold tracking-[1px] ${status.className}`}
          >
            {status.label}
          </p>
          <h2 className="mt-2 text-[16px] font-bold text-black">
            {reportCategoryLabel(report.category)}
          </h2>
          {/* One line: a long reference is cut short, as on receipts. */}
          <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#00000080]">
            {reference && (
              <>
                <span className="max-w-37.5 truncate">Order #{reference}</span>
                <span aria-hidden>•</span>
              </>
            )}
            <span className="shrink-0">
              Raised {format(new Date(report.createdAt), 'MMM dd, yyyy')}
            </span>
          </p>
        </section>

        <section className="rounded-[12px] border border-[#F1F1F1] bg-white p-4 shadow-[0px_4px_8px_0px_#0000000A]">
          <ReportTimelineList steps={reportTimeline(report)} />
          {isOpen && (
            <div className="mt-3 flex items-center w-full justify-start gap-3 border-t border-[#F1F1F1] pt-3">
              <button
                type="button"
                onClick={handleFollowUp}
                disabled={followUp.isPending}
                className={PILL}
              >
                <Repeat size={16} />
                FOLLOW UP
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClose(true)}
                className={PILL}
              >
                <Archive size={16} />
                ARCHIVE DISPUTE
              </button>
            </div>
          )}
        </section>

        <p className="rounded-[12px] border border-[#E5E7EB] bg-[#EEEFF1] py-3 px-4 text-[12px] leading-[130%] text-[#00000066]">
          {isOpen
            ? "You'll be notified when a decision is made. No need to contact the seller directly while the dispute is open."
            : 'You closed this dispute. You can report this payment again.'}
        </p>
      </main>

      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title="Archive this dispute?"
        description="This closes the dispute and Firespot stops reviewing it. It can't be reopened."
        confirmLabel="Archive dispute"
        variant="danger"
        onConfirm={handleClose}
        isLoading={closeReport.isPending}
      />
    </div>
  )
}
