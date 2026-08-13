'use client'

import {
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import { useParams } from 'next/navigation'
import {
  ActionList,
  ActionListItem,
  Input,
  LoaderCircle,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { useProductCategories, useProducts } from '@/services/products/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useState } from 'react'

export default function CategoryProductsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { openDrawer } = useDrawerStore()
  const [search, setSearch] = useState('')
  const [actionsOpen, setActionsOpen] = useState(false)
  const categories = useProductCategories()
  const category = categories.data?.categories.find((entry) => entry._id === id)
  const products = useProducts({ categoryId: id, search })
  const searchQuery = search.trim()
  const isSearching = searchQuery.length > 0
  const productCount = products.data?.length ?? 0

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="mx-auto min-h-dvh max-w-125 px-3">
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="p-1.5"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[16px] font-bold">
            {category?.name || 'Category'}
          </h1>
          <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!category}
                aria-label="Category actions"
                className="p-1.5"
              >
                <MoreHorizontal size={24} />
              </button>
            </PopoverTrigger>
            {category && (
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={10}
                className="w-[240px] rounded-[12px] border-0 bg-transparent p-0 shadow-none"
              >
                <ActionList rounded="16">
                  <ActionListItem
                    icon={
                      <span className="grid size-9 place-items-center rounded-full bg-black/10">
                        <Plus size={16} />
                      </span>
                    }
                    title="Add product"
                    onClick={() => {
                      setActionsOpen(false)
                      openDrawer({
                        type: 'add-product',
                        props: { initialCategoryId: category._id },
                      })
                    }}
                    className="gap-4 p-2 text-[14px] font-bold"
                  />
                  <ActionListItem
                    icon={
                      <span className="grid size-9 place-items-center rounded-full bg-black/10">
                        <PenLine size={16} />
                      </span>
                    }
                    title="Edit category"
                    onClick={() => {
                      setActionsOpen(false)
                      openDrawer({
                        type: 'category-form',
                        props: { mode: 'edit', category },
                      })
                    }}
                    className="gap-4 p-2 text-[14px] font-bold"
                  />
                  <ActionListItem
                    icon={
                      <span className="grid size-9 place-items-center rounded-full bg-[#FF002E1A]">
                        <Trash2 size={16} className="text-[#FF002E]" />
                      </span>
                    }
                    title="Delete category"
                    danger
                    onClick={() => {
                      setActionsOpen(false)
                      openDrawer({
                        type: 'delete-category',
                        props: { category },
                      })
                    }}
                    className="gap-4 p-2 text-[14px] font-bold"
                  />
                </ActionList>
              </PopoverContent>
            )}
          </Popover>
        </header>

        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#00000066]"
            size={16}
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${category?.name || 'products'}`}
            className="h-9 rounded-[10px] pl-10 text-sm placeholder:text-[#00000066]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={18} className="text-[#6B7280]" />
            </button>
          )}
        </div>

        <main className="mt-3">
          {isSearching ? (
            <p className="border-t border-[#F1F1F1] py-2 text-xs font-medium text-[#9CA3AF]">
              {productCount} {productCount === 1 ? 'result' : 'results'} for “
              {searchQuery}”
            </p>
          ) : (
            <button
              type="button"
              onClick={() =>
                openDrawer({
                  type: 'add-product',
                  props: { initialCategoryId: id },
                })
              }
              className="mb-3 flex w-full items-center gap-3 border-y border-[#F1F1F1] py-2.75 text-left text-[14px] font-medium text-[#0075FF]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0075FF14]">
                <Plus size={16} />
              </span>
              Add a product to this category
              <ChevronRight className="ml-auto" size={20} />
            </button>
          )}
          {products.isLoading ? (
            <div className="flex justify-center items-center py-16">
              <LoaderCircle />
            </div>
          ) : (
            products.data?.map((product) => (
              <div key={product._id} className="flex gap-3 py-2 items-center">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#E5E7EB]">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">
                    {product.name}
                  </p>
                  <p className="truncate text-sm font-medium text-[#6B7280]">
                    {product.description}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-[#374151]">
                    NGN{' '}
                    {product.price.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openDrawer({ type: 'add-product', props: { product } })
                    }
                    aria-label={`Edit ${product.name}`}
                    className="rounded-[10px] bg-[#F1F1F1] h-9 w-9 flex justify-center items-center"
                  >
                    <PenLine size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openDrawer({
                        type: 'archive-product',
                        props: { product },
                      })
                    }
                    aria-label={`Archive ${product.name}`}
                    className="rounded-[10px] bg-[#F1F1F1] h-9 w-9 flex justify-center items-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  )
}
