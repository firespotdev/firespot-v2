'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import {
  ActionList,
  ActionListItem,
  Button,
  EmptyState,
  GreenSpinner,
  Input,
} from '@/components/ui'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { AddSupplierCard } from '@/components/expenses/add-supplier-card'
import { useDrawerStore } from '@/services/drawer'
import { useSuppliers, type Supplier } from '@/services/expenses'

export default function SuppliersPage() {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: suppliers = [], isLoading, isError, refetch } = useSuppliers()
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const filtered = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(query) ||
      supplier.phoneNumber.includes(query),
  )

  const openSupplier = (supplier?: Supplier) =>
    openDrawer({
      type: 'add-supplier',
      props: { supplier, onSaved: () => {} },
    })

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-3 pb-8">
        <header className="flex items-center justify-between py-2.5">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <ArrowLeft color="black" strokeWidth={2} size={24} />
          </Link>
          <h1 className="text-[16px] font-bold text-black">Suppliers</h1>
          <button
            type="button"
            aria-label="Add supplier"
            onClick={() => openSupplier()}
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <Plus size={24} color="black" strokeWidth={2} />
          </button>
        </header>

        {suppliers.length > 0 && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#00000066]" />
            <Input
              type="text"
              placeholder="Search suppliers"
              aria-label="Search suppliers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-full border-none bg-[#E6E8EB99] pr-4 pl-10 text-sm font-medium text-black shadow-none placeholder:text-[#00000066]"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <GreenSpinner innerBg="#f5f6f8" />
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center py-12">
            <EmptyState
              emoji={<EmptyEmoji label="Warning">⚠️</EmptyEmoji>}
              title="Couldn't load suppliers"
              details="Check your connection and try again."
              cta={
                <Button
                  className="mt-5 w-auto px-6"
                  onClick={() => void refetch()}
                >
                  Try again
                </Button>
              }
            />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-1 items-center py-12">
            <EmptyState
              emoji={<EmptyEmoji label="Package">📦</EmptyEmoji>}
              title="No suppliers yet"
              details="Save who you buy from, then link them to the expenses you record."
              cta={
                <Button
                  className="mt-5 w-auto px-6"
                  onClick={() => openSupplier()}
                >
                  Add supplier
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-6">
              <AddSupplierCard onClick={() => openSupplier()} />
            </div>
            <p className="mb-2 px-1 text-[13px] font-medium text-[#00000066]">
              {filtered.length} {filtered.length === 1 ? 'supplier' : 'suppliers'}
            </p>
            <ActionList rounded="12">
              {filtered.map((supplier) => (
                <ActionListItem
                  key={supplier._id}
                  icon={<MerchantAvatar alt={supplier.name} size={36} />}
                  title={supplier.name}
                  subtitle={supplier.phoneNumber}
                  onClick={() => openSupplier(supplier)}
                  className="p-3"
                />
              ))}
            </ActionList>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyEmoji({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span className="mb-1 text-[64px] leading-none" role="img" aria-label={label}>
      {children}
    </span>
  )
}
