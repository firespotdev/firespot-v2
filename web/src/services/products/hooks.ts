import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProductsApi, type CreateProductPayload } from './productsApi'

const invalidateCatalogue = (client: ReturnType<typeof useQueryClient>) => {
  client.invalidateQueries({ queryKey: ['products'] })
  client.invalidateQueries({ queryKey: ['product-categories'] })
  client.invalidateQueries({ queryKey: ['posts'] })
  client.invalidateQueries({ queryKey: ['posts-feed'] })
}
export const useProducts = (params?: { search?: string; categoryId?: string; archived?: boolean }) => useQuery({ queryKey: ['products', params], queryFn: () => ProductsApi.getProducts(params) })
export const useProductCategories = (search?: string) => useQuery({ queryKey: ['product-categories', search], queryFn: () => ProductsApi.getCategories(search) })
export const usePublicCatalogue = (merchantId?: string) =>
  useQuery({
    queryKey: ['public-catalogue', merchantId],
    queryFn: () => ProductsApi.getPublicCatalogue(merchantId!),
    enabled: Boolean(merchantId),
  })
export const useCreateProduct = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ payload, image }: { payload: CreateProductPayload; image?: File | null }) => ProductsApi.createProduct(payload, image), onSuccess: () => invalidateCatalogue(client) }) }
export const useUpdateProduct = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, payload, image }: { id: string; payload: CreateProductPayload; image?: File | null }) => ProductsApi.updateProduct(id, payload, image), onSuccess: () => invalidateCatalogue(client) }) }
export const useArchiveProduct = () => { const client = useQueryClient(); return useMutation({ mutationFn: ProductsApi.archiveProduct, onSuccess: () => invalidateCatalogue(client) }) }
export const useRestoreProduct = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) => ProductsApi.restoreProduct(id, categoryId), onSuccess: () => invalidateCatalogue(client) }) }
export const useCreateCategories = () => { const client = useQueryClient(); return useMutation({ mutationFn: ProductsApi.createCategories, onSuccess: () => invalidateCatalogue(client) }) }
export const useUpdateCategory = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => ProductsApi.updateCategory(id, name), onSuccess: () => invalidateCatalogue(client) }) }
export const useDeleteCategory = () => { const client = useQueryClient(); return useMutation({ mutationFn: ProductsApi.deleteCategory, onSuccess: () => invalidateCatalogue(client) }) }
