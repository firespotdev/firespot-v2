'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { CalendarDays, MapPin } from 'lucide-react'
import {
  AppCard,
  Label,
  LoaderCircle,
  Switch,
  showNotificationToast,
} from '@/components/ui'
import { DaySelector } from '@/components/shop/day-selector'
import { ScheduleList } from '@/components/shop/schedule-list'
import {
  createDefaultSchedule,
  scheduleIsValid,
  withCommonTimes,
} from '@/components/shop/schedule-utils'
import { ShopSetupScreen } from '@/components/shop/shop-setup-screen'
import { TimeRangeField } from '@/components/shop/time-range-field'
import type {
  ActiveHoursSetup,
  ShopDaySchedule,
} from '@/services/auth/interface'
import { useDrawerStore } from '@/services/drawer'
import { useUpdateActiveHours } from '@/services/shop'
import { useUserProfile } from '@/services/users'
import type { UserProfile } from '@/services/users'
import { CalendarDotsIcon, MapPinAreaIcon } from '@phosphor-icons/react'

type ScreenStep = 'opening-hours' | 'service-type'
type BookingType = 'SPACE' | 'APPOINTMENT'

function cloneDays(days: ShopDaySchedule[]) {
  return days.map((day) => ({ ...day }))
}

function ActiveHoursSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const update = useUpdateActiveHours()
  const existing = profile.activeHoursSetup
  const initialDays = existing
    ? cloneDays(existing.openingHours.days)
    : createDefaultSchedule()
  const firstEnabled = initialDays.find(
    (day) => day.enabled && day.opensAt && day.closesAt,
  )

  const [step, setStep] = useState<ScreenStep>('opening-hours')
  const [days, setDays] = useState(initialDays)
  const [opensAt, setOpensAt] = useState(firstEnabled?.opensAt || '')
  const [closesAt, setClosesAt] = useState(firstEnabled?.closesAt || '')
  const [useDifferentTimes, setUseDifferentTimes] = useState(
    existing?.openingHours.useDifferentTimes || false,
  )
  const [bookingType, setBookingType] = useState<BookingType | null>(
    existing?.appointmentAndReservation.bookingType || null,
  )
  const [savedAppointment, setSavedAppointment] = useState<
    ActiveHoursSetup['appointmentAndReservation'] | null
  >(existing?.appointmentAndReservation || null)

  const commonTimeValid = Boolean(opensAt && closesAt) && opensAt !== closesAt
  const openingHoursValid = scheduleIsValid(days)

  const handleDaysChange = (nextDays: ShopDaySchedule[]) => {
    setDays(
      !useDifferentTimes && commonTimeValid
        ? withCommonTimes(nextDays, opensAt, closesAt)
        : nextDays,
    )
  }

  const applyCommonTimes = (nextOpen: string, nextClose: string) => {
    if (nextOpen && nextClose && nextOpen !== nextClose) {
      setDays((current) => withCommonTimes(current, nextOpen, nextClose))
    }
  }

  const handleOpenTimeChange = (value: string) => {
    setOpensAt(value)
    if (!useDifferentTimes) applyCommonTimes(value, closesAt)
  }

  const handleCloseTimeChange = (value: string) => {
    setClosesAt(value)
    if (!useDifferentTimes) applyCommonTimes(opensAt, value)
  }

  const handleDifferentTimes = (enabled: boolean) => {
    setUseDifferentTimes(enabled)

    if (commonTimeValid) {
      setDays((current) => withCommonTimes(current, opensAt, closesAt))
    }
  }

  const openDayEditor = (day: ShopDaySchedule) => {
    openDrawer({
      type: 'day-time-editor',
      props: {
        days,
        initialDay: day.day,
        onSave: setDays,
      },
    })
  }

  const beginBookingSetup = () => {
    if (!bookingType) return
    const existing =
      savedAppointment?.bookingType === bookingType ? savedAppointment : null
    const appointment: ActiveHoursSetup['appointmentAndReservation'] =
      existing || {
        bookingType,
        bookableHours: { days: cloneDays(days) },
        capacity: {},
        instantConfirmation: false,
        freeCancellations: false,
        deposit: { amount: 0, depositType: 'FIXED' },
        freeCancellationHours: 0,
      }

    openDrawer({
      type: 'active-hours-booking',
      props: {
        initialValue: appointment,
        onComplete: async (
          nextAppointment: ActiveHoursSetup['appointmentAndReservation'],
        ) => {
          try {
            await update.mutateAsync({
              openingHours: {
                useDifferentTimes,
                timezone:
                  Intl.DateTimeFormat().resolvedOptions().timeZone ||
                  'Africa/Lagos',
                days,
              },
              appointmentAndReservation: nextAppointment,
            })
            setSavedAppointment(nextAppointment)
            showNotificationToast({
              message: 'Active hours saved',
              mode: 'success',
            })
            router.replace('/shop-setup')
            return true
          } catch (error: unknown) {
            showNotificationToast({
              message:
                (
                  error as {
                    response?: { data?: { message?: string } }
                  }
                ).response?.data?.message ||
                'Could not save active hours. Try again.',
              mode: 'error',
            })
            return false
          }
        },
      },
    })
  }

  if (step === 'service-type') {
    return (
      <ShopSetupScreen
        eyebrow="Set up services"
        title="Appointments and reservations"
        onBack={() => setStep('opening-hours')}
        onContinue={beginBookingSetup}
        disabled={!bookingType}
      >
        <Label className="mt-6">What do people book?</Label>
        <div
          role="radiogroup"
          aria-label="What people book"
          className="space-y-2"
        >
          <AppCard
            rounded="12"
            padding="sm"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#24C166] text-white">
              <MapPinAreaIcon weight="fill" size={24} color="white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#111827]">
                A table or space
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
                Restaurant, lounge, studio, event
              </p>
            </div>
            <Switch
              checked={bookingType === 'SPACE'}
              onCheckedChange={() => setBookingType('SPACE')}
            />
          </AppCard>

          <AppCard
            rounded="12"
            padding="sm"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-[#FB5012] to-[#D72483] text-white">
              <CalendarDotsIcon weight="fill" size={24} color="white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#111827]">
                An appointment
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
                Spa, salon, barber, clinic
              </p>
            </div>
            <Switch
              checked={bookingType === 'APPOINTMENT'}
              onCheckedChange={() => setBookingType('APPOINTMENT')}
            />
          </AppCard>
        </div>
      </ShopSetupScreen>
    )
  }

  return (
    <ShopSetupScreen
      eyebrow="Set up active hours"
      title="Opening and closing times"
      onBack={() => router.back()}
      onContinue={() => setStep('service-type')}
      disabled={!openingHoursValid}
    >
      <Label className="mt-6 text-xs">Days</Label>
      <DaySelector days={days} onChange={handleDaysChange} />

      <Label className="mt-6 text-xs">Time</Label>
      <TimeRangeField
        opensAt={opensAt}
        closesAt={closesAt}
        onOpenChange={handleOpenTimeChange}
        onCloseChange={handleCloseTimeChange}
      />

      <div className="my-6 border-t border-[#EBEBEB]" />

      <AppCard rounded="12" padding="sm" className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-[#FB5012] to-[#D72483] text-white">
          <CalendarDotsIcon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#111827]">
            Set different times
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
            Specify for each day of the week
          </p>
        </div>
        <Switch
          checked={useDifferentTimes}
          onCheckedChange={handleDifferentTimes}
        />
      </AppCard>

      {useDifferentTimes && (
        <ScheduleList
          days={days}
          onEdit={openDayEditor}
          accent
          className="mt-3"
        />
      )}
    </ShopSetupScreen>
  )
}

export default function ActiveHoursSettingsPage() {
  const { data: profile } = useUserProfile()

  if (!profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  return <ActiveHoursSettingsForm profile={profile} />
}
