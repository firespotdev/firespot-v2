'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Image as ImageIcon, Search, X } from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import { useProducts } from '@/services/products/hooks'

interface PostProductPickerDrawerProps {
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  closeDrawer: () => void
}

const money = (value: number) =>
  value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function PostProductPickerDrawer({
  selectedIds,
  onConfirm,
  closeDrawer,
}: PostProductPickerDrawerProps) {
  const products = useProducts({ archived: false })
  const [selected, setSelected] = useState(selectedIds)
  const [search, setSearch] = useState('')

  const filteredProducts = (products.data || []).filter((product) =>
    `${product.name} ${product.description || ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )

  const toggleProduct = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <span className="h-9 w-9" aria-hidden="true" />
        <h2 className="text-[16px] font-bold text-black">
          Select items {selected.length > 0 && `(${selected.length})`}
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close product selection"
          className="flex h-9 w-9 items-center justify-center rounded-full text-black hover:bg-[#F1F1F1]"
        >
          <X size={20} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <p className="text-sm font-medium text-[#00000080]">
          Tag products customers can find in your catalogue.
        </p>
        <div className="relative mt-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#00000066]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="h-9 w-full rounded-[12px] border border-[#F1F1F1] bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-[#9CA3AF] focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>

        {products.isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <LoaderCircle />
          </div>
        ) : products.isError ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-[#00000080]">
              Products could not load.
            </p>
            <button
              type="button"
              onClick={() => void products.refetch()}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length ? (
          <div className="mt-4 divide-y divide-[#F1F1F1]">
            {filteredProducts.map((product) => {
              const isSelected = selected.includes(product._id)
              return (
                <button
                  type="button"
                  key={product._id}
                  onClick={() => toggleProduct(product._id)}
                  className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-[8px]"
                  aria-pressed={isSelected}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[#9CA3AF]">
                        <ImageIcon size={20} />
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-[#111827]">
                      {product.name}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium text-[#6B7280]">
                      {product.description || 'No description'}
                    </span>
                    <span className="mt-1 block text-[14px] font-medium text-[#374151]">
                      NGN {money(product.price)}
                    </span>
                  </span>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-[#D1D5DB] bg-white text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check size={15} strokeWidth={3} />
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="py-16 text-center text-sm font-medium text-[#00000080]">
            {search
              ? 'No matching products.'
              : 'Add products before tagging them.'}
          </p>
        )}
      </div>

      <footer className="border-t border-[#F1F1F1] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => {
            onConfirm(selected)
            closeDrawer()
          }}
          className="flex min-h-[48px] h-12 w-full items-center justify-center rounded-full bg-black text-[16px] font-bold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          Confirm items ({selected.length})
        </button>
      </footer>
    </div>
  )
}
