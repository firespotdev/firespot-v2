'use client'

import { X } from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import { Button, Spinner, showNotificationToast } from '@/components/ui'
import { useDeleteCategory } from '@/services/products/hooks'
import type { ProductCategory } from '@/services/products/productsApi'

interface DeleteCategoryDrawerProps {
  category: ProductCategory
  closeDrawer: () => void
}

export function DeleteCategoryDrawer({
  category,
  closeDrawer,
}: DeleteCategoryDrawerProps) {
  const router = useRouter()
  const removeCategory = useDeleteCategory()
  const remove = async () => {
    try {
      await removeCategory.mutateAsync(category._id)
      showNotificationToast({
        message: 'Category deleted and products archived',
        mode: 'success',
      })
      closeDrawer()
      router.replace('/products')
    } catch {
      showNotificationToast({ message: 'Could not delete category.' })
    }
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <span className="w-8" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">Delete category</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="p-1.5"
        >
          <X size={24} />
        </button>
      </header>
      <p className="flex-1 p-4 text-[14px] font-medium text-[#111827] leading-[140%]">
        Are you sure you want to delete this category? All the products in this
        category will be archived as well.
      </p>
      <footer className="flex justify-end gap-4 border-t border-[#F1F1F1] px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          onClick={closeDrawer}
          className="h-10 w-auto px-4"
        >
          Cancel
        </Button>
        <Button
          onClick={remove}
          disabled={removeCategory.isPending}
          className="h-10 w-auto bg-[#FF002E] px-4"
        >
          {removeCategory.isPending ? <Spinner /> : 'Delete'}
        </Button>
      </footer>
    </div>
  )
}
