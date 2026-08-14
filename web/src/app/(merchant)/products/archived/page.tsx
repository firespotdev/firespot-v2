'use client'

import { ArrowLeft, ArchiveRestore } from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import {
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import {
  useProductCategories,
  useProducts,
  useRestoreProduct,
} from '@/services/products/hooks'

export default function ArchivedProductsPage() {
  const router = useRouter()
  const products = useProducts({ archived: true })
  const categories = useProductCategories()
  const restore = useRestoreProduct()
  const restoreProduct = async (id: string, categoryId: string) => {
    try {
      await restore.mutateAsync({ id, categoryId })
      showNotificationToast({ message: 'Product restored', mode: 'success' })
    } catch {
      showNotificationToast({ message: 'Could not restore product.' })
    }
  }
  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="mx-auto min-h-dvh max-w-125 px-4">
        <header className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="p-2"
          >
            <ArrowLeft />
          </button>
          <h1 className="text-[28px] font-bold">Archived</h1>
          <span className="w-10" />
        </header>
        {products.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : products.data?.length ? (
          <main className="mt-5">
            {products.data.map((product) => (
              <div key={product._id} className="border-b border-[#F1F1F1] py-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#E6E8ED]">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{product.name}</p>
                    <p className="text-sm text-[#647084]">
                      NGN{' '}
                      {product.price.toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Select
                    onValueChange={(categoryId) =>
                      restoreProduct(product._id, categoryId)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Restore to a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.data?.categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </main>
        ) : (
          <div className="flex min-h-[65dvh] items-center">
            <EmptyState
              emoji={<ArchiveRestore className="h-16 w-16 text-[#9CA3AF]" />}
              title="No archived products"
              details="Archived products will appear here."
              cta={<span />}
            />
          </div>
        )}
      </div>
    </div>
  )
}
