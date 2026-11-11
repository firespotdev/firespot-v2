'use client'

import { useState } from 'react'
import { isAxiosError } from 'axios'
import {
  Button,
  CircularIconButton,
  ConfirmDialog,
  Input,
  Label,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import { SpotAddressFields } from '@/components/spots/spot-address-fields'
import { formatCurrency } from '@/lib/utils'
import {
  useCreateSpot,
  useDeleteSpot,
  useUpdateSpot,
  type Spot,
  type SpotAddress,
} from '@/services/spots/spots-api'

interface Props {
  /** The spot being edited; absent when adding one. */
  spot?: Spot
  /** Monthly charge for an extra spot on Pro Max, confirmed before adding. */
  monthlyCharge?: number
  closeDrawer: () => void
}

const errorMessage = (error: unknown, fallback: string) =>
  (isAxiosError(error) && error.response?.data?.message) || fallback

const addressOf = (spot?: Spot): SpotAddress => ({
  state: spot?.state ?? '',
  city: spot?.city ?? '',
  address: spot?.address ?? '',
  additionalDetails: spot?.additionalDetails ?? '',
  insideMarket: spot?.insideMarket ?? false,
  market: spot?.market ?? '',
  shoppingComplex: spot?.shoppingComplex ?? '',
  shopNumber: spot?.shopNumber ?? '',
  landmark: spot?.landmark ?? '',
})

/** Trims text fields and drops market details when the switch is off. */
const cleaned = (address: SpotAddress): SpotAddress => {
  const text = (value?: string) => value?.trim() || undefined
  return {
    state: text(address.state),
    city: text(address.city),
    address: text(address.address),
    additionalDetails: text(address.additionalDetails),
    insideMarket: Boolean(address.insideMarket),
    ...(address.insideMarket
      ? {
          market: text(address.market),
          shoppingComplex: text(address.shoppingComplex),
          shopNumber: text(address.shopNumber),
          landmark: text(address.landmark),
        }
      : {}),
  }
}

/** Add a spot, or edit one: its name and where customers can find it. */
export function SpotFormDrawer({ spot, monthlyCharge, closeDrawer }: Props) {
  const createSpot = useCreateSpot()
  const updateSpot = useUpdateSpot()
  const deleteSpot = useDeleteSpot()
  const [name, setName] = useState(spot?.name ?? '')
  const [address, setAddress] = useState<SpotAddress>(() => addressOf(spot))
  // One key per sheet, so a retried add never creates or bills twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [confirmCharge, setConfirmCharge] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSaving = createSpot.isPending || updateSpot.isPending
  const canSave = Boolean(
    name.trim() && address.state && address.address?.trim(),
  )

  const save = async () => {
    const payload = { name: name.trim(), ...cleaned(address) }
    try {
      if (spot) {
        await updateSpot.mutateAsync({ id: spot._id, payload })
      } else {
        await createSpot.mutateAsync({ ...payload, idempotencyKey })
      }
      showNotificationToast({
        message: spot ? 'Spot updated' : 'Spot added',
        mode: 'success',
      })
      closeDrawer()
    } catch (error) {
      showNotificationToast({
        message: errorMessage(error, 'Could not save this spot. Try again.'),
        mode: 'error',
      })
    }
  }

  const handleSubmit = () => {
    if (!canSave || isSaving) return
    if (!spot && monthlyCharge) {
      setConfirmCharge(true)
      return
    }
    void save()
  }

  const remove = async () => {
    if (!spot) return
    try {
      await deleteSpot.mutateAsync(spot._id)
      showNotificationToast({ message: 'Spot removed', mode: 'success' })
      closeDrawer()
    } catch (error) {
      showNotificationToast({
        message: errorMessage(error, 'Could not remove this spot. Try again.'),
        mode: 'error',
      })
    }
  }

  return (
    <div className="flex max-h-[93dvh] flex-col font-satoshi">
      <header className="relative flex h-13 shrink-0 items-center justify-center px-4">
        <h2 className="text-[17px] font-bold text-black">
          {spot ? 'Edit spot' : 'Add a spot'}
        </h2>
        <span className="absolute right-4">
          <CircularIconButton icon="x" onClick={closeDrawer} />
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-4">
        <div>
          <Label htmlFor="spot-name">Name</Label>
          <Input
            id="spot-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Give this spot a name"
            maxLength={100}
            className="font-medium"
          />
        </div>

        <SpotAddressFields value={address} onChange={setAddress} />

        {spot && !spot.isPrimary && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteSpot.isPending}
            className="w-full font-bold text-[#FF002E] hover:text-[#FF002E]"
          >
            Remove spot
          </Button>
        )}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          onClick={handleSubmit}
          disabled={!canSave || isSaving}
          className="w-full font-bold"
        >
          {isSaving ? <Spinner /> : 'That’s my spot'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmCharge}
        onOpenChange={setConfirmCharge}
        title="Add this spot?"
        description={`Each extra spot costs ₦${formatCurrency(monthlyCharge ?? 0)} a month, charged to your saved card.`}
        confirmLabel="Add spot"
        isLoading={createSpot.isPending}
        onConfirm={save}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove this spot?"
        description="Customers will no longer see it, and its monthly charge stops."
        confirmLabel="Remove"
        variant="danger"
        isLoading={deleteSpot.isPending}
        onConfirm={remove}
      />
    </div>
  )
}
