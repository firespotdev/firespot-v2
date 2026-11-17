'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { SavedItemsResponse, SavedPostsResponse } from './interface'

export const SavedApi = {
  getItems: async (): Promise<SavedItemsResponse> => {
    const { data } = await apiClient.get('/saved/items')
    return data
  },
  setItemSaved: async (productId: string, saved: boolean) => {
    const url = `/saved/items/${productId}`
    await (saved ? apiClient.post(url) : apiClient.delete(url))
  },
  getPosts: async (): Promise<SavedPostsResponse> => {
    const { data } = await apiClient.get('/saved/posts')
    return data
  },
  setPostSaved: async (postId: string, saved: boolean) => {
    const url = `/saved/posts/${postId}`
    await (saved ? apiClient.post(url) : apiClient.delete(url))
  },
}

export const SAVED_ITEMS_KEY = ['saved', 'items']
export const SAVED_POSTS_KEY = ['saved', 'posts']

export const useSavedItems = (enabled = true) =>
  useQuery({
    queryKey: SAVED_ITEMS_KEY,
    queryFn: () => SavedApi.getItems(),
    enabled,
  })

export const useSavedPosts = (enabled = true) =>
  useQuery({
    queryKey: SAVED_POSTS_KEY,
    queryFn: () => SavedApi.getPosts(),
    enabled,
  })

/** Saves or unsaves an item; the Saved page list refreshes afterwards. */
export const useSetItemSaved = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      SavedApi.setItemSaved(productId, saved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_ITEMS_KEY }),
  })
}

/** Saves or unsaves a post; the Saved page list refreshes afterwards. */
export const useSetPostSaved = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, saved }: { postId: string; saved: boolean }) =>
      SavedApi.setPostSaved(postId, saved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_POSTS_KEY }),
  })
}
