'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PostsApi, type PostPayload } from './postsApi'

const invalidatePosts = (client: ReturnType<typeof useQueryClient>) => {
  client.invalidateQueries({ queryKey: ['posts'] })
  client.invalidateQueries({ queryKey: ['posts-feed'] })
}

export const usePosts = () =>
  useQuery({
    queryKey: ['posts'],
    queryFn: PostsApi.listMine,
  })

export const usePostsFeed = () =>
  useQuery({
    queryKey: ['posts-feed'],
    queryFn: PostsApi.feed,
  })

export const usePostPreview = () =>
  useMutation({
    mutationFn: PostsApi.preview,
  })

export const useCreatePost = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: PostPayload) => PostsApi.create(payload),
    onSuccess: () => invalidatePosts(client),
  })
}

export const useUpdatePost = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PostPayload> }) =>
      PostsApi.update(id, payload),
    onSuccess: () => invalidatePosts(client),
  })
}

export const useDeletePost = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: PostsApi.remove,
    onSuccess: () => invalidatePosts(client),
  })
}
