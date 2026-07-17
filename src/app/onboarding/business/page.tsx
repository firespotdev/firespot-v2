'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore, useAuthReady } from '@/services/auth'

const FEATURES = [
  {
    emoji: '🔁',
    title: 'Track every sale',
    description: 'One record of your business',
  },
  {
    emoji: '💸',
    title: 'Collect payments',
    description: 'Your own QR and payment link',
  },
  {
    emoji: '✅',
    title: 'Get discovered',
    description: 'Show up when people search nearby',
  },
]

export default function BusinessIntroPage() {
  const router = useRouter()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const hydrated = useAuthReady()

  // Guard: must be authenticated; existing merchants already have a shop
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.role === 'merchant') {
      router.replace('/profile')
    }
  }, [hydrated, isAuthenticated, user, router])

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-[500px] mx-auto min-h-dvh flex flex-col">
        {/* Gradient hero: fills all space above the content, ending 16px away */}
        <div className="flex-1 min-h-0 mb-4 bg-linear-to-br from-[#FB5012] via-[#E8384F] to-[#D72483]" />

        {/* Bottom-anchored content with constant 16px bottom padding */}
        <div className="shrink-0 flex flex-col px-4 pb-4">
          <div className="flex flex-col items-center text-center">
            <span className="border-[1.5px] border-black rounded-full font-medium flex items-center justify-center h-7 px-2 text-base text-black bg-white -tracking-[0.4px]">
              Business
            </span>
            <h1 className="font-bold text-[20px] text-black -tracking-[0.4px] mt-3">
              Open your Shop on firespot
            </h1>
            <p className="text-sm text-[#00000080] font-medium mt-1.5 max-w-[340px]">
              Your personal account stays as it is. This adds a business you can
              switch into anytime.
            </p>
            <a
              href="https://firespot.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4C5563] font-medium underline underline-offset-3 mt-3 inline-flex items-center gap-0.5"
            >
              Learn more
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="space-y-6 mt-8 px-1">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <span className="text-[28px] leading-none mt-0.5">
                  {feature.emoji}
                </span>
                <div>
                  <p className="font-bold text-sm text-black leading-none">
                    {feature.title}
                  </p>
                  <p className="text-sm text-[#4C5563] font-medium mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 space-y-3">
            <Button
              type="button"
              onClick={() => router.push('/onboarding/merchant')}
            >
              Get started
            </Button>
            <Button
              type="button"
              onClick={() => router.replace('/home')}
              className="bg-[#F1F1F1] text-black hover:bg-[#F1F1F1]/80"
            >
              Do this later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
