'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { useCustomers } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useContactPicker } from '@/hooks/use-contact-picker'
import {
  ActionList,
  ActionListItem,
  GreenSpinner,
  Input,
  showNotificationToast,
} from '@/components/ui'
import type { Customer } from '@/services/customers/customersApi'
import Image from 'next/image'

import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import {
  AddNewCustomerCard,
  SyncContactsCard,
} from '@/components/customers'
import { Sort } from 'iconsax-reactjs'

import type { CustomerSortOption } from '@/components/custom-drawer'

export default function CustomersListPage() {
  const router = useRouter()
  const { data: customers = [], isLoading } = useCustomers()
  const { openDrawer } = useDrawerStore()
  const { selectContacts } = useContactPicker()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<CustomerSortOption>('spent_desc')

  const handleOpenAddCustomer = () => {
    openDrawer({
      type: 'add-customer',
      props: {
        onSelect: (newCustomer: Customer) => {
          router.push(`/customers/${newCustomer._id}`)
        },
      },
    })
  }

  const handleSyncContacts = async () => {
    const result = await selectContacts()
    if (result.status === 'selected' && result.contacts.length > 0) {
      const contact = result.contacts[0]
      openDrawer({
        type: 'add-customer',
        props: {
          initialContact: contact,
          onSelect: (newCustomer: Customer) => {
            router.push(`/customers/${newCustomer._id}`)
          },
        },
      })
      return
    }
    if (result.status === 'error') {
      showNotificationToast({
        message: 'Unable to sync contacts. Enter customer details manually.',
        mode: 'error',
      })
    }
  }

  const handleOpenFilter = () => {
    openDrawer({
      type: 'customer-sort',
      props: {
        selectedSort: sortBy,
        onSelectSort: (option: CustomerSortOption) => setSortBy(option),
      },
    })
  }

  const filteredCustomers = customers
    .filter((customer) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.phoneNumber.includes(q)
      )
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'spent_desc':
          return (b.totalSpent ?? 0) - (a.totalSpent ?? 0)
        case 'spent_asc':
          return (a.totalSpent ?? 0) - (b.totalSpent ?? 0)
        case 'visits_desc':
          return (b.visitCount ?? 0) - (a.visitCount ?? 0)
        case 'visits_asc':
          return (a.visitCount ?? 0) - (b.visitCount ?? 0)
        case 'last_visit_desc':
          return (
            new Date(b.lastVisitAt || b.updatedAt || b.createdAt).getTime() -
            new Date(a.lastVisitAt || a.updatedAt || a.createdAt).getTime()
          )
        case 'last_visit_asc':
          return (
            new Date(a.lastVisitAt || a.updatedAt || a.createdAt).getTime() -
            new Date(b.lastVisitAt || b.updatedAt || b.createdAt).getTime()
          )
        case 'first_visit_desc':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        case 'first_visit_asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        default:
          return 0
      }
    })

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between py-2.5">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <ArrowLeft color="black" strokeWidth={2} size={24} />
          </Link>
          <h1 className="text-[16px] font-bold text-black">Customers</h1>
          <button
            type="button"
            aria-label="Add customer"
            onClick={handleOpenAddCustomer}
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <Plus size={24} color="black" strokeWidth={2} />
          </button>
        </header>

        {/* Search & Filter bar */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00000066] pointer-events-none" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-full bg-[#E6E8EB99] pl-10 pr-4 text-sm font-medium text-black placeholder:text-[#00000066] border-none shadow-none focus-visible:ring-ring/50"
            />
          </div>
          <button
            type="button"
            aria-label="Filter customers"
            onClick={handleOpenFilter}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6E8EB99] transition-colors"
          >
            <Sort size={20} color="black" />
          </button>
        </div>

        {/* Top Action Cards */}
        <div className="mb-6 flex flex-col gap-2.5">
          <AddNewCustomerCard onClick={handleOpenAddCustomer} />
          <SyncContactsCard
            onClick={handleSyncContacts}
            title="Sync contacts"
          />
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <GreenSpinner innerBg="#f5f6f8" />
          </div>
        ) : customers.length === 0 && !searchQuery ? (
          /* Empty State */
          <div className="flex flex-1 flex-col items-center justify-center text-center py-12 px-4">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#EBF3FE]">
              <Users className="h-10 w-10 text-[#407BFF]" strokeWidth={1.8} />
            </div>
            <h2 className="mb-2 text-[22px] font-bold text-black leading-tight">
              No customers yet
            </h2>
            <p className="max-w-[280px] text-sm font-medium text-[#00000080] leading-relaxed">
              You would see your customers here when they pay you with Firespot.
            </p>
          </div>
        ) : (
          /* Filled State List */
          <div className="flex flex-col">
            <p className="mb-2 px-1 text-[13px] font-medium text-[#00000066]">
              {filteredCustomers.length}{' '}
              {filteredCustomers.length === 1 ? 'customer' : 'customers'}
            </p>
            <ActionList rounded="12">
              {filteredCustomers.map((customer) => (
                <ActionListItem
                  key={customer._id}
                  href={`/customers/${customer._id}`}
                  icon={
                    <MerchantAvatar
                      profilePhotoUrl={customer.profilePhotoUrl}
                      size={36}
                    />
                  }
                  title={
                    <span className="text-[14px] font-bold text-black">
                      {customer.name}
                    </span>
                  }
                  className="p-3"
                  subtitle={customer.phoneNumber}
                />
              ))}
            </ActionList>

            {filteredCustomers.length > 0 && (
              <p className="mt-8 text-center text-xs font-medium text-[#00000066]">
                You’ve reached the end of the list
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
