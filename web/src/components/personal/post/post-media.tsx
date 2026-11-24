'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Maximize2 } from 'lucide-react'
import type { MerchantPost, PostPlatform } from '@/services/posts'

export const PLATFORM_LABELS: Record<PostPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
}

export const PLATFORM_ICONS: Record<PostPlatform, string> = {
  instagram: '/icons/ig.svg',
  facebook: '/icons/fb.svg',
  x: '/icons/twitter.svg',
  tiktok: '/icons/tiktok.png',
}

/** "View on TikTok" chip linking to the original post. */
export function PlatformLink({ post }: { post: MerchantPost }) {
  return (
    <a
      href={post.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center gap-2 rounded-full bg-black/55 pr-4 pl-1.5 text-[14px] font-medium text-white backdrop-blur-sm"
    >
      <Image
        src={PLATFORM_ICONS[post.platform]}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-[8px] object-cover"
      />
      View on {PLATFORM_LABELS[post.platform]}
    </a>
  )
}

/** The post's picture, with the original-post link and full-screen button. */
export function PostMedia({
  post,
  onExpand,
}: {
  post: MerchantPost
  onExpand: () => void
}) {
  const [imageError, setImageError] = useState(false)
  const hasImage = Boolean(post.preview.imageUrl) && !imageError

  return (
    <div className="relative aspect-[0.68] w-full overflow-hidden rounded-[16px] bg-[#D9DEE6]">
      {hasImage ? (
        // Provider thumbnails stay externally hosted and may expire.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.preview.imageUrl}
          alt={post.caption || 'Post'}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
      )}
      <button
        type="button"
        onClick={onExpand}
        aria-label="View full screen"
        className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <Maximize2 size={18} />
      </button>
      <div className="absolute bottom-3 left-3">
        <PlatformLink post={post} />
      </div>
    </div>
  )
}
