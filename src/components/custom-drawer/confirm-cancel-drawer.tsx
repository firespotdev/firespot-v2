'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'

interface ConfirmCancelDrawerProps {
  onConfirm: () => Promise<void>
}

export function ConfirmCancelDrawer({ onConfirm }: ConfirmCancelDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      closeDrawer()
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-5 pb-8 pt-2">
      <div className="mb-8">
        <p className="text-[#000000] text-lg font-medium text-center leading-snug">
          Are you sure you want to cancel this sale?
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1 bg-[#F1F1F1]"
          onClick={closeDrawer}
          disabled={isLoading}
        >
          Go back
        </Button>
        <Button
          variant="default"
          className="flex-1 bg-[#FF3B30] text-white hover:bg-[#E0352B]"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Cancelling...' : 'Ok, cancel'}
        </Button>
      </div>
    </div>
  )
}
