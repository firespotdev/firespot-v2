'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import {
  Button,
  Input,
  Label,
  LoaderCircle,
  showNotificationToast,
} from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ShopSetupScreen } from '@/components/shop/shop-setup-screen'
import {
  DEFAULT_POLICY_DAYS,
  PolicyTimeLimit,
  isValidPolicyDays,
} from '@/components/shop/policy-time-limit'
import {
  useAddCustomPolicy,
  useDeleteCustomPolicy,
  useUpdateCustomPolicy,
} from '@/services/shop'
import { useUserProfile } from '@/services/users'
import type { CustomShopPolicy } from '@/services/auth/interface'

const POLICIES_HREF = '/settings/policies'
const TITLE_LIMIT = 60
const DETAILS_LIMIT = 500

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return String(message[0])
  return typeof message === 'string' ? message : 'Could not save. Try again.'
}

function CustomPolicyForm({ policy }: { policy?: CustomShopPolicy }) {
  const router = useRouter()
  const add = useAddCustomPolicy()
  const update = useUpdateCustomPolicy()
  const remove = useDeleteCustomPolicy()
  const [title, setTitle] = useState(policy?.title ?? '')
  const [details, setDetails] = useState(policy?.details ?? '')
  const [days, setDays] = useState<number | undefined>(
    policy?.appliesWithinDays ?? DEFAULT_POLICY_DAYS,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  const backToPolicies = () => router.replace(POLICIES_HREF)
  const isPending = add.isPending || update.isPending || remove.isPending
  const canSave =
    Boolean(title.trim()) && Boolean(details.trim()) && isValidPolicyDays(days)

  const handleSave = () => {
    if (!canSave || days === undefined) return
    const payload = {
      title: title.trim(),
      details: details.trim(),
      appliesWithinDays: days,
    }
    const options = {
      onSuccess: backToPolicies,
      onError: (error: unknown) =>
        showNotificationToast({ message: errorMessage(error), mode: 'error' }),
    }
    if (policy) update.mutate({ id: policy._id, ...payload }, options)
    else add.mutate(payload, options)
  }

  const handleDelete = async () => {
    if (!policy) return
    try {
      await remove.mutateAsync(policy._id)
      showNotificationToast({ message: 'Policy deleted', mode: 'success' })
      backToPolicies()
    } catch (error) {
      showNotificationToast({ message: errorMessage(error), mode: 'error' })
    }
  }

  return (
    <ShopSetupScreen
      eyebrow="Your Shop policies"
      title={policy ? 'Edit custom policy' : 'Add a custom policy'}
      onBack={backToPolicies}
      onContinue={handleSave}
      continueLabel="Save and continue"
      disabled={!canSave}
      pending={add.isPending || update.isPending}
      className="bg-linear-to-br from-[#FFFFFF] to-[#F6F7F8]"
    >
      <div className="mt-6 space-y-5">
        <div>
          <Label htmlFor="policy-title">Title</Label>
          <Input
            id="policy-title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value.slice(0, TITLE_LIMIT))
            }
            placeholder="Enter a title for this policy"
            className="mt-1.5 bg-white"
          />
        </div>

        <div>
          <Label htmlFor="policy-details">Details</Label>
          <textarea
            id="policy-details"
            value={details}
            onChange={(event) =>
              setDetails(event.target.value.slice(0, DETAILS_LIMIT))
            }
            placeholder="What customers should know"
            rows={6}
            className="mt-1.5 w-full resize-none rounded-md border border-[#DDDDDD] bg-white px-4 py-3 text-base shadow-xs outline-none placeholder:font-normal placeholder:text-[#9CA3AF] focus-visible:border-ring md:text-sm"
          />
        </div>

        <PolicyTimeLimit days={days} onChange={setDays} />

        <p className="rounded-[12px] bg-[#F1F1F1] px-4 py-3 text-[13px] font-medium leading-[135%] text-[#6B7280]">
          Customers see this on your Shop page before they pay for a sale
          order or booking.
        </p>

        {policy && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="w-full font-bold text-[#FF002E] hover:text-[#FF002E]"
          >
            Delete policy
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this policy?"
        description="Customers will no longer see it on your Shop page."
        confirmLabel="Delete"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={handleDelete}
      />
    </ShopSetupScreen>
  )
}

function CustomPolicyContent() {
  const router = useRouter()
  const id = useSearchParams().get('id')
  const { data: profile } = useUserProfile()

  // Editing waits for the saved policy so the form opens filled in.
  if (id && !profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  const policy = id
    ? profile?.shopPolicies?.customPolicies?.find((item) => item._id === id)
    : undefined

  if (id && !policy) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#F5F6F8] px-6 text-center">
        <p className="text-sm font-medium text-[#00000080]">
          This policy no longer exists.
        </p>
        <Button
          type="button"
          onClick={() => router.replace(POLICIES_HREF)}
          className="w-fit px-6"
        >
          Back to policies
        </Button>
      </div>
    )
  }

  return <CustomPolicyForm key={policy?._id ?? 'new'} policy={policy} />
}

export default function CustomPolicyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
          <LoaderCircle />
        </div>
      }
    >
      <CustomPolicyContent />
    </Suspense>
  )
}
