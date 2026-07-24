'use client'

import { ReactNode, useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import {
  ArrowLeft,
  CalendarDays,
  Home,
  MapPin,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import {
  AppCard,
  Button,
  Label,
  Spinner,
  Switch,
  showNotificationToast,
} from '@/components/ui'
import { useUserProfile } from '@/services/users'
import { useUpdateFulfillment } from '@/services/shop'
import type { ShopFulfillment } from '@/services/auth/interface'
import {
  CalendarDotsIcon,
  HouseIcon,
  MapPinAreaIcon,
  TruckIcon,
} from '@phosphor-icons/react'

const OPTIONS: Array<{
  key: keyof ShopFulfillment
  title: string
  subtitle: string
  Icon: ReactNode
  bg: string
}> = [
  {
    key: 'walkIn',
    title: 'Walk in',
    subtitle: 'They come to me',
    Icon: <MapPinAreaIcon size={24} weight="fill" color="white" />,
    bg: '#24C166',
  },
  {
    key: 'reservations',
    title: 'Reservations',
    subtitle: 'They book ahead',
    Icon: <CalendarDotsIcon size={24} weight="fill" color="white" />,
    bg: '#F04468',
  },
  {
    key: 'homeService',
    title: 'Home service',
    subtitle: 'Services, repairs, installations',
    Icon: <HouseIcon size={24} weight="fill" color="white" />,
    bg: '#F5A623',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    subtitle: 'By myself or with 3rd-party services',
    Icon: <TruckIcon size={24} weight="fill" color="white" />,
    bg: '#2F5BFF',
  },
]

export default function FulfillmentSettingsPage() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const update = useUpdateFulfillment()

  const [flags, setFlags] = useState<ShopFulfillment>(
    profile?.fulfillment ?? {},
  )

  const toggle = (key: keyof ShopFulfillment, value: boolean) =>
    setFlags((prev) => ({ ...prev, [key]: value }))

  const handleContinue = () => {
    update.mutate(flags, {
      onSuccess: () => router.back(),
      onError: () =>
        showNotificationToast({ message: 'Could not save. Try again.' }),
    })
  }

  return (
    <div className="min-h-dvh bg-[#F5F6F8] font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="self-start px-4 py-3.5 flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        {/* flex-1 pushes the footer to the bottom; it scrolls if content is tall */}
        <div className="px-4 flex-1">
          <p className="text-sm text-[#00000080] font-medium mt-0.5">
            Set up Shop
          </p>
          <h1 className="text-[20px] -tracking-[0.4px] font-bold text-black mt-1 leading-[120%]">
            How do customers get your goods/services?
          </h1>

          <Label className="text-sm text-[#00000080] font-medium mt-6">
            Toggle all that apply
          </Label>

          <div className="space-y-2">
            {OPTIONS.map(({ key, title, subtitle, Icon, bg }) => (
              <AppCard
                key={key}
                rounded="12"
                padding="sm"
                className="flex items-center gap-3"
              >
                <span
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: bg }}
                >
                  {Icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black">{title}</p>
                  <p className="text-[12px] text-[#00000080] font-medium">
                    {subtitle}
                  </p>
                </div>
                <Switch
                  checked={flags[key] === true}
                  onCheckedChange={(v) => toggle(key, v)}
                />
              </AppCard>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#F1F1F1] rounded-t-[12px] p-4 w-full">
          <Button
            onClick={handleContinue}
            disabled={update.isPending}
            className="w-full h-14 font-bold"
          >
            {update.isPending ? <Spinner /> : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
