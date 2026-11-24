'use client'

import { PostCard } from '@/components/posts/post-card'
import { cn } from '@/lib/utils'
import type { MerchantPost } from '@/services/posts'
import { useSavedPostToggle } from './use-saved-toggles'

/** Saved posts as a scrolling row (ALL) or a two-column grid (POSTS). */
export function SavedPosts({
  posts,
  layout,
}: {
  posts: MerchantPost[]
  layout: 'row' | 'grid'
}) {
  const { toggle } = useSavedPostToggle()

  return (
    <div
      className={cn(
        layout === 'row'
          ? 'scrollbar-hide -mx-3 flex gap-3 overflow-x-auto px-3 [&>article]:w-[160px] [&>article]:shrink-0'
          : 'grid grid-cols-2 gap-3',
      )}
    >
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          href={`/post?postId=${post._id}`}
          isSaved
          onToggleSave={() => toggle(post._id)}
        />
      ))}
    </div>
  )
}
