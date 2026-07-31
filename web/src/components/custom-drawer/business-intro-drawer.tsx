'use client'

import Image from 'next/image'
import { ArrowUpRight, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from '@bprogress/next/app'

const FEATURES = [
  {
    emoji: '📊',
    title: 'Track every sale',
    description: 'One record of your business',
  },
  {
    emoji: '💸',
    title: 'Collect payments',
    description: 'Your own QR and payment link',
  },
  {
    emoji: '🗺️',
    title: 'Get discovered',
    description: 'Show up when people search nearby',
  },
] as const

interface BusinessIntroDrawerProps {
  closeDrawer: () => void
}

export function BusinessIntroDrawer({ closeDrawer }: BusinessIntroDrawerProps) {
  const router = useRouter()

  const handleGetStarted = () => {
    closeDrawer()
    router.push('/onboarding/merchant')
  }

  return (
    <div className="flex w-full flex-col overflow-y-auto bg-white px-4">
      <header className="flex justify-end py-3.5">
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close business introduction"
          className="flex items-center justify-center"
        >
          <X size={24} className="text-black" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-100 flex-col items-center text-center">
        <div className="flex h-7 items-center overflow-hidden rounded-full bg-linear-to-br from-[#FB5012] to-[#D72483] p-[1.5px]">
          <span className="flex h-full w-7 items-center justify-center rounded-full">
            <Image
              src="/images/firespot_white.png"
              alt="Firespot"
              width={18}
              height={18}
              className="brightness-0 invert"
            />
          </span>
          <span className="relative z-10 -ml-2 flex h-full items-center rounded-full bg-white px-1.5 text-base font-medium">
            <span className="bg-linear-to-br from-[#FB5012] to-[#D72483] bg-clip-text text-transparent">
              Business
            </span>
          </span>
        </div>

        <h1 className="mt-3 text-[20px] font-bold -tracking-[0.4px] text-black">
          Run your Shop on firespot
        </h1>
        <p className="mt-1.5 max-w-90 text-sm font-medium leading-[145%] text-[#00000080]">
          Your personal account stays as it is. This adds a business you can
          switch into anytime.
        </p>
        <a
          href="https://firespot.co"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-[#4C5563] underline underline-offset-4"
        >
          Learn more
          <ArrowUpRight size={16} className="mt-1" />
        </a>
      </div>

      <div className="mx-auto mt-6 w-full max-w-100 space-y-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex items-start gap-4">
            <span className="w-8 shrink-0 text-center text-[28px] leading-none">
              {feature.emoji}
            </span>
            <div className="text-left">
              <p className="text-sm font-bold leading-none text-black">
                {feature.title}
              </p>
              <p className="mt-1 text-sm font-medium text-[#4C5563]">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-auto w-full space-y-3 mt-4 pb-4 pt-6">
        <Button type="button" onClick={handleGetStarted}>
          Get started
        </Button>
        <Button
          type="button"
          onClick={closeDrawer}
          className="bg-[#F1F1F1] text-black hover:bg-[#E8E8E8]"
        >
          Do this later
        </Button>
      </div>
    </div>
  )
}
