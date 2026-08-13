'use client'

import { X } from 'lucide-react'
import { Button, Spinner, showNotificationToast } from '@/components/ui'
import { useArchiveProduct } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'

interface ArchiveProductDrawerProps {
  product: Product
  closeDrawer: () => void
}

export function ArchiveProductDrawer({
  product,
  closeDrawer,
}: ArchiveProductDrawerProps) {
  const archive = useArchiveProduct()
  const confirm = async () => {
    try {
      await archive.mutateAsync(product._id)
      showNotificationToast({ message: 'Product archived', mode: 'success' })
      closeDrawer()
    } catch {
      showNotificationToast({ message: 'Could not archive product.' })
    }
  }
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <span className="w-8" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">Delete product</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="p-1.5"
        >
          <X size={24} />
        </button>
      </header>
      <p className="flex-1 p-4 text-[14px] leading-[140%] font-medium text-[#111827]">
        Are you sure you want to delete this product? It will be archived and
        removed from your active catalogue.
      </p>
      <footer className="flex justify-end gap-4 border-t border-[#F1F1F1] px-4 py-3">
        <Button
          variant="ghost"
          onClick={closeDrawer}
          className="h-10 w-auto px-4"
        >
          Cancel
        </Button>
        <Button
          onClick={confirm}
          disabled={archive.isPending}
          className="h-10 w-auto bg-[#FF002E] px-4 hover:bg-[#E60029]"
        >
          {archive.isPending ? <Spinner /> : 'Delete'}
        </Button>
      </footer>
    </div>
  )
}
