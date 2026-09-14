'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import { Button, EmptyState, Input, LoaderCircle } from '@/components/ui'
import { useProductCategories, useProducts } from '@/services/products/hooks'
import { useDrawerStore } from '@/services/drawer'

export default function ProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { openDrawer } = useDrawerStore()
  const categories = useProductCategories()
  const products = useProducts({ search })

  const hasProducts = Boolean(products.data?.length)
  const searchQuery = search.trim()
  const isSearching = searchQuery.length > 0
  const productCount = products.data?.length ?? 0
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto min-h-dvh max-w-125 px-3">
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="p-1.5"
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <h1 className="text-[16px] font-bold">Products</h1>
          <button
            type="button"
            onClick={() => openDrawer({ type: 'catalogue-actions' })}
            aria-label="Add product or category"
            className="p-1.5"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
        </header>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#00000066]"
            size={16}
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products or categories"
            className="h-9 rounded-[10px] pl-10 text-sm placeholder:text-[#00000066]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="text-[#6B7280]" />
            </button>
          )}
        </div>
        {!isSearching && products.isLoading && (
          <div
            role="status"
            aria-label="Loading products"
            className="flex min-h-[65dvh] items-center justify-center"
          >
            <LoaderCircle />
          </div>
        )}
        {!isSearching && !hasProducts && !products.isLoading && (
          <div className="flex min-h-[65dvh] items-center">
            <EmptyState
              emoji={<span className="text-[56px] mb-6">📦</span>}
              title="No products yet"
              details="Upload your products and start collecting payments for them with Firespot."
              cta={
                <Button
                  onClick={() => openDrawer({ type: 'add-product' })}
                  className="mt-6 h-9 text-[10px] w-fit tracking-[1px] px-4"
                >
                  <Plus size={16} /> ADD PRODUCT
                </Button>
              }
            />
          </div>
        )}
        {(hasProducts || isSearching) && (
          <main className="mt-3">
            {isSearching ? (
              <>
                <p className="border-t border-[#F1F1F1] pt-3 text-sm font-medium text-[#9CA3AF]">
                  {productCount} {productCount === 1 ? 'result' : 'results'} for
                  “{searchQuery}”
                </p>
                {products.isLoading ? (
                  <div
                    role="status"
                    aria-label="Loading products"
                    className="flex items-center justify-center py-16"
                  >
                    <LoaderCircle />
                  </div>
                ) : (
                  products.data?.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center gap-3 border-b border-[#F1F1F1] py-3"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#E6E8ED]">
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
                            openDrawer({
                              type: 'add-product',
                              props: { product },
                            })
                          }
                          aria-label={`Edit ${product.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F1F1F1]"
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
                          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F1F1F1]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="border-b border-[#F1F1F1]">
                <button
                  type="button"
                  onClick={() => openDrawer({ type: 'add-product' })}
                  className="flex w-full items-center justify-between border-b border-[#F1F1F1] py-4 text-left text-[16px] font-medium text-[#0075FF]"
                >
                  <span>Add product</span>
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openDrawer({
                      type: 'category-form',
                      props: { mode: 'create' },
                    })
                  }
                  className="flex w-full items-center justify-between border-b border-[#F1F1F1] py-4 text-left text-[16px] font-medium text-[#0075FF]"
                >
                  <span>Create category</span>
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
                {categories.data?.categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/products/category/${category._id}`}
                    className="flex items-center justify-between border-b border-[#F1F1F1] py-4"
                  >
                    <span className="text-[16px] font-medium">
                      {category.name}
                    </span>
                    <span className="flex items-center gap-3 text-[14px] text-[#9CA3AF]">
                      {category.productCount}
                      <ChevronRight size={16} strokeWidth={2} />
                    </span>
                  </Link>
                ))}
                <div className="flex items-center justify-between py-4">
                  <span className="text-[16px] font-medium">Archived</span>
                  <span className="text-[14px] text-[#9CA3AF]">
                    {categories.data?.archivedCount || 0}
                  </span>
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}
