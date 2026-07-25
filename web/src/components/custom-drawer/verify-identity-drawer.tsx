'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '../ui'
import { useDrawerStore } from '@/services/drawer'
import { X } from 'lucide-react'

interface VerifyIdentityDrawerProps {
  closeDrawer: () => void
}

export function VerifyIdentityDrawer({}: VerifyIdentityDrawerProps) {
  const { closeDrawer } = useDrawerStore()

  return (
    <div className="flex flex-col h-full font-satoshi">
      <header className="px-4 py-3.5 flex justify-end items-center">
        <X
          aria-label="button"
          role="button"
          size={24}
          color="black"
          onClick={() => closeDrawer('verify-identity')}
        />
      </header>

      <div className="py-6 px-8 flex flex-col items-center text-center">
        <Image src="/icons/verified.svg" width={64} height={64} alt="badge" />

        <h2 className="text-xl font-bold text-black mt-4">
          Verify your identity
        </h2>
        <p className="text-sm text-[#00000080] font-medium mt-1">
          Show your customers that your business is legitimate with company
          registration documents and identification of Directors.
        </p>
      </div>
      <div className="border-t border-[#F1F1F1] p-4">
        <Button asChild className="w-full font-bold">
          <Link
            href="/verify"
            onClick={() => closeDrawer('verify-identity')}
            prefetch
          >
            Continue
          </Link>
        </Button>
      </div>
    </div>
  )
}
