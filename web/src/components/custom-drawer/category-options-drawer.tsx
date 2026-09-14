'use client'

import { ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import type { ProductCategory } from '@/services/products/productsApi'

interface CategoryOptionsDrawerProps {
  category: ProductCategory
  closeDrawer: () => void
}

export function CategoryOptionsDrawer({
  category,
  closeDrawer,
}: CategoryOptionsDrawerProps) {
  const { openDrawer } = useDrawerStore()

  const openNext = (
    type: 'category-form' | 'delete-category',
    props: Record<string, unknown>,
  ) => {
    closeDrawer()
    openDrawer({ type, props })
  }

  return (
    <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto mb-7 h-1.5 w-14 rounded-full bg-[#DFE1E5]" />
      <header className="mb-5 flex items-center justify-between">
        <span className="w-8" aria-hidden="true" />
        <h2 className="text-[20px] font-bold">Select an option</h2>
        <button type="button" onClick={closeDrawer} aria-label="Close">
          <X size={28} />
        </button>
      </header>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
        <button
          type="button"
          onClick={() => {
            closeDrawer()
            openDrawer({
              type: 'add-product',
              props: { initialCategoryId: category._id },
            })
          }}
          className="flex w-full items-center gap-5 border-b border-[#F1F1F1] p-5 text-left"
        >
          <span className="rounded-full bg-[#F1F1F1] p-3">
            <Plus />
          </span>
          <span className="flex-1 text-xl font-bold">Add product</span>
          <ChevronRight className="text-[#6B7280]" />
        </button>
        <button
          type="button"
          onClick={() => openNext('category-form', { mode: 'edit', category })}
          className="flex w-full items-center gap-5 border-b border-[#F1F1F1] p-5 text-left"
        >
          <span className="rounded-full bg-[#F1F1F1] p-3">
            <Pencil />
          </span>
          <span className="flex-1 text-xl font-bold">Edit category</span>
          <ChevronRight className="text-[#6B7280]" />
        </button>
        <button
          type="button"
          onClick={() => openNext('delete-category', { category })}
          className="flex w-full items-center gap-5 p-5 text-left text-[#FF002E]"
        >
          <span className="rounded-full bg-[#FFE4EA] p-3">
            <Trash2 />
          </span>
          <span className="flex-1 text-xl font-bold">Delete category</span>
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}
