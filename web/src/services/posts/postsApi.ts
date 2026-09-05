import { apiClient, publicApiClient } from '@/lib/utils/axios'

export type PostPlatform = 'instagram' | 'facebook' | 'x' | 'tiktok'
export type PostStatus = 'DRAFT' | 'PUBLISHED'

export interface PostPreview {
  title?: string
  description?: string
  imageUrl?: string
  siteName?: string
}

export interface PostProduct {
  _id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isArchived: boolean
}

export interface PostMerchant {
  _id: string
  businessName?: string
  profilePhotoUrl?: string
  businessImageUrl?: string
}

export interface MerchantPost {
  _id: string
  sourceUrl: string
  platform: PostPlatform
  preview: PostPreview
  caption: string
  productIds: PostProduct[]
  status: PostStatus
  publishedAt?: string
  createdAt: string
  updatedAt: string
  merchant?: PostMerchant
}

export interface PostPreviewResponse {
  sourceUrl: string
  platform: PostPlatform
  preview: PostPreview
}

export interface PostPayload {
  sourceUrl: string
  caption?: string
  productIds?: string[]
  status?: PostStatus
}

export interface PostFeedResponse {
  data: MerchantPost[]
  meta: { limit: number; total: number }
}

export const PostsApi = {
  preview: async (sourceUrl: string): Promise<PostPreviewResponse> => {
    const { data } = await apiClient.post<PostPreviewResponse>('/posts/preview', {
      sourceUrl,
    })
    return data
  },

  listMine: async (): Promise<MerchantPost[]> => {
    const { data } = await apiClient.get<MerchantPost[]>('/posts')
    return data
  },

  getMine: async (id: string): Promise<MerchantPost> => {
    const { data } = await apiClient.get<MerchantPost>(`/posts/${id}`)
    return data
  },

  create: async (payload: PostPayload): Promise<MerchantPost> => {
    const { data } = await apiClient.post<MerchantPost>('/posts', payload)
    return data
  },

  update: async (id: string, payload: Partial<PostPayload>): Promise<MerchantPost> => {
    const { data } = await apiClient.patch<MerchantPost>(`/posts/${id}`, payload)
    return data
  },

  remove: async (id: string): Promise<{ deleted: boolean }> => {
    const { data } = await apiClient.delete<{ deleted: boolean }>(`/posts/${id}`)
    return data
  },

  feed: async (): Promise<PostFeedResponse> => {
    const { data } = await publicApiClient.get<PostFeedResponse>('/public/posts/feed')
    return data
  },
}
