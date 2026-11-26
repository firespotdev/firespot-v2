import { addHours, format } from 'date-fns'
import type { ReportDetails } from '@/services/reports'

export type TimelineState = 'done' | 'active' | 'waiting' | 'written'

export interface TimelineStep {
  title: string
  detail: string
  state: TimelineState
}

/** Firespot reviews within a day and decides within two. */
export const REVIEW_HOURS = 24
export const RESOLUTION_HOURS = 48

const day = (date: Date) => format(date, 'MMM d, yyyy')

/** The steps the status screen lists, from the report's own dates. */
export function reportTimeline(report: ReportDetails): TimelineStep[] {
  const raised = new Date(report.createdAt)
  const items = report.sale?.itemCount ?? 0
  const itemsText = items ? ` · ${items} item${items === 1 ? '' : 's'}` : ''
  const steps: TimelineStep[] = [
    { title: 'Dispute submitted', detail: `${day(raised)}${itemsText}`, state: 'written' },
    {
      title: 'Merchant notified',
      detail: `${day(raised)} · ${format(raised, 'h:mm a')}`,
      state: 'done',
    },
  ]

  if (report.status === 'closed') {
    return [
      ...steps,
      {
        title: 'Closed by you',
        detail: report.closedAt ? day(new Date(report.closedAt)) : '',
        state: 'done',
      },
    ]
  }

  const resolved = report.status === 'resolved'
  return [
    ...steps,
    {
      title: 'Under review',
      detail: resolved
        ? 'Reviewed'
        : `Due ${day(addHours(raised, REVIEW_HOURS))}`,
      state: resolved
        ? 'done'
        : report.status === 'in_review'
          ? 'active'
          : 'waiting',
    },
    {
      title: 'Resolution',
      detail:
        resolved && report.resolvedAt
          ? day(new Date(report.resolvedAt))
          : `Due ${day(addHours(raised, RESOLUTION_HOURS))}`,
      state: resolved ? 'done' : 'waiting',
    },
  ]
}

export const REPORT_STATUS_LABEL: Record<
  ReportDetails['status'],
  { label: string; className: string }
> = {
  pending: { label: 'MERCHANT NOTIFIED', className: 'text-[#B0843A]' },
  in_review: { label: 'UNDER REVIEW', className: 'text-[#B0843A]' },
  resolved: { label: 'RESOLVED', className: 'text-[#24C166]' },
  closed: { label: 'CLOSED', className: 'text-[#6B7280]' },
}
