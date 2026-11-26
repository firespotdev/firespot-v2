'use client'

import { ShieldCheck } from 'lucide-react'

export const formatDate = (value?: string) =>
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

export const Status = ({ value }: { value: string }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(value)}`}
  >
    {value.replaceAll('_', ' ').replaceAll('-', ' ')}
  </span>
)

export function EmptyQueue({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" />
      <p className="mt-3 font-semibold text-gray-900">{message}</p>
      <p className="mt-1 text-sm text-gray-500">New cases will appear here automatically.</p>
    </div>
  )
}
