/** Formats 5000 -> "5,000.00" */
export function formatAmount(amount?: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

/** "Today at 06:12 PM" for same-day timestamps, otherwise "12 Mar at 06:12 PM" */
export function formatSaleTime(timestamp?: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return `Today at ${time}`

  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  return `${day} at ${time}`
}

/** "Monday, 21st of March, 2025 at 5:34 PM" for the success screen */
export function formatConfirmationDate(timestamp?: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  const year = date.getFullYear()
  const day = date.getDate()
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th'
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${weekday}, ${day}${suffix} of ${month}, ${year} at ${time}`
}
