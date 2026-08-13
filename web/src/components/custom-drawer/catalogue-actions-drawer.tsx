'use client'

import { X } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { ActionList, ActionListItem } from '@/components/ui'
import { SquaresFourIcon, TagIcon } from '@phosphor-icons/react'

interface CatalogueActionsDrawerProps {
  closeDrawer: () => void
}

export function CatalogueActionsDrawer({
  closeDrawer,
}: CatalogueActionsDrawerProps) {
  const { openDrawer } = useDrawerStore()

  const openCategoryForm = () => {
    closeDrawer()
    openDrawer({ type: 'category-form', props: { mode: 'create' } })
  }

  return (
    <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between py-2 mb-2">
        <span className="w-8" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">Select an option</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="p-1.5"
        >
          <X size={24} />
        </button>
      </header>

      <ActionList rounded="12">
        <ActionListItem
          icon={<TagIcon size={24} />}
          title="Add product"
          onClick={() => {
            closeDrawer()
            openDrawer({ type: 'add-product' })
          }}
          className="p-4.5"
        />
        <ActionListItem
          icon={<SquaresFourIcon size={24} />}
          title="Create category"
          onClick={openCategoryForm}
          className="p-4.5"
        />
      </ActionList>
    </div>
  )
}
