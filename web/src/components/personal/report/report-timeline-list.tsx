import { Check, PenLine } from 'lucide-react'
import { ClockFillIcon } from '@/components/ui'
import type { TimelineStep } from './report-timeline'

function StepIcon({ state }: { state: TimelineStep['state'] }) {
  if (state === 'written')
    return <PenLine size={16} className="text-[#6B7280]" />
  if (state === 'done') {
    return (
      <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-[#5FBF73]">
        <Check size={11} strokeWidth={3.5} className="text-white" />
      </span>
    )
  }
  if (state === 'active') {
    return <ClockFillIcon size={24} />
  }
  return (
    <span className="h-[20px] w-[20px] rounded-full border border-[#D1D5DB] bg-white" />
  )
}

/** Dashed vertical list of a report's steps. */
export function ReportTimelineList({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol>
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <div className="flex w-[18px] flex-col items-center pt-0.5">
            <StepIcon state={step.state} />
            {index < steps.length - 1 && (
              <span className="mt-1 w-0 flex-1 border-l border-dashed border-[#9CA3AF]" />
            )}
          </div>
          <div className={index < steps.length - 1 ? 'pb-4' : ''}>
            <p className="text-[14px] font-medium text-black">{step.title}</p>
            <p className="mt-1 text-[14px] font-medium text-[#00000080]">
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
