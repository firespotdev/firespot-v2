'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from './drawer'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

/** Destructive actions use the same red as archiving a sale. */
const CONFIRM_STYLES: Record<NonNullable<ConfirmDialogProps['variant']>, string> =
  {
    danger: 'bg-[#FF3B30] text-white hover:bg-[#E03126]',
    warning: 'bg-[#FF3B30] text-white hover:bg-[#E03126]',
    default: 'bg-black text-white hover:bg-black/90',
  }

/**
 * Confirmation bottom sheet, laid out like the sale "Confirm Archive" sheet:
 * a centered title with a close button, the explanation, then Cancel and the
 * confirming action side by side.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const close = () => {
    if (!isLoading) onOpenChange(false)
  }

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      direction="bottom"
      dismissible={!isLoading}
      repositionInputs={false}
    >
      <DrawerContent className="mx-auto max-w-125 rounded-t-3xl bg-white font-satoshi">
        <div className="px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="relative mb-4 flex h-10 w-full items-center justify-center">
            <DrawerTitle className="text-base font-bold text-black">
              {title}
            </DrawerTitle>
            <button
              type="button"
              onClick={close}
              disabled={isLoading}
              aria-label="Close"
              className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-[#8E8E93]" />
            </button>
          </div>

          <DrawerDescription className="mb-6 text-center text-sm font-medium text-[#00000080]">
            {description}
          </DrawerDescription>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={close}
              className="h-12 flex-1 rounded-full font-bold"
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => void handleConfirm()}
              className={cn(
                'h-12 flex-1 rounded-full font-bold',
                CONFIRM_STYLES[variant],
              )}
            >
              {isLoading ? 'Please wait…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
