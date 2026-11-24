'use client'

import Link from 'next/link'
import { PostCard } from '@/components/posts/post-card'
import { useSavedPostToggle } from '@/components/saved/use-saved-toggles'
import type { MerchantPost } from '@/services/posts'

/** Other posts from the feed, to keep browsing. */
export function PostExplore({ posts }: { posts: MerchantPost[] }) {
  const saved = useSavedPostToggle()
  if (posts.length === 0) return null

  return (
    <section className="py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-black">Explore more</h2>
        <Link href="/home" className="text-[12px] font-medium text-black underline underline-offset-4">
          View all
        </Link>
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 [&>article]:w-[170px] [&>article]:shrink-0">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            href={`/post?postId=${post._id}`}
            isSaved={saved.isSaved(post._id)}
            onToggleSave={() => saved.toggle(post._id)}
          />
        ))}
      </div>
    </section>
  )
}
