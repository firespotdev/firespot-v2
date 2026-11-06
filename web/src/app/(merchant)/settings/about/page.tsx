'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import {
  BackButton,
  Button,
  EmptyState,
  Input,
  Label,
  LoaderCircle,
  Spinner,
} from '@/components/ui'
import { useUserProfile } from '@/services/users'
import { useUpdateBusinessName } from '@/services/shop'
import { useSafeBack } from '@/hooks/use-safe-back'

export default function AboutShopPage() {
  const router = useRouter()
  const handleBack = useSafeBack('/shop-setup')
  const profile = useUserProfile()
  const update = useUpdateBusinessName()
  const [editedName, setEditedName] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const businessName = editedName ?? profile.data?.businessName ?? ''

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!businessName.trim() || update.isPending) return
    setError(undefined)
    try {
      await update.mutateAsync({ businessName: businessName.trim() })
      router.replace('/shop-setup')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(
        typeof message === 'string'
          ? message
          : 'Could not save your business name. Please try again.',
      )
    }
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col">
        <header className="px-4 py-3">
          <BackButton onClick={handleBack} disabled={update.isPending} />
        </header>
        {profile.isLoading ? (
          <div
            role="status"
            aria-label="Loading shop details"
            className="flex flex-1 items-center justify-center"
          >
            <LoaderCircle />
          </div>
        ) : profile.isError || !profile.data ? (
          <div className="flex flex-1 items-center px-4">
            <EmptyState
              emoji="🏪"
              title="Shop details could not load"
              details="Please try again to edit your business name."
              cta={
                <Button
                  type="button"
                  onClick={() => void profile.refetch()}
                  className="mt-6 w-fit px-6"
                >
                  Retry
                </Button>
              }
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <main className="flex-1 px-4 pb-8">
              <h1 className="text-xl font-bold leading-[130%] -tracking-[0.4px] text-black">
                About your Shop
              </h1>
              <p className="mt-2 text-sm font-medium leading-5 text-[#00000080]">
                This is the business name customers see on Firespot.
              </p>
              <div className="mt-6">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  name="businessName"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(event) => {
                    setEditedName(event.target.value)
                    setError(undefined)
                  }}
                  required
                  maxLength={100}
                  disabled={update.isPending}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'business-name-error' : undefined}
                />
                {error && (
                  <p
                    id="business-name-error"
                    role="alert"
                    className="mt-2 text-xs leading-4 text-[#FF002E]"
                  >
                    {error}
                  </p>
                )}
              </div>
            </main>
            <footer className="sticky bottom-0 border-t border-[#F1F1F1] bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="submit"
                disabled={
                  update.isPending ||
                  !businessName.trim() ||
                  businessName.trim() === profile.data.businessName?.trim()
                }
              >
                {update.isPending ? <Spinner /> : 'Save changes'}
              </Button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
