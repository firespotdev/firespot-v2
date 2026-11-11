'use client'

import { useMemo } from 'react'
import { StorefrontIcon } from '@phosphor-icons/react'
import {
  AppCard,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui'
import { NIGERIAN_STATES, STATE_LGA_MAP } from '@/lib/utils/nigerian-states-lgas'
import type { SpotAddress } from '@/services/spots/spots-api'

interface Props {
  value: SpotAddress
  onChange: (next: SpotAddress) => void
}

const MARKET_FIELDS: Array<{
  key: 'market' | 'shoppingComplex' | 'shopNumber' | 'landmark'
  label: string
  placeholder: string
  maxLength: number
}> = [
  { key: 'market', label: 'Market (optional)', placeholder: 'Name of the market', maxLength: 150 },
  {
    key: 'shoppingComplex',
    label: 'Shopping complex (optional)',
    placeholder: 'Name of the building/plaza your Shop is in',
    maxLength: 200,
  },
  { key: 'shopNumber', label: 'Shop number (optional)', placeholder: 'eg 32B', maxLength: 50 },
  {
    key: 'landmark',
    label: 'Landmark (optional)',
    placeholder: 'For example, Beside White House',
    maxLength: 300,
  },
]

/** State, city and street, extra directions, and where in a market it is. */
export function SpotAddressFields({ value, onChange }: Props) {
  const cities = useMemo(
    () => (value.state ? (STATE_LGA_MAP[value.state] ?? []) : []),
    [value.state],
  )
  const set = (patch: SpotAddress) => onChange({ ...value, ...patch })

  return (
    <>
      <div>
        <Label>Address</Label>
        <div className="flex">
          {/* A new state clears the city, which belongs to the old state. */}
          <Select
            value={value.state ?? ''}
            onValueChange={(state) => set({ state, city: '' })}
          >
            <SelectTrigger className="min-w-0 flex-1 rounded-r-none rounded-b-none border-r-0 border-b-0 font-medium">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.city ?? ''}
            onValueChange={(city) => set({ city })}
            disabled={!value.state}
          >
            <SelectTrigger className="min-w-0 flex-1 rounded-l-none rounded-b-none border-b-0 font-medium disabled:opacity-100">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={value.address ?? ''}
          onChange={(event) => set({ address: event.target.value })}
          placeholder="Enter your main business address"
          maxLength={300}
          className="rounded-t-none font-medium"
        />
      </div>

      <div>
        <Label htmlFor="spot-details">Additional details (optional)</Label>
        <Input
          id="spot-details"
          value={value.additionalDetails ?? ''}
          onChange={(event) => set({ additionalDetails: event.target.value })}
          placeholder="e.g. Building floor or number"
          maxLength={200}
          className="font-medium"
        />
      </div>

      <AppCard rounded="12" padding="sm" className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-r from-[#FB5012] to-[#D72483]">
          <StorefrontIcon size={24} weight="fill" color="white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-black">
            Inside a market or plaza?
          </p>
          <p className="text-[12px] font-medium text-[#00000080]">
            Toggle to help customers find you
          </p>
        </div>
        <Switch
          checked={Boolean(value.insideMarket)}
          onCheckedChange={(insideMarket) => set({ insideMarket })}
        />
      </AppCard>

      {value.insideMarket &&
        MARKET_FIELDS.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`spot-${field.key}`}>{field.label}</Label>
            <Input
              id={`spot-${field.key}`}
              value={value[field.key] ?? ''}
              onChange={(event) => set({ [field.key]: event.target.value })}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="font-medium"
            />
          </div>
        ))}
    </>
  )
}
