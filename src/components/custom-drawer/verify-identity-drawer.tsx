'use client'

import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button, CircularIconButton, TagFooter } from '../ui'
import { useDrawerStore } from '@/services/drawer'
import { useKycStatus } from '@/services/kyc'

interface VerifyIdentityDrawerProps {
  closeDrawer: () => void
}

/**
 * Prompt shown after a plan purchase (and from the profile) to start — or
 * resume — SmileID verification. Copy per design.
 */
export function VerifyIdentityDrawer({}: VerifyIdentityDrawerProps) {
  const router = useRouter()
  const { closeDrawer } = useDrawerStore()
  const { data: status } = useKycStatus()

  // "Continue" rather than "Start" once at least one step is already done.
  const isResuming = Boolean(
    status?.nextStep && status.steps.some((step) => step.status === 'passed'),
  )

  const handleContinue = () => {
    closeDrawer('verify-identity')
    router.push('/verify')
  }

  return (
    <div className="flex flex-col h-full font-satoshi">
      <header className="px-4 pt-2 flex justify-end items-center">
        <CircularIconButton
          icon="x"
          onClick={() => closeDrawer('verify-identity')}
        />
      </header>

      <div className="px-6 pb-2 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#E9F9F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#24C166] flex items-center justify-center">
            <Check className="w-5 h-5 text-white stroke-[3px]" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-black mt-5">
          Verify your identity
        </h2>
        <p className="text-sm text-[#00000080] mt-2">
          Show your customers that your business is legitimate with company
          registration documents and identification of Directors.
        </p>

        <Button
          onClick={handleContinue}
          className="w-full h-13 mt-6 rounded-full bg-black text-white font-bold"
        >
          {isResuming ? 'Continue verification' : 'Continue'}
        </Button>
      </div>

      <TagFooter />
    </div>
  )
}
