'use client'

import { useState, useEffect } from 'react'
import { Plus, CirclePlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSetPrimaryBankAccount } from '@/services/users'
import { showNotificationToast, TagFooter, BankLogo } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import type { BankAccount } from '@/services/users'

interface SortableBankItemProps {
  account: BankAccount
  isFirst: boolean
}

function SortableBankItem({ account, isFirst }: SortableBankItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.accountNumber })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 py-3 px-4 border-b border-[#EBEBEB] cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'bg-gray-50' : ''
      }`}
    >
      <BankLogo
        bankName={account.bankName}
        size={36}
        className="rounded-[10px]"
      />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[#0F172A] truncate">
          {account.bankName}
        </p>
        {isFirst && (
          <p className="text-xs text-[#64748B] font-medium">
            Most preferred
          </p>
        )}
      </div>

      <Image
        src="/icons/bars.svg"
        alt="Drag handle"
        width={16}
        height={16}
        className="w-4 h-4"
      />
    </div>
  )
}

interface BankDrawerProps {
  bankAccounts: BankAccount[]
}

export function BankDrawer({ bankAccounts }: BankDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const setPrimaryBankAccount = useSetPrimaryBankAccount()

  // Local state for reordering
  const [accounts, setAccounts] = useState<BankAccount[]>([])

  // Configure sensors for both mouse/touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms delay before touch drag activates
        tolerance: 5, // 5px tolerance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sync accounts from props
  useEffect(() => {
    if (bankAccounts) {
      const sorted = [...bankAccounts].sort((a, b) => {
        if (a.isPrimary) return -1
        if (b.isPrimary) return 1
        return 0
      })
      setAccounts(sorted)
    }
  }, [bankAccounts])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setAccounts((items) => {
        const oldIndex = items.findIndex(
          (item) => item.accountNumber === active.id
        )
        const newIndex = items.findIndex(
          (item) => item.accountNumber === over.id
        )

        const newItems = arrayMove(items, oldIndex, newIndex)

        // If the first item changed, update the primary account
        if (newIndex === 0 || oldIndex === 0) {
          const newPrimaryAccount = newItems[0]
          if (!newPrimaryAccount.isPrimary) {
            setPrimaryBankAccount.mutate(newPrimaryAccount.accountNumber, {
              onSuccess: () => {
                showNotificationToast({ message: 'Primary account updated' })
              },
              onError: (error: any) => {
                const message =
                  error?.response?.data?.message ||
                  'Failed to update primary account'
                showNotificationToast({ message })
              },
            })
          }
        }

        return newItems
      })
    }
  }

  return (
    <div className="px-3">
      <p className="text-xs font-medium px-1 py-1.5 text-[#545F6CE5] text-center bg-[#E8EAED] rounded-[8px] mt-2">
        Drag to reorder - from most preferred to least preferred.
      </p>

      <div className="flex-1 overflow-y-auto mt-2">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[#00000066] text-sm">
              No bank accounts added yet
            </p>
          </div>
        ) : (
          <div className="border border-[#f4f6f8] bg-white shadow-[0px_4px_8px_0px_#0000000A] rounded-[12px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={accounts.map((a) => a.accountNumber)}
                strategy={verticalListSortingStrategy}
              >
                {accounts.map((account, index) => (
                  <SortableBankItem
                    key={account.accountNumber}
                    account={account}
                    isFirst={index === 0}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Link
              href="/bank-accounts/add"
              onClick={closeDrawer}
              className="flex items-center gap-3 px-4 py-3"
            >
              <CirclePlus
                fill="#0075FF"
                stroke="#FFFFFF"
                strokeWidth={2}
                size={24}
              />
              <span className="text-sm text-[#0075FF] font-bold">
                Add a bank account
              </span>
            </Link>
          </div>
        )}
      </div>

      <TagFooter />
    </div>
  )
}

// Header actions for bank accounts drawer
export function BankDrawerHeaderLeft() {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)

  return (
    <Link
      href="/bank-accounts/add"
      onClick={closeDrawer}
      className="w-9 h-9 flex items-center justify-center"
    >
      <Plus className="w-6 h-6 text-black" />
    </Link>
  )
}
