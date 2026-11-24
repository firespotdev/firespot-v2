'use client'

import { useMemo } from 'react'
import { showNotificationToast } from '@/components/ui'
import {
  useSavedItems,
  useSavedPosts,
  useSetItemSaved,
  useSetPostSaved,
} from '@/services/saved'

const failed = () =>
  showNotificationToast({
    message: 'Could not update Saved. Try again.',
    mode: 'error',
  })

/** Which posts are saved, and a toggle that confirms with a toast. */
export function useSavedPostToggle(enabled = true) {
  const { data } = useSavedPosts(enabled)
  const setSaved = useSetPostSaved()
  const savedIds = useMemo(
    () => new Set((data?.posts ?? []).map((post) => post._id)),
    [data],
  )

  const toggle = (postId: string) => {
    const saved = !savedIds.has(postId)
    setSaved.mutate(
      { postId, saved },
      {
        onSuccess: () =>
          showNotificationToast({
            message: saved ? 'Post saved' : 'Post removed from Saved',
            mode: 'success',
          }),
        onError: failed,
      },
    )
  }

  return { isSaved: (postId: string) => savedIds.has(postId), toggle }
}

/** Whether an item is saved, and a toggle that confirms with a toast. */
export function useSavedItemToggle(enabled = true) {
  const { data } = useSavedItems(enabled)
  const setSaved = useSetItemSaved()
  const savedIds = useMemo(
    () => new Set((data?.items ?? []).map((item) => item.product._id)),
    [data],
  )

  const toggle = (productId: string, name?: string) => {
    const saved = !savedIds.has(productId)
    const label = name || 'Item'
    setSaved.mutate(
      { productId, saved },
      {
        onSuccess: () =>
          showNotificationToast({
            message: saved ? `${label} saved` : `${label} removed from Saved`,
            mode: 'success',
          }),
        onError: failed,
      },
    )
  }

  return {
    isSaved: (productId: string) => savedIds.has(productId),
    toggle,
    isPending: setSaved.isPending,
  }
}
