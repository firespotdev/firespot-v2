'use client'

import { useMemo, useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft, Store } from 'lucide-react'
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
  showNotificationToast,
} from '@/components/ui'
import {
  NIGERIAN_STATES,
  STATE_LGA_MAP,
} from '@/lib/utils/nigerian-states-lgas'
import { useUserProfile } from '@/services/users'
import { useUpdateLocation } from '@/services/shop'
import { StorefrontIcon } from '@phosphor-icons/react'

const BRANCH_OPTIONS = ['1', '2', '3', '4', '5', '6+']

export default function LocationsSettingsPage() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const update = useUpdateLocation()

  const existing = profile?.mainAddress
  const [branches, setBranches] = useState(
    profile?.branchCount ? String(profile.branchCount) : '',
  )
  const [state, setState] = useState(existing?.state ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [insideMarket, setInsideMarket] = useState(
    existing?.insideMarket === true,
  )

  // Cities depend on the chosen state; reset the city when the state changes.
  const cities = useMemo(
    () => (state ? (STATE_LGA_MAP[state] ?? []) : []),
    [state],
  )

  const onStateChange = (value: string) => {
    setState(value)
    setCity('')
  }

  const handleSave = () => {
    // "6+" has no exact count; store 6 as the floor.
    const branchCount = branches
      ? branches === '6+'
        ? 6
        : Number(branches)
      : undefined

    update.mutate(
      {
        state: state || undefined,
        city: city || undefined,
        address: address.trim() || undefined,
        insideMarket,
        branchCount,
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          showNotificationToast({ message: 'Could not save. Try again.' }),
      },
    )
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
            Set up location
          </p>
          <h1 className="text-[20px] -tracking-[0.4px] font-bold text-black mt-1.5">
            Where can customers find you?
          </h1>

          <div className="space-y-6 mt-6">
            <div>
              <Label>Locations</Label>
              <Select value={branches} onValueChange={setBranches}>
                <SelectTrigger className="font-medium">
                  <SelectValue placeholder="Select number of branches" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} {n === '1' ? 'branch' : 'branches'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Main address</Label>
              <div>
                <div className="flex">
                  <Select value={state} onValueChange={onStateChange}>
                    <SelectTrigger className="font-medium flex-1 min-w-0 rounded-r-none rounded-b-none border-r-0 border-b-0">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={city}
                    onValueChange={setCity}
                    disabled={!state}
                  >
                    <SelectTrigger className="font-medium disabled:opacity-100 flex-1 min-w-0 rounded-l-none rounded-b-none border-b-0">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your main business address"
                  className="font-medium rounded-t-none"
                />
              </div>
            </div>

            <AppCard
              rounded="12"
              padding="sm"
              className="flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-linear-to-r from-[#FB5012] to-[#D72483]">
                <StorefrontIcon size={24} weight="fill" color="white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-black">
                  Inside a market or plaza?
                </p>
                <p className="text-[12px] text-[#00000080] font-medium">
                  Toggle to help customers find you
                </p>
              </div>
              <Switch
                checked={insideMarket}
                onCheckedChange={setInsideMarket}
              />
            </AppCard>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#F1F1F1] rounded-t-[12px] p-4 w-full">
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="w-full font-bold"
          >
            {update.isPending ? <Spinner /> : 'That’s my spot'}
          </Button>
        </div>
      </div>
    </div>
  )
}
