'use client'

import { useState } from 'react'
import { X, Search, ChevronRight, ArrowLeft } from 'lucide-react'
import { showNotificationToast, Skeleton } from '@/components/ui'
import { useCustomers } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import { MerchantAvatar } from '../layout/MerchantAvatar'
import { PickedContact, useContactPicker } from '@/hooks/use-contact-picker'
import type { Customer } from '@/services/customers/customersApi'
import {
  AddNewCustomerCard,
  SyncContactsCard,
} from '@/components/customers'

interface Props {
  onSelect: (customer: Customer) => void
  onBack?: () => void
  /** Shows the additional balance-attribution guidance for part payments. */
  requireCustomer?: boolean
  title?: string
}

export function CustomerSelectDrawer({
  onSelect,
  onBack,
  requireCustomer = false,
  title = 'Who paid you?',
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: customers = [], isLoading } = useCustomers()
  const { selectContacts } = useContactPicker()

  const [searchQuery, setSearchQuery] = useState('')

  const handleOpenAddCustomer = ({
    initialContact,
    focusPhone = false,
  }: {
    initialContact?: PickedContact
    focusPhone?: boolean
  } = {}) => {
    closeDrawer('customer-select')
    openDrawer({
      type: 'add-customer',
      props: {
        initialContact,
        focusPhone,
        onSelect: (newCust: Customer) => {
          closeDrawer('add-customer')
          onSelect(newCust)
        },
        onBack: () => {
          openDrawer({
            type: 'customer-select',
            props: { onSelect, onBack, requireCustomer, title },
          })
        },
      },
    })
  }

  const handleSelectFromContacts = async () => {
    const result = await selectContacts()
    if (result.status === 'selected') {
      handleOpenAddCustomer({ initialContact: result.contacts[0] })
      return
    }
    if (result.status === 'unsupported') {
      handleOpenAddCustomer({ focusPhone: true })
      return
    }
    if (result.status === 'error') {
      showNotificationToast({
        message: 'Unable to open your contacts. Enter the details manually.',
        mode: 'error',
      })
      handleOpenAddCustomer({ focusPhone: true })
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery),
  )

  return (
    <div className="w-full max-w-125 mx-auto overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-satoshi">
      <div className="flex flex-col gap-3 py-2">
        {/* Header */}
        <div className="flex justify-between items-center pb-1">
          <button
            onClick={onBack || closeDrawer}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center text-black cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>

          <h2 className="text-[16px] font-bold text-black flex-1 text-center">
            {title}
          </h2>

          <button
            onClick={closeDrawer}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center bg-[#E6E8EB99] rounded-full px-3 py-2 border border-[#EBEBEB] focus-within:border-gray-300 transition-colors">
          <Search className="w-4 h-4 text-[#00000066] mr-2" />
          <input
            type="text"
            placeholder="Search customers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none text-black font-medium placeholder-[#00000066]"
          />
        </div>

        {/* Add new customer & Contacts Cards */}
        <AddNewCustomerCard onClick={() => handleOpenAddCustomer()} />
        <SyncContactsCard
          onClick={handleSelectFromContacts}
          title="Select from contacts"
        />

        {requireCustomer && (
          <p className="border border-[#00000014] bg-[#F4F4F4] text-xs rounded-[12px] text-[#00000066] font-medium p-3">
            A balance needs a name. Select the customer so you can collect the
            balance later.
          </p>
        )}

        <div>
          {isLoading ? (
            <Skeleton className="mb-2 h-4 w-20" />
          ) : (
            <span className="text-[13px] text-[#00000066] font-medium text-left px-0.5 select-none shrink-0 mb-2 inline-block">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'customer' : 'customers'}
            </span>
          )}

          {/* Customers List Box */}
          <div className="flex max-h-64 flex-col overflow-y-auto rounded-[12px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 ${
                      index > 0 ? 'border-t border-[#EBEBEB]' : ''
                    }`}
                  >
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                  </div>
                ))
              : filtered.map((cust, index) => (
                  <button
                    key={cust._id}
                    type="button"
                    onClick={() => onSelect(cust)}
                    className={`w-full flex items-center justify-between p-3 transition-all text-left group cursor-pointer
                  ${index > 0 ? 'border-t border-[#EBEBEB]' : ''}
                  bg-white hover:bg-gray-50/40
                `}
                  >
                    <div className="flex items-center gap-3">
                      <MerchantAvatar />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-black leading-none">
                          {cust.name}
                        </span>
                        <span className="text-xs text-[#6B7280] font-medium mt-1">
                          {cust.phoneNumber}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-black transition-colors" />
                  </button>
                ))}
          </div>
        </div>
      </div>
    </div>
  )
}
