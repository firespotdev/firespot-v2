'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button, Input, Label, Spinner } from '@/components/ui'
import { useUpdateProfile, useAuthStore, useAuthReady } from '@/services/auth'

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | undefined>()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const onboardingCompleted = useAuthStore(
    (state) => state.onboardingCompleted,
  )
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const updateProfile = useUpdateProfile()
  const hydrated = useAuthReady()

  const redirectPath = searchParams.get('redirect')

  // Guard: must be authenticated; already-onboarded users don't belong here
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (onboardingCompleted) {
      router.replace(
        redirectPath || (user?.role === 'merchant' ? '/profile' : '/home'),
      )
    }
  }, [hydrated, isAuthenticated, onboardingCompleted, router, redirectPath, user])

  const handleBack = () => {
    // Onboarding is the first authenticated screen; going back returns to login
    logout()
    router.replace('/login')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name')
      return
    }

    updateProfile.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim() },
      {
        onSuccess: () => {
          // Deep links (e.g. a scanned payment QR) take priority; otherwise
          // show the full-screen business intro once.
          router.replace(redirectPath || '/onboarding/business')
        },
        onError: (err: any) => {
          const message =
            err?.response?.data?.message ||
            'Failed to save your name. Please try again.'
          setError(message)
        },
      },
    )
  }

  const errorInputClassName = error
    ? 'border-[#FF002E] focus-visible:border-[#FF002E] focus-visible:ring-[#FF002E]/20 focus-visible:ring-[3px]'
    : ''

  return (
    <div className="h-dvh bg-white">
      <div className="max-w-[500px] mx-auto h-full pt-8 pb-4 px-4 flex flex-col font-satoshi">
        <button
          onClick={handleBack}
          className="self-start mb-6"
          type="button"
          disabled={updateProfile.isPending}
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="flex-1 flex flex-col w-full">
          <h1 className="font-bold text-[20px] text-black mb-3">
            What should we call you?
          </h1>
          <p className="text-sm font-medium text-[#00000080] mb-6 max-w-[345px]">
            This is how your name would show up on payments you make to
            businesses on the platform.
          </p>

          <form
            onSubmit={handleSubmit}
            className="w-full flex-1 min-h-0 flex flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Label>Full name</Label>
              <div className="flex">
                <Input
                  type="text"
                  placeholder="First name"
                  autoComplete="given-name"
                  value={firstName}
                  disabled={updateProfile.isPending}
                  className={`font-medium rounded-r-none border-r-0 ${errorInputClassName}`}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (error) setError(undefined)
                  }}
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  autoComplete="family-name"
                  value={lastName}
                  disabled={updateProfile.isPending}
                  className={`font-medium rounded-l-none ${errorInputClassName}`}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (error) setError(undefined)
                  }}
                />
              </div>
              {error && (
                <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
                    !
                  </span>
                  {error}
                </p>
              )}
            </div>

            {/* Bottom-stuck footer: divider sits 16px above the button */}
            <div className="shrink-0 -mx-4 border-t border-[#F1F1F1] px-4 pt-4">
              <Button type="submit" className="w-full">
                {updateProfile.isPending ? <Spinner /> : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <OnboardingPageContent />
    </Suspense>
  )
}
