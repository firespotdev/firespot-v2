'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { CustomerReport } from '@/services/payment-cases'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyQueue, Status, formatDate } from './payment-case-parts'

const CATEGORY_LABELS: Record<string, string> = {
  item_not_received: 'Item not received',
  item_damaged: 'Item arrived damaged',
  not_as_described: 'Not as described',
  wrong_items: 'Wrong items received',
  merchant_unresponsive: 'Merchant unresponsive',
}

type OpenStatus = 'pending' | 'in_review'
type Decision = NonNullable<CustomerReport['decision']>
export interface ResolveUpdate {
  decision: Decision
  resolutionNote?: string
}

const isOpen = (status: CustomerReport['status']) =>
  status === 'pending' || status === 'in_review'

function ResolveReportDialog({
  report,
  busy,
  onCancel,
  onResolve,
}: {
  report: CustomerReport | null
  busy: boolean
  onCancel: () => void
  onResolve: (update: ResolveUpdate) => Promise<void>
}) {
  const [decision, setDecision] = useState<Decision>()
  const [message, setMessage] = useState('')

  const close = () => {
    setDecision(undefined)
    setMessage('')
    onCancel()
  }

  const submit = async () => {
    if (!decision) return
    try {
      await onResolve({ decision, resolutionNote: message.trim() || undefined })
      close()
    } catch {
      // The queue already showed the error; keep the dialog open to retry.
    }
  }

  return (
    <Dialog open={Boolean(report)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md rounded-[12px] border-gray-100 bg-white p-6" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">Resolve this report?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-600">
            The customer is notified and sees the decision and your message.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-semibold text-gray-900">Decision</legend>
          {(
            [
              ['customer', 'In the customer’s favour'],
              ['merchant', 'In the merchant’s favour'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 has-checked:border-[#FB5012] has-checked:bg-orange-50">
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                onChange={() => setDecision(value)}
                className="accent-[#FB5012]"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block text-sm font-semibold text-gray-900" htmlFor="resolution-note">
          Message to the customer <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="resolution-note"
          rows={3}
          maxLength={500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="For example: the shop has agreed to refund you within 3 days."
          className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FB5012] focus:ring-2 focus:ring-orange-100"
        />

        <DialogFooter className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!decision || busy}
            className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resolve report
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewState({
  item,
  busy,
  onStatus,
  onResolveClick,
}: {
  item: CustomerReport
  busy: boolean
  onStatus: (status: OpenStatus) => void
  onResolveClick: () => void
}) {
  if (!isOpen(item.status)) {
    return (
      <div className="space-y-1">
        <Status value={item.status} />
        {item.decision && (
          <p className="text-xs text-gray-500">
            For the {item.decision === 'customer' ? 'customer' : 'merchant'}
          </p>
        )}
        {item.status === 'closed' && (
          <p className="text-xs text-gray-500">Closed by the customer {formatDate(item.closedAt)}</p>
        )}
      </div>
    )
  }
  return (
    <select
      value={item.status}
      disabled={busy}
      onChange={(event) => {
        const next = event.target.value
        if (next === 'resolved') onResolveClick()
        else onStatus(next as OpenStatus)
      }}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#FB5012] focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
    >
      <option value="pending">Pending</option>
      <option value="in_review">In review</option>
      <option value="resolved">Resolved…</option>
    </select>
  )
}

/** Customer reports: review them, then resolve with a decision. */
export function ReportQueue({
  items,
  busy,
  onStatus,
  onResolve,
}: {
  items: CustomerReport[]
  busy: boolean
  onStatus: (item: CustomerReport, status: OpenStatus) => Promise<unknown>
  onResolve: (item: CustomerReport, update: ResolveUpdate) => Promise<unknown>
}) {
  const [resolving, setResolving] = useState<CustomerReport | null>(null)
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
                <p className="font-semibold text-gray-950">{CATEGORY_LABELS[item.category] || item.category}</p>
                <p className="mt-1 leading-5 text-gray-600">{item.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Submitted {formatDate(item.createdAt)}
                  {item.followUps?.length
                    ? ` · Followed up ${item.followUps.length}×, last ${formatDate(item.followUps[item.followUps.length - 1])}`
                    : ''}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-medium text-gray-900">
                  {item.customerId?.fullName || item.customerId?.fullPhoneNumber || 'Customer'}
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
                <ReviewState
                  item={item}
                  busy={busy}
                  onStatus={(status) => void onStatus(item, status).catch(() => undefined)}
                  onResolveClick={() => setResolving(item)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResolveReportDialog
        report={resolving}
        busy={busy}
        onCancel={() => setResolving(null)}
        onResolve={async (update) => {
          if (resolving) await onResolve(resolving, update)
        }}
      />
    </div>
  )
}
