import type { ShopDay, ShopDaySchedule } from '@/services/auth/interface'

export const SHOP_DAYS: Array<{
  value: ShopDay
  short: string
  label: string
}> = [
  { value: 'SUN', short: 'S', label: 'Sunday' },
  { value: 'MON', short: 'M', label: 'Monday' },
  { value: 'TUE', short: 'T', label: 'Tuesday' },
  { value: 'WED', short: 'W', label: 'Wednesday' },
  { value: 'THU', short: 'T', label: 'Thursday' },
  { value: 'FRI', short: 'F', label: 'Friday' },
  { value: 'SAT', short: 'S', label: 'Saturday' },
]

export function createDefaultSchedule(): ShopDaySchedule[] {
  return SHOP_DAYS.map(({ value }) => ({
    day: value,
    enabled: !['SUN', 'SAT'].includes(value),
    opensAt: undefined,
    closesAt: undefined,
    closesNextDay: false,
  }))
}

export function withCommonTimes(
  days: ShopDaySchedule[],
  opensAt: string,
  closesAt: string,
) {
  return days.map((day) => ({
    ...day,
    opensAt: day.enabled ? opensAt : undefined,
    closesAt: day.enabled ? closesAt : undefined,
    closesNextDay:
      day.enabled && Boolean(opensAt && closesAt && closesAt < opensAt),
  }))
}

export function scheduleIsValid(days: ShopDaySchedule[]) {
  const enabled = days.filter((day) => day.enabled)
  return (
    enabled.length > 0 &&
    enabled.every(
      (day) =>
        Boolean(day.opensAt && day.closesAt) && day.opensAt !== day.closesAt,
    )
  )
}

export function formatShopTime(value?: string) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}${suffix}`
}

export function updateDaySchedule(
  days: ShopDaySchedule[],
  updated: ShopDaySchedule,
) {
  return days.map((day) => (day.day === updated.day ? updated : day))
}
