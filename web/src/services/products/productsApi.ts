import { apiClient, publicApiClient } from '@/lib/utils/axios'

export interface ProductOptionValue { id: string; value: string }
export interface ProductOption { id: string; name: string; values: ProductOptionValue[] }
export interface VariantPriceOverride { combinationKey: string; optionValueIds: string[]; price: number }
export interface ProductVariant {
  combinationKey: string
  optionValueIds: string[]
  label: string
  values: ProductOptionValue[]
  price: number
  hasPriceOverride: boolean
}
export interface ProductCategory {
  _id: string
  name: string
  sortOrder: number
  productCount: number
}
export interface Product {
  _id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  categoryId?: string | ProductCategory
  isArchived: boolean
  options: ProductOption[]
  variantPriceOverrides: VariantPriceOverride[]
  excludedVariantKeys: string[]
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface CreateProductPayload {
  name: string
  description?: string
  price: number
  categoryId?: string
  options?: ProductOption[]
  variantPriceOverrides?: VariantPriceOverride[]
  excludedVariantKeys?: string[]
  imageUrl?: string
}

export interface PublicCatalogue {
  categories: ProductCategory[]
  products: Product[]
}

const productFormData = (payload: CreateProductPayload, image: File) => {
  const formData = new FormData()
  formData.append('image', image)
  formData.append('name', payload.name)
  formData.append('categoryId', payload.categoryId || '')
  formData.append('price', String(payload.price))
  if (payload.description) formData.append('description', payload.description)
  if (payload.options?.length) formData.append('options', JSON.stringify(payload.options))
  if (payload.variantPriceOverrides?.length) formData.append('variantPriceOverrides', JSON.stringify(payload.variantPriceOverrides))
  if (payload.excludedVariantKeys?.length) formData.append('excludedVariantKeys', JSON.stringify(payload.excludedVariantKeys))
  return formData
}

export const ProductsApi = {
  getPublicCatalogue: async (merchantId: string): Promise<PublicCatalogue> =>
    (
      await publicApiClient.get(
        `/public/merchants/${encodeURIComponent(merchantId)}/catalogue`,
      )
    ).data,
  getProducts: async (params?: { search?: string; categoryId?: string; archived?: boolean }): Promise<Product[]> => {
    const { data } = await apiClient.get('/products', { params })
    return data
  },
  createProduct: async (
    payload: CreateProductPayload,
    image?: File | null,
  ): Promise<Product> => {
    if (!image) return (await apiClient.post('/products', payload)).data

    return (
      await apiClient.post('/products', productFormData(payload, image), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data
  },
  updateProduct: async (
    id: string,
    payload: CreateProductPayload,
    image?: File | null,
  ): Promise<Product> => {
    if (!image) return (await apiClient.patch(`/products/${id}`, payload)).data
    return (
      await apiClient.patch(`/products/${id}`, productFormData(payload, image), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data
  },
  archiveProduct: async (id: string): Promise<Product> => (await apiClient.delete(`/products/${id}`)).data,
  restoreProduct: async (id: string, categoryId: string): Promise<Product> => (await apiClient.post(`/products/${id}/restore`, { categoryId })).data,
  getCategories: async (search?: string): Promise<{ categories: ProductCategory[]; archivedCount: number }> => (await apiClient.get('/product-categories', { params: { search } })).data,
  createCategories: async (names: string[]): Promise<ProductCategory[]> => (await apiClient.post('/product-categories', { names })).data,
  updateCategory: async (id: string, name: string): Promise<ProductCategory> => (await apiClient.patch(`/product-categories/${id}`, { name })).data,
  deleteCategory: async (id: string): Promise<{ archivedProductCount: number }> => (await apiClient.delete(`/product-categories/${id}`)).data,
}
