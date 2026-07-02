'use client'

import {
  Archive,
  ChevronRight,
  Download,
  PencilLine,
  Share,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'
import { TagFooter } from '../ui'
import { DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'

interface TransactionOptionsDrawerProps {
  sale: Sale
  closeDrawer: () => void
}

export function TransactionOptionsDrawer({
  sale,
  closeDrawer,
}: TransactionOptionsDrawerProps) {
  const { openDrawer, closeDrawer: storeCloseDrawer } = useDrawerStore()

  const isConfirmed = sale.status === 'CONFIRMED' || !sale.status
  const isArchived = (sale as any).isArchived
  const creationDate = new Date(
    sale.createdAt || sale.recordedAt || Date.now(),
  ).getTime()
  const isEditWindowOpen =
    !sale.hasBeenEdited && Date.now() - creationDate <= 24 * 60 * 60 * 1000
  const isEditable = isConfirmed && isEditWindowOpen && !isArchived

  return (
    <div className="flex flex-col h-full font-satoshi">
      <header className="px-4 mb-2 flex justify-between items-center relative w-full h-13">
        <div className="w-full text-center">
          <h2 className="text-[17px] font-bold text-black leading-none">
            Select an option
          </h2>
        </div>

        <X
          onClick={() => storeCloseDrawer('transaction-options')}
          className="w-5 h-5 text-black stroke-[2.5px] cursor-pointer"
        />
      </header>

      <div className="flex flex-col gap-4 px-3">
        <div className="bg-white rounded-[12px] overflow-hidden divide-y divide-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A] border border-[#F4F6F8]">
          <button
            onClick={() => {
              closeDrawer()
              if (navigator.share) {
                navigator.share({
                  title: 'Firespot Receipt',
                  url: window.location.href,
                })
              }
            }}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-black hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Share size={24} className="text-[#111827] stroke-[2.2px]" />
              <span>Share receipt</span>
            </div>
            <ChevronRight size={16} className="text-[#AEAEB2] stroke-[2.5px]" />
          </button>

          {/* Download receipt */}
          <button
            onClick={() => {
              closeDrawer()
              window.print()
            }}
            className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-black hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download size={24} className="text-[#111827] stroke-[2.2px]" />
              <span>Download receipt</span>
            </div>
            <ChevronRight size={16} className="text-[#AEAEB2] stroke-[2.5px]" />
          </button>
        </div>

        {/* Card 2: Actions */}
        <div className="bg-white rounded-[12px] overflow-hidden divide-y divide-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A] border border-[#F4F6F8]">
          {/* Edit sale */}
          {isEditable ? (
            <Link
              href={`/record-sale?id=${sale._id}&edit=true`}
              onClick={closeDrawer}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-black hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PencilLine
                  size={24}
                  className="text-[#111827] stroke-[2.2px]"
                />
                <span>Edit sale</span>
              </div>
              <ChevronRight
                size={16}
                className="text-[#AEAEB2] stroke-[2.5px]"
              />
            </Link>
          ) : (
            <div className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-gray-300 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <PencilLine
                  size={24}
                  className="text-gray-200 stroke-[2.2px]"
                />
                <span>Edit sale</span>
              </div>
              <ChevronRight
                size={16}
                className="text-gray-200 stroke-[2.5px]"
              />
            </div>
          )}

          {/* Archive sale */}
          {isArchived ? (
            <div className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-red-300 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Archive size={24} className="text-red-200 stroke-[2.2px]" />
                <span>Archive sale</span>
              </div>
              <ChevronRight size={16} className="text-red-200 stroke-[2.5px]" />
            </div>
          ) : (
            <button
              onClick={() => {
                storeCloseDrawer('transaction-options')
                openDrawer({
                  type: 'confirm-archive',
                  props: { sale },
                })
              }}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-[14px] text-[#FF3B30] hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Archive size={24} className="text-[#FF3B30] stroke-[2.2px]" />
                <span>Archive sale</span>
              </div>
              <ChevronRight
                size={16}
                className="text-[#FF3B30] stroke-[2.5px]"
              />
            </button>
          )}
        </div>
      </div>
      <TagFooter />
    </div>
  )
}
