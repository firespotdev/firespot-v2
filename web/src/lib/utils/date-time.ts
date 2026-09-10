import { format } from 'date-fns'

interface FormatDateTimeOptions {
  ordinalDay?: boolean
  fallback?: string
}

const shortMonthFormatter = new Intl.DateTimeFormat('en-NG', {
  month: 'short',
})

export function formatDateTime(
  value?: string | Date,
  { ordinalDay = false, fallback = '' }: FormatDateTimeOptions = {},
): string {
  if (!value) return fallback

  try {
    const date = value instanceof Date ? value : new Date(value)
    const month = shortMonthFormatter.format(date)
    const day = format(date, ordinalDay ? 'do' : 'd')
    return `${month} ${day}, ${format(date, 'yyyy · h:mm a')}`
  } catch {
    return String(value)
  }
}
