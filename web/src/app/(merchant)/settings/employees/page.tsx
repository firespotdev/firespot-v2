'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import { AddressBookIcon, UserPlusIcon } from '@phosphor-icons/react'
import { ChevronRight, X } from 'lucide-react'
import {
  AppCard,
  Label,
  LoaderCircle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showNotificationToast,
} from '@/components/ui'
import { useContactPicker } from '@/hooks/use-contact-picker'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useUpdateEmployeeSetup } from '@/services/shop'
import { useUserProfile } from '@/services/users'
import type { UserProfile } from '@/services/users'
import { ShopSetupScreen } from '@/components/shop/shop-setup-screen'

const EMPLOYEE_COUNTS = Array.from({ length: 10 }, (_, index) => index + 1)

function EmployeeSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter()
  const update = useUpdateEmployeeSetup()
  const { selectContacts } = useContactPicker()

  const [employeeCount, setEmployeeCount] = useState(
    profile.employeeSetup ? String(profile.employeeSetup.employeeCount) : '',
  )
  const [staff, setStaff] = useState<
    Array<{ name: string; phoneNumber: string; source: 'contacts' }>
  >(profile.employeeSetup?.staff || [])

  const targetCount = Number(employeeCount || 0)
  const staffSlots = Math.max(0, targetCount - 1)
  const isComplete =
    targetCount > 0 && staff.length === Math.max(0, targetCount - 1)

  const handleCountChange = (value: string) => {
    const nextCount = Number(value)
    setEmployeeCount(value)
    setStaff((current) => current.slice(0, Math.max(0, nextCount - 1)))
  }

  const handleSelectContacts = async () => {
    if (!targetCount) {
      showNotificationToast({
        message: 'Select the number of employees first',
      })
      return
    }
    if (staff.length >= staffSlots) {
      showNotificationToast({ message: 'All employee slots are filled' })
      return
    }

    const result = await selectContacts({ multiple: true })
    if (result.status === 'unsupported') {
      showNotificationToast({
        message: 'Contact selection is not supported on this device',
        mode: 'error',
      })
      return
    }
    if (result.status === 'error') {
      showNotificationToast({
        message: 'Could not select contacts',
        mode: 'error',
      })
      return
    }
    if (result.status !== 'selected') return

    const ownerPhone = profile.fullPhoneNumber
    setStaff((current) => {
      const usedPhones = new Set([
        ownerPhone,
        ...current.map((contact) => contact.phoneNumber),
      ])
      const additions: typeof current = []
      for (const contact of result.contacts) {
        if (usedPhones.has(contact.phoneNumber)) continue
        usedPhones.add(contact.phoneNumber)
        additions.push({ ...contact, source: 'contacts' })
      }
      return [...current, ...additions].slice(0, staffSlots)
    })
  }

  const handleContinue = () => {
    if (!isComplete) return
    update.mutate(
      { employeeCount: targetCount, staff },
      {
        onSuccess: () => router.back(),
        onError: (error: unknown) =>
          showNotificationToast({
            message:
              (
                error as {
                  response?: { data?: { message?: string } }
                }
              ).response?.data?.message || 'Could not save. Try again.',
            mode: 'error',
          }),
      },
    )
  }

  const ownerName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    profile.businessName ||
    'Shop owner'

  return (
    <ShopSetupScreen
      eyebrow="Set up employees"
      title="Give your staff controlled access"
      onBack={() => router.back()}
      onContinue={handleContinue}
      disabled={!isComplete}
      pending={update.isPending}
    >
      <div className="mt-8">
        <Label className="text-sm">Employee count</Label>
        <Select value={employeeCount} onValueChange={handleCountChange}>
          <SelectTrigger className="h-14 rounded-[10px] bg-white px-4 text-base font-medium">
            <SelectValue placeholder="Select number of employees" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEE_COUNTS.map((count) => (
              <SelectItem key={count} value={String(count)}>
                {count} {count === 1 ? 'employee' : 'employees'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-3 mt-7 text-sm font-medium text-[#00000066]">
        {1 + staff.length}{' '}
        {1 + staff.length === 1 ? 'employee' : 'employees'}
      </p>

      <div className="space-y-2">
        <AppCard
          rounded="12"
          padding="md"
          className="flex items-center gap-3"
        >
          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#CED7E1]">
            <Image
              src={profile.profilePhotoUrl || '/images/default_avatar.png'}
              alt={ownerName}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold uppercase text-[#303030]">
              {ownerName}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-[#8A919D]">
              Owner (You)
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
        </AppCard>

        {staff.map((employee) => (
          <AppCard
            key={employee.phoneNumber}
            rounded="12"
            padding="md"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9EDF1] text-sm font-bold text-[#64748B]">
              {employee.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold uppercase text-[#303030]">
                {employee.name}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#8A919D]">
                {employee.phoneNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setStaff((current) =>
                  current.filter(
                    (item) => item.phoneNumber !== employee.phoneNumber,
                  ),
                )
              }
              aria-label={`Remove ${employee.name}`}
              className="flex h-9 w-9 items-center justify-center"
            >
              <X className="h-4 w-4 text-[#A6ADB7]" />
            </button>
          </AppCard>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSelectContacts}
        className="mx-auto mt-8 flex h-11 items-center gap-2 rounded-full bg-[#EEEEEE] px-5 text-[12px] font-bold tracking-[1px] text-black"
      >
        <UserPlusIcon size={20} />
        INVITE STAFF
      </button>

      <div className="my-8 border-t border-[#E5E7EB]" />

      <button
        type="button"
        onClick={handleSelectContacts}
        className="flex w-full items-center gap-3 rounded-[12px] border border-[#F1F1F1] bg-white p-4 text-left shadow-[0px_4px_8px_0px_#0000000A]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0075FF] text-white">
          <AddressBookIcon size={24} weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-black">
            Select from contacts
          </span>
          <span className="mt-0.5 block text-[13px] font-medium leading-[130%] text-[#00000066]">
            Sync or find your contacts that are on firespot to enrich your
            experience
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#A6ADB7]" />
      </button>
    </ShopSetupScreen>
  )
}

export default function EmployeeSettingsPage() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const { data: catalog, isLoading: planLoading } = usePlanCatalog()
  const hasAccess = catalog?.current.effectiveTier === 'PROMAX'

  useEffect(() => {
    if (!planLoading && catalog && !hasAccess) {
      router.replace('/plans')
    }
  }, [catalog, hasAccess, planLoading, router])

  if (planLoading || !profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    )
  }
  if (!hasAccess) return null

  return <EmployeeSettingsForm profile={profile} />
}
