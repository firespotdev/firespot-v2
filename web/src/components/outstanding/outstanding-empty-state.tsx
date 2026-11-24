import { EmptyState } from '@/components/ui'

/** Shown wherever the merchant's list of owing customers is empty. */
export function OutstandingEmptyState() {
  return (
    <EmptyState
      emoji={
        <span
          className="text-[64px] leading-none"
          role="img"
          aria-label="Party popper"
        >
          🎉
        </span>
      }
      title="All caught up"
      details="No customers owe you right now."
      cta={null}
    />
  )
}
