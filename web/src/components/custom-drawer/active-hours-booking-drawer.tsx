'use client'

import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import type {
  ActiveHoursSetup,
  ShopDaySchedule,
} from '@/services/auth/interface'
import {
  AppCard,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
} from '@/components/ui'
import { DaySelector } from '@/components/shop/day-selector'
import { NumberStepper } from '@/components/shop/number-stepper'
import { ScheduleList } from '@/components/shop/schedule-list'
import { scheduleIsValid } from '@/components/shop/schedule-utils'
import { useDrawerStore } from '@/services/drawer'
import { CalendarCheckIcon, CalendarXIcon } from '@phosphor-icons/react'

type AppointmentSetup = ActiveHoursSetup['appointmentAndReservation']
type DrawerStep = 'availability' | 'capacity' | 'details'

interface ActiveHoursBookingDrawerProps {
  initialValue: AppointmentSetup
  onComplete: (value: AppointmentSetup) => Promise<boolean>
  closeDrawer: () => void
}

export function ActiveHoursBookingDrawer({
  initialValue,
  onComplete,
  closeDrawer,
}: ActiveHoursBookingDrawerProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [step, setStep] = useState<DrawerStep>('availability')
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const setBookableDays = (days: ShopDaySchedule[]) =>
    setValue((current) => ({
      ...current,
      bookableHours: { days },
    }))

  const openDayEditor = (day: ShopDaySchedule) => {
    openDrawer({
      type: 'day-time-editor',
      props: {
        days: value.bookableHours.days,
        initialDay: day.day,
        onSave: setBookableDays,
      },
    })
  }

  const capacityValid =
    value.bookingType === 'SPACE'
      ? Boolean(
          value.capacity.guestsAtOnce &&
          value.capacity.largestGroup &&
          value.capacity.largestGroup <= value.capacity.guestsAtOnce,
        )
      : Boolean(value.capacity.customersAtOnce)

  const handleDone = async () => {
    setIsSaving(true)
    const saved = await onComplete(value)
    setIsSaving(false)
    if (saved) closeDrawer()
  }

  const title = {
    availability: 'When can people book?',
    capacity: 'How many can you take?',
    details: 'A few more things',
  }[step]

  return (
    <div className="flex w-full flex-col bg-[#F5F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex shrink-0 items-center justify-between py-3.5">
        {step === 'availability' ? (
          <div className="h-6 w-6" />
        ) : (
          <button
            type="button"
            onClick={() =>
              setStep(step === 'details' ? 'capacity' : 'availability')
            }
            aria-label="Previous step"
            className="flex items-center justify-center"
          >
            <ArrowLeft className="h-6 w-6 text-black" />
          </button>
        )}
        <h2 className="text-[16px] font-bold -tracking-[0.4px] text-black">
          {title}
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close active hours setup"
          className="flex items-center justify-center"
        >
          <X size={24} className="text-black" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-5">
        {step === 'availability' && (
          <>
            <p className="mt-2 rounded-[8px] bg-[#E8EAED] px-3 py-1.5 text-center text-xs font-medium text-[#545F6CE5]">
              Copied from opening hours by default, edit if they differ.
            </p>
            <Label className="mt-4">Days</Label>
            <DaySelector
              days={value.bookableHours.days}
              onChange={setBookableDays}
            />
            <Label className="mt-4">Times</Label>
            <ScheduleList
              days={value.bookableHours.days}
              onEdit={openDayEditor}
            />
          </>
        )}

        {step === 'capacity' && (
          <div className="pt-2">
            {value.bookingType === 'SPACE' ? (
              <>
                <NumberStepper
                  label="Guests at once"
                  value={value.capacity.guestsAtOnce || 0}
                  onChange={(guestsAtOnce) =>
                    setValue((current) => ({
                      ...current,
                      capacity: { ...current.capacity, guestsAtOnce },
                    }))
                  }
                  className="mb-6"
                />
                <NumberStepper
                  label="Largest group"
                  value={value.capacity.largestGroup || 0}
                  max={value.capacity.guestsAtOnce || 999}
                  onChange={(largestGroup) =>
                    setValue((current) => ({
                      ...current,
                      capacity: { ...current.capacity, largestGroup },
                    }))
                  }
                  className="mb-4"
                />
                <p className="rounded-[12px] bg-[#E5E7EB80] px-4 py-3 text-[13px] font-medium leading-[130%] text-[#6B7280]">
                  Based on total available chairs, beds or staff - whichever
                  runs out first.
                </p>
              </>
            ) : (
              <NumberStepper
                label="Customers at once"
                value={value.capacity.customersAtOnce || 0}
                onChange={(customersAtOnce) =>
                  setValue((current) => ({
                    ...current,
                    capacity: { ...current.capacity, customersAtOnce },
                  }))
                }
                className="mb-4"
              />
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-3 pt-3">
            <AppCard
              rounded="12"
              padding="sm"
              className="flex items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#24C166] text-white">
                <CalendarCheckIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#111827]">
                  Instant confirmation
                </p>
                <p className="text-[12px] font-medium text-[#64748B]">
                  Leave off for manual confirmation
                </p>
              </div>
              <Switch
                checked={value.instantConfirmation}
                onCheckedChange={(instantConfirmation) =>
                  setValue((current) => ({
                    ...current,
                    instantConfirmation,
                  }))
                }
              />
            </AppCard>

            <AppCard
              rounded="12"
              padding="sm"
              className="flex items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-linear-to-br from-[#FB5012] to-[#D72483] text-white">
                <CalendarXIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#111827]">
                  Free cancellations
                </p>
                <p className="text-[12px] font-medium text-[#64748B]">
                  Leave off if it always comes at a fee
                </p>
              </div>
              <Switch
                checked={value.freeCancellations}
                onCheckedChange={(freeCancellations) =>
                  setValue((current) => ({
                    ...current,
                    freeCancellations,
                  }))
                }
              />
            </AppCard>

            <div className="pt-6">
              <p className="mb-2 text-sm font-medium text-[#64748B]">
                Booking deposit per guest (comes off the total bill)
              </p>
              <div className="flex bg-white">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-base font-medium text-[#111827]">
                    {value.deposit.depositType === 'PERCENTAGE' ? '' : 'NGN'}
                  </span>
                  {value.deposit.depositType === 'PERCENTAGE' && (
                    <span className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-base font-medium text-[#111827]">
                      %
                    </span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    max={
                      value.deposit.depositType === 'PERCENTAGE'
                        ? 100
                        : undefined
                    }
                    value={value.deposit.amount || ''}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        deposit: {
                          ...current.deposit,
                          amount: Math.min(
                            current.deposit.depositType === 'PERCENTAGE'
                              ? 100
                              : Number.POSITIVE_INFINITY,
                            Math.max(0, Number(event.target.value)),
                          ),
                        },
                      }))
                    }
                    className={`h-11 rounded-r-none text-base font-medium ${
                      value.deposit.depositType === 'PERCENTAGE'
                        ? 'pl-4 pr-9'
                        : 'pl-14'
                    }`}
                  />
                </div>
                <Select
                  value={value.deposit.depositType}
                  onValueChange={(depositType: 'FIXED' | 'PERCENTAGE') =>
                    setValue((current) => ({
                      ...current,
                      deposit: {
                        ...current.deposit,
                        amount:
                          depositType === 'PERCENTAGE'
                            ? Math.min(current.deposit.amount, 100)
                            : current.deposit.amount,
                        depositType,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-11 w-[42%] rounded-l-none border-l-0 text-base font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-5">
              <NumberStepper
                label="Number of hours allowed for free cancellation"
                value={value.freeCancellationHours || 0}
                min={0}
                max={720}
                displayValue={`${value.freeCancellationHours || 0} ${
                  value.freeCancellationHours === 1 ? 'hour' : 'hours'
                }`}
                onChange={(freeCancellationHours) =>
                  setValue((current) => ({
                    ...current,
                    freeCancellationHours,
                  }))
                }
              />
            </div>

            <p className="rounded-[12px] bg-[#E5E7EB99] px-4 py-3 text-[13px] font-medium leading-[130%] text-[#64748B]">
              Deposits would be refunded if customer cancels within
              free-cancellation window and forfeited if they don’t cancel within
              that time.
            </p>
          </div>
        )}
      </div>

      <Button
        type="button"
        disabled={
          isSaving ||
          (step === 'availability' &&
            !scheduleIsValid(value.bookableHours.days)) ||
          (step === 'capacity' && !capacityValid)
        }
        onClick={() => {
          if (step === 'availability') setStep('capacity')
          else if (step === 'capacity') setStep('details')
          else void handleDone()
        }}
        className="shrink-0"
      >
        {isSaving ? <Spinner /> : step === 'details' ? 'Done' : 'Next'}
      </Button>
    </div>
  )
}
