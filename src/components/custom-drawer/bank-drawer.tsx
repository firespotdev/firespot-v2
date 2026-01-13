'use client'

import { useState, useEffect } from 'react'
import { Plus, CirclePlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSetPrimaryBankAccount } from '@/services/users'
import { showNotificationToast, TagFooter } from '@/components/ui'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'
import { useDrawerStore } from '@/services/drawer'
import type { BankAccount } from '@/services/users'

interface BankDrawerProps {
  bankAccounts: BankAccount[]
}

export function BankDrawer({ bankAccounts }: BankDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const setPrimaryBankAccount = useSetPrimaryBankAccount()

  // Local state for reordering
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newAccounts = [...accounts]
    const draggedItem = newAccounts[draggedIndex]
    newAccounts.splice(draggedIndex, 1)
    newAccounts.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    setAccounts(newAccounts)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && accounts.length > 0) {
      const newPrimaryAccount = accounts[0]
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
    setDraggedIndex(null)
  }

  const renderBankLogo = (bankName: string) => {
    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')

    if (isDefaultLogo) {
      return (
        <div className="w-9 h-9 bg-[#0075FF] rounded-[10px] flex items-center justify-center">
          <span className="text-white font-bold text-base">
            {getBankInitial(bankName)}
          </span>
        </div>
      )
    }

    return (
      <Image
        src={logoPath}
        alt={`${bankName} logo`}
        width={36}
        height={36}
        className="w-9 h-9 rounded-[10px] object-contain"
      />
    )
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
            {accounts.map((account, index) => (
              <div
                key={account.accountNumber}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 py-3 px-4 border-b border-[#EBEBEB] cursor-grab active:cursor-grabbing ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                {renderBankLogo(account.bankName)}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#0F172A] truncate">
                    {account.bankName}
                  </p>
                  {index === 0 && (
                    <p className="text-xs text-[#64748B] font-medium">
                      Most preferred
                    </p>
                  )}
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#CCCCCC"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-menu-icon lucide-menu"
                >
                  <path d="M4 5h16" />
                  <path d="M4 12h16" />
                </svg>
              </div>
            ))}
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
