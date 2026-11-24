'use client'

import { useState } from 'react'
import { isAxiosError } from 'axios'
import { ChevronRight, X } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  ContactCardIcon,
  Input,
  Label,
  PhoneInput,
  showNotificationToast,
  Spinner,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  getMerchantInviteUrl,
  useMerchantReferralCode,
} from '@/services/merchant-referrals'
import { useUserProfile } from '@/services/users'
import {
  useCreateSupplier,
  useDeleteSupplier,
  useUpdateSupplier,
  type Supplier,
} from '@/services/expenses'

interface Props {
  /** The supplier being edited; leave out to add a new one. */
  supplier?: Supplier
  onSaved: (supplier: Supplier) => void
  onBack?: () => void
}

/** "0803…" or "+234803…" as the 10 local digits the phone input expects. */
const localDigits = (phoneNumber?: string) =>
  (phoneNumber ?? '').replace(/^\+234/, '').replace(/\D/g, '')

export function AddSupplierDrawer({ supplier, onSaved, onBack }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(localDigits(supplier?.phoneNumber))

  const deleteSupplier = useDeleteSupplier()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!supplier) return
    try {
      await deleteSupplier.mutateAsync(supplier._id)
      setConfirmDelete(false)
      closeDrawer('add-supplier')
      showNotificationToast({ message: 'Supplier deleted', mode: 'success' })
    } catch {
      showNotificationToast({
        message: 'Could not delete this supplier. Please try again.',
        mode: 'error',
      })
    }
  }

  const { data: profile } = useUserProfile()
  const { data: codeData } = useMerchantReferralCode(!supplier)
  const referralCode = codeData?.referralCode

  /** Lets the merchant send the sign-up link themselves, e.g. on WhatsApp. */
  const handleShareInvite = async () => {
    if (!referralCode) return
    const url = getMerchantInviteUrl(referralCode)
    const businessName = profile?.businessName || 'A business you supply'
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Firespot',
          text: `${businessName} saved you as a supplier on Firespot.`,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      showNotificationToast({ message: 'Invitation link copied', mode: 'success' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showNotificationToast({
        message: 'Could not share the invitation link.',
        mode: 'error',
      })
    }
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending
  const isValid = name.trim().length > 0 && phone.length >= 10

  const handleSave = () => {
    if (!isValid || isPending) return
    const payload = { name: name.trim(), phoneNumber: phone }
    const options = {
      onSuccess: (saved: Supplier) => {
        closeDrawer('add-supplier')
        onSaved(saved)
      },
      onError: (error: unknown) => {
        const message =
          isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)?.message
        showNotificationToast({
          message: message || 'Could not save this supplier.',
          mode: 'error',
        })
      },
    }
    if (supplier) {
      updateSupplier.mutate({ id: supplier._id, payload }, options)
    } else {
      createSupplier.mutate(payload, options)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-125 flex-col px-4 pb-4 font-satoshi">
      <div className="flex w-full justify-end py-2">
        {/* Opened from the payment flow, closing returns to the picker so the
            expense in progress isn't lost. */}
        <button
          type="button"
          onClick={onBack ?? (() => closeDrawer('add-supplier'))}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        >
          <X size={24} color="black" />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <ContactCardIcon className="mb-4" />
        <h2 className="mb-1 text-[20px] font-bold -tracking-[0.4px] text-black">
          {supplier ? 'Edit supplier' : 'Add new supplier'}
        </h2>
        <p className="mb-6 text-sm leading-normal font-medium text-[#00000080]">
          {supplier
            ? 'Update how this supplier appears on your expenses.'
            : 'Your supplier would get a link on this phone number to continue to their firespot profile.'}
        </p>

        <div className="w-full text-left">
          <Label>Contact information</Label>
          <div className="flex flex-col rounded-[8px] bg-white">
            <Input
              type="text"
              placeholder="Business name"
              aria-label="Business name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              className="h-12 w-full rounded-none rounded-t-[8px] border-b-[0.5px] border-[#0000001A] font-medium"
            />
            <PhoneInput
              className="w-full"
              inputClassName="w-full font-medium h-12 border-[#0000001A] border-t-[0.5px] rounded-none rounded-b-[8px] focus-visible:z-10 focus-visible:relative"
              value={phone}
              onChange={setPhone}
            />
          </div>
        </div>

        {!supplier && (
          <button
            type="button"
            onClick={() => void handleShareInvite()}
            disabled={!referralCode}
            className="mt-5 flex items-center gap-1 text-sm font-medium text-[#6B7280] disabled:opacity-50"
          >
            <span className="underline underline-offset-4">
              Share invitation link instead
            </span>
            <ChevronRight size={16} />
          </button>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={!isValid || isPending}
          className="mt-6 active:scale-[0.98]"
        >
          {isPending ? <Spinner /> : supplier ? 'Save' : 'Continue'}
        </Button>

        {supplier && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 h-11 text-sm font-bold text-[#FF3B30]"
          >
            Delete supplier
          </button>
        )}
      </div>

      {supplier && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this supplier?"
          description="Expenses you recorded with them keep their name and phone number."
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteSupplier.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
