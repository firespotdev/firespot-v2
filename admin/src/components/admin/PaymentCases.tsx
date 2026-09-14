'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Clock3,
  ExternalLink,
  FileWarning,
  RefreshCcw,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import {
  paymentCasesApi,
  usePaymentCaseAction,
  usePaymentCases,
  type CustomerReport,
  type DisputeCase,
  type RefundCase,
} from '@/services/payment-cases'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { adminToast } from './AdminToast'

type Queue = 'refunds' | 'disputes' | 'reports'
type Decision =
  | { kind: 'approve-refund' | 'reject-refund'; item: RefundCase }
  | { kind: 'accept-dispute'; item: DisputeCase }
  | null

const formatMoney = (kobo: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(kobo / 100)

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Not supplied'

const statusClass = (status: string) => {
  if (['processed', 'resolved'].includes(status))
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['failed', 'rejected'].includes(status))
    return 'bg-red-50 text-red-700 ring-red-200'
  if (['pending_approval', 'needs_attention'].includes(status))
    return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

const Status = ({ value }: { value: string }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(value)}`}
  >
    {value.replaceAll('_', ' ').replaceAll('-', ' ')}
  </span>
)

export default function PaymentCases() {
  const [queue, setQueue] = useState<Queue>('refunds')
  const [decision, setDecision] = useState<Decision>(null)
  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null)
  const [note, setNote] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const { refunds, disputes, reports } = usePaymentCases()
  const action = usePaymentCaseAction()

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now())
    const initialTimer = window.setTimeout(updateClock, 0)
    const interval = window.setInterval(updateClock, 60_000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [])

  const counts = useMemo(
    () => ({
      refunds: refunds.data?.filter((item) => item.status === 'pending_approval').length || 0,
      disputes:
        disputes.data?.filter((item) => item.status !== 'resolved').length || 0,
      reports: reports.data?.filter((item) => item.status !== 'resolved').length || 0,
    }),
    [refunds.data, disputes.data, reports.data],
  )

  const run = async (request: () => Promise<unknown>, success: string) => {
    try {
      await action.mutateAsync(request)
      adminToast.success(success)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The action could not be completed'
      adminToast.error(message)
      throw error
    }
  }

  const confirmDecision = async () => {
    if (!decision) return
    if (decision.kind === 'approve-refund') {
      await run(
        () => paymentCasesApi.approveRefund(decision.item._id),
        'Refund approved and submitted to Paystack',
      )
    } else if (decision.kind === 'reject-refund') {
      await run(
        () => paymentCasesApi.rejectRefund(decision.item._id),
        'Refund request rejected',
      )
    } else {
      await run(
        () =>
          paymentCasesApi.acceptDispute(
            decision.item._id,
            'Accepted by Firespot admin after the merchant response window elapsed.',
          ),
        'Dispute accepted to prevent an unanswered chargeback',
      )
    }
  }

  const activeQuery =
    queue === 'refunds' ? refunds : queue === 'disputes' ? disputes : reports

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-gray-950">
            Payment cases
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Review high-value refunds, monitor Paystack deadlines, and support
            customer reports. Merchant evidence and decisions remain merchant-owned.
          </p>
        </div>
        <button
          type="button"
          onClick={() => activeQuery.refetch()}
          disabled={activeQuery.isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB5012] disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${activeQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh queue
        </button>
      </div>

      <div className="overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-7" role="tablist" aria-label="Payment case queues">
          {(
            [
              ['refunds', 'Refund approvals', Banknote],
              ['disputes', 'Paystack disputes', Scale],
              ['reports', 'Customer reports', FileWarning],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={queue === id}
              onClick={() => setQueue(id)}
              className={`flex min-h-12 items-center gap-2 border-b-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB5012] ${
                queue === id
                  ? 'border-[#FB5012] text-gray-950'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {counts[id] > 0 && (
                <span className="rounded-full bg-[#FFF0EA] px-2 py-0.5 text-xs text-[#B93408]">
                  {counts[id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading payment cases">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : activeQuery.error ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">This queue could not be loaded.</p>
            <p className="mt-1">Check the API connection, then refresh the queue.</p>
          </div>
        </div>
      ) : queue === 'refunds' ? (
        <RefundQueue items={refunds.data || []} onDecision={setDecision} />
      ) : queue === 'disputes' ? (
        <DisputeQueue
          items={disputes.data || []}
          selected={selectedDispute}
          note={note}
          onNoteChange={setNote}
          onSelect={setSelectedDispute}
          onAccept={(item) => setDecision({ kind: 'accept-dispute', item })}
          onRemind={(item) =>
            run(() => paymentCasesApi.remindMerchant(item._id), 'Merchant reminded')
          }
          onSaveNote={async (item) => {
            if (!note.trim()) return
            await run(
              () => paymentCasesApi.addDisputeNote(item._id, note.trim()),
              'Internal review note saved',
            )
            setNote('')
          }}
          busy={action.isPending}
          currentTime={currentTime}
        />
      ) : (
        <ReportQueue
          items={reports.data || []}
          busy={action.isPending}
          onStatus={(item, status) =>
            run(
              () => paymentCasesApi.updateReport(item._id, status),
              `Customer report marked ${status.replace('_', ' ')}`,
            )
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={
          decision?.kind === 'approve-refund'
            ? 'Approve this refund?'
            : decision?.kind === 'reject-refund'
              ? 'Reject this refund?'
              : 'Accept this unresolved dispute?'
        }
        description={
          decision?.kind === 'approve-refund'
            ? 'This submits the merchant’s refund to Paystack immediately. Processing completes asynchronously.'
            : decision?.kind === 'reject-refund'
              ? 'The reserved refundable amount will be released. The merchant can submit a new request later.'
              : 'Use this only after the merchant response window has elapsed. Firespot cannot decline or submit evidence for the merchant.'
        }
        confirmLabel={decision?.kind === 'reject-refund' ? 'Reject refund' : 'Confirm action'}
        variant={decision?.kind === 'reject-refund' ? 'danger' : 'warning'}
        onConfirm={confirmDecision}
        isLoading={action.isPending}
      />
    </div>
  )
}

function EmptyQueue({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" />
      <p className="mt-3 font-semibold text-gray-900">{message}</p>
      <p className="mt-1 text-sm text-gray-500">New cases will appear here automatically.</p>
    </div>
  )
}

function RefundQueue({
  items,
  onDecision,
}: {
  items: RefundCase[]
  onDecision: (decision: Decision) => void
}) {
  if (!items.length) return <EmptyQueue message="No refund requests yet" />
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Merchant / transaction</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Decision</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item._id} className="align-top hover:bg-gray-50/70">
              <td className="px-4 py-4">
                <p className="font-semibold text-gray-950">
                  {item.merchantId?.businessName || 'Unknown merchant'}
                </p>
                <p className="mt-1 max-w-xs break-all text-xs text-gray-500">
                  {item.transactionReference}
                </p>
              </td>
              <td className="px-4 py-4 font-semibold text-gray-950">
                {formatMoney(item.amountKobo, item.currency)}
              </td>
              <td className="px-4 py-4 text-gray-600">{formatDate(item.createdAt)}</td>
              <td className="px-4 py-4"><Status value={item.status} /></td>
              <td className="px-4 py-4">
                {item.status === 'pending_approval' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onDecision({ kind: 'reject-refund', item })}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onDecision({ kind: 'approve-refund', item })}
                      className="rounded-lg bg-gray-950 px-3 py-2 font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB5012]"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <p className="text-right text-xs text-gray-500">No action available</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DisputeQueue({
  items,
  selected,
  note,
  onNoteChange,
  onSelect,
  onAccept,
  onRemind,
  onSaveNote,
  busy,
  currentTime,
}: {
  items: DisputeCase[]
  selected: DisputeCase | null
  note: string
  onNoteChange: (value: string) => void
  onSelect: (item: DisputeCase | null) => void
  onAccept: (item: DisputeCase) => void
  onRemind: (item: DisputeCase) => void
  onSaveNote: (item: DisputeCase) => void
  busy: boolean
  currentTime: number
}) {
  if (!items.length) return <EmptyQueue message="No Paystack disputes" />
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {items.map((item) => (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect(item)}
            className={`grid w-full gap-3 border-b border-gray-100 px-4 py-4 text-left last:border-0 sm:grid-cols-[1fr_auto] ${selected?._id === item._id ? 'bg-orange-50/60' : 'hover:bg-gray-50'}`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-950">
                  {item.merchantId?.businessName || 'Unmatched transaction'}
                </p>
                {!item.merchantId && <Status value="needs attention" />}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {item.category || 'Paystack dispute'} · {formatMoney(item.amountKobo, item.currency)}
              </p>
            </div>
            <div className="sm:text-right">
              <Status value={item.status} />
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500 sm:justify-end">
                <Clock3 className="h-3.5 w-3.5" /> Due {formatDate(item.dueAt)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <aside className="rounded-xl border border-gray-200 bg-white p-5">
        {!selected ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <Scale className="h-8 w-8 text-gray-400" />
            <p className="mt-3 font-semibold text-gray-900">Select a dispute to review</p>
            <p className="mt-1 text-sm text-gray-500">Evidence and deadline controls appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-950">Dispute #{selected.paystackDisputeId}</h3>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    {selected.transactionReference || 'No matching Firespot reference'}
                  </p>
                </div>
                <button onClick={() => onSelect(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-900">Close</button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-gray-100 py-4 text-sm">
              <div><dt className="text-gray-500">Amount</dt><dd className="mt-1 font-semibold text-gray-950">{formatMoney(selected.amountKobo, selected.currency)}</dd></div>
              <div><dt className="text-gray-500">Admin acceptance</dt><dd className="mt-1 font-semibold text-gray-950">{formatDate(selected.adminAcceptanceAvailableAt)}</dd></div>
            </dl>

            <div>
              <p className="text-sm font-semibold text-gray-900">Merchant evidence</p>
              {selected.evidence?.length ? (
                <div className="mt-2 space-y-2">
                  {selected.evidence.map((evidence, index) => (
                    <a
                      key={`${evidence.filename}-${index}`}
                      href={evidence.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <span className="truncate">{evidence.filename || `Evidence ${index + 1}`}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No evidence uploaded yet.</p>
              )}
            </div>

            <div>
              <label htmlFor="admin-dispute-note" className="text-sm font-semibold text-gray-900">
                Internal review note
              </label>
              <textarea
                id="admin-dispute-note"
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                rows={3}
                placeholder="Record review context for other admins…"
                className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FB5012] focus:ring-2 focus:ring-orange-100"
              />
              <button
                disabled={busy || !note.trim()}
                onClick={() => onSaveNote(selected)}
                className="mt-2 text-sm font-semibold text-[#B93408] disabled:opacity-40"
              >
                Save internal note
              </button>
            </div>

            {selected.status !== 'resolved' && selected.merchantId && (
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                <button
                  disabled={busy}
                  onClick={() => onRemind(selected)}
                  className="min-h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Remind merchant
                </button>
                <button
                  disabled={
                    busy ||
                    !selected.adminAcceptanceAvailableAt ||
                    selected.status !== 'awaiting-merchant-feedback' ||
                    new Date(selected.adminAcceptanceAvailableAt).getTime() > currentTime
                  }
                  onClick={() => onAccept(selected)}
                  className="min-h-10 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                >
                  Accept after response window
                </button>
                <p className="text-xs leading-5 text-gray-500">
                  Admins can review and accept after the merchant is unresponsive. They cannot decline or prepare evidence.
                </p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

function ReportQueue({
  items,
  busy,
  onStatus,
}: {
  items: CustomerReport[]
  busy: boolean
  onStatus: (item: CustomerReport, status: CustomerReport['status']) => void
}) {
  if (!items.length) return <EmptyQueue message="No customer reports" />
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr><th className="px-4 py-3">Report</th><th className="px-4 py-3">Customer / merchant</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Review state</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item._id} className="align-top hover:bg-gray-50/70">
              <td className="max-w-md px-4 py-4">
                <p className="font-semibold text-gray-950">{item.category}</p>
                <p className="mt-1 leading-5 text-gray-600">{item.description}</p>
                <p className="mt-2 text-xs text-gray-500">Submitted {formatDate(item.createdAt)}</p>
              </td>
              <td className="px-4 py-4">
                <p className="font-medium text-gray-900">
                  {[item.customerId?.firstName, item.customerId?.lastName].filter(Boolean).join(' ') || item.customerId?.fullPhoneNumber || 'Customer'}
                </p>
                <p className="mt-1 text-xs text-gray-500">to {item.merchantId?.businessName || 'merchant'}</p>
              </td>
              <td className="px-4 py-4">
                {item.proofUrl ? (
                  <a href={item.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#B93408] hover:underline">
                    Review file <ExternalLink className="h-4 w-4" />
                  </a>
                ) : <span className="text-gray-400">None supplied</span>}
              </td>
              <td className="px-4 py-4">
                <select
                  value={item.status}
                  disabled={busy}
                  onChange={(event) => onStatus(item, event.target.value as CustomerReport['status'])}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#FB5012] focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                >
                  <option value="pending">Pending</option>
                  <option value="in_review">In review</option>
                  <option value="resolved">Resolved</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
