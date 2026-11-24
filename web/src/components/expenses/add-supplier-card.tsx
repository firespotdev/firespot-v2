'use client'

import { PackageIcon } from '@phosphor-icons/react'
import { ActionList, ActionListItem } from '@/components/ui'
import { BoxAdd } from 'iconsax-reactjs'

/** "Add new supplier" entry, shared by the supplier picker and Suppliers page. */
export function AddSupplierCard({ onClick }: { onClick: () => void }) {
  return (
    <ActionList rounded="12">
      <ActionListItem
        icon={
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#24C166]">
            <BoxAdd size={22} color="white" />
          </span>
        }
        title="Add new supplier"
        subtitle="Name & phone number"
        onClick={onClick}
        className="p-3"
      />
    </ActionList>
  )
}
