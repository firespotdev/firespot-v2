'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { useArchiveSale } from '@/services/sales/hooks'
import { Sale } from '@/services/sales/interface'
import { Button } from '../ui'
import { DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'

interface ConfirmArchiveDrawerProps {
  sale: Sale
  closeDrawer: () => void
}

export function ConfirmArchiveDrawer({
  sale,
  closeDrawer,
}: ConfirmArchiveDrawerProps) {
  const { openDrawer } = useDrawerStore()
  const archiveSaleMutation = useArchiveSale()
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = () => {
    setIsArchiving(true)
    archiveSaleMutation.mutate(sale._id, {
      onSuccess: (updated) => {
        setIsArchiving(false)
        openDrawer({
          type: 'transaction-details',
          props: { sale: updated },
        })
      },
      onError: (err) => {
        setIsArchiving(false)
        alert('Failed to archive sale')
      },
    })
  }

  return (
    <div className="flex flex-col h-full font-satoshi">
      <DrawerHeader className="p-0 mb-4 flex justify-between items-center relative w-full h-10">
        <div className="w-full text-center">
          <DrawerTitle className="text-base font-bold text-black">
            Confirm Archive
          </DrawerTitle>
        </div>
        <DrawerClose className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-[#8E8E93]" />
        </DrawerClose>
      </DrawerHeader>

      <div className="flex flex-col gap-6 text-center">
        <p className="text-sm font-medium text-[#00000080]">
          Are you sure you want to archive this transaction? This action will
          mark the transaction as archived and cannot be undone.
        </p>

        <div className="flex gap-3">
          <Button
            disabled={isArchiving}
            onClick={() => {
              closeDrawer()
              openDrawer({
                type: 'transaction-options',
                props: { sale },
              })
            }}
            variant="outline"
            className="flex-1 h-12 rounded-full font-bold"
          >
            Cancel
          </Button>
          <Button
            disabled={isArchiving}
            onClick={handleArchive}
            className="flex-1 h-12 bg-[#FF3B30] hover:bg-[#E03126] text-white font-bold rounded-full"
          >
            {isArchiving ? 'Archiving...' : 'Confirm Archive'}
          </Button>
        </div>
      </div>
    </div>
  )
}
