'use client'

import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { useSavedPostToggle } from '@/components/saved/use-saved-toggles'
import type { MerchantPost } from '@/services/posts'
import { OrderPill } from './order-pill'
import { PlatformLink } from './post-media'

function ViewerSlide({ post }: { post: MerchantPost }) {
  const saved = useSavedPostToggle()
  const isSaved = saved.isSaved(post._id)
  const merchantId = post.merchant?._id

  return (
    <div className="relative h-dvh w-full shrink-0 snap-start overflow-hidden bg-black">
      {post.preview.imageUrl ? (
        // Provider thumbnails stay externally hosted and may expire.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.preview.imageUrl}
          alt={post.caption || 'Post'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30" />

      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 text-white">
        {merchantId && (
          <Link href={`/business?businessId=${merchantId}`} aria-label="View shop">
            <span className="block rounded-full border-2 border-white/80">
              <MerchantAvatar
                profilePhotoUrl={post.merchant?.businessImageUrl || post.merchant?.profilePhotoUrl}
                alt={post.merchant?.businessName || 'Shop'}
                size={44}
              />
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => saved.toggle(post._id)}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
          className="flex h-10 w-10 items-center justify-center"
        >
          <Bookmark size={28} strokeWidth={1.8} fill={isSaved ? 'white' : 'none'} />
        </button>
      </div>

      <div className="absolute inset-x-4 bottom-8 text-white">
        <div className="mb-3">
          <PlatformLink post={post} />
        </div>
        <p className="text-[17px] font-bold">{post.merchant?.businessName}</p>
        {post.caption && (
          <p className="line-clamp-2 text-[15px] font-medium text-white/85">
            {post.caption}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Full-screen posts, one per screen; swiping up moves to the next one. The
 * order pill belongs to the post the viewer was opened from.
 */
export function PostViewer({
  posts,
  itemCount,
  onViewOrder,
  onClose,
}: {
  posts: MerchantPost[]
  itemCount: number
  onViewOrder: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-125 bg-black" role="dialog" aria-label="Posts">
      <div className="scrollbar-hide h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {posts.map((post) => (
          <ViewerSlide key={post._id} post={post} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close full screen"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="pointer-events-auto">
          <OrderPill itemCount={itemCount} onView={onViewOrder} />
        </span>
        <span className="w-10" aria-hidden />
      </div>
    </div>
  )
}
