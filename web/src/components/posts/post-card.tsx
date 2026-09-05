'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { MerchantPost, PostPlatform } from '@/services/posts'

const PLATFORM_ICONS: Record<PostPlatform, string> = {
  instagram: '/icons/ig.svg',
  facebook: '/icons/fb.svg',
  x: '/icons/twitter.svg',
  tiktok: '/icons/tiktok.png',
}

const PLATFORM_LABELS: Record<PostPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
}

interface PostCardProps {
  post: MerchantPost
  manage?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

const captionFor = (post: MerchantPost) =>
  post.caption ||
  (post.productIds.length
    ? `${post.productIds.length} item${post.productIds.length === 1 ? '' : 's'} in this post`
    : post.preview.description || post.preview.title || 'View this post')

const merchantNameFor = (post: MerchantPost) =>
  post.merchant?.businessName || 'Firespot merchant'

export function PostCard({
  post,
  manage = false,
  onEdit,
  onDelete,
}: PostCardProps) {
  const [imageError, setImageError] = useState(false)
  const isDraft = post.status === 'DRAFT'
  const caption = captionFor(post)
  const merchantName = merchantNameFor(post)

  const cardContent = (
    <div className="relative aspect-[0.63] overflow-hidden rounded-[8px] bg-[#D9DEE6]">
      {post.preview.imageUrl && !imageError ? (
        // Provider thumbnails remain externally hosted and may expire.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.preview.imageUrl}
          alt={caption}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-black/30" />

      {/* Platform icon without extra white circle */}
      <span className="absolute left-3 top-3 z-1 flex h-5 w-5 items-center justify-center drop-shadow-md">
        <Image
          src={PLATFORM_ICONS[post.platform]}
          alt={`${PLATFORM_LABELS[post.platform]} post`}
          width={20}
          height={20}
          className="h-5 w-5 object-cover"
        />
      </span>

      {/* Draft Badge (positioned cleanly next to platform icon, no overlap with delete button) */}
      {isDraft && (
        <span className="absolute left-12 top-3 z-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold tracking-[0.8px] text-white backdrop-blur-xs">
          DRAFT
        </span>
      )}

      {/* Bottom info section */}
      <div className="absolute inset-x-3 bottom-3 text-left text-white">
        <p className="truncate text-[14px] font-bold leading-[120%]">
          {merchantName}
        </p>
        <p className="mt-1 truncate text-[12px] font-medium leading-[130%] text-[#E5E7EB]">
          {caption}
        </p>
      </div>
    </div>
  )

  return (
    <article className="relative min-w-0">
      {manage && isDraft && onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="block w-full rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          aria-label={`Edit ${merchantName} draft`}
        >
          {cardContent}
        </button>
      ) : (
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          aria-label={`Open ${merchantName} ${PLATFORM_LABELS[post.platform]} post`}
        >
          {cardContent}
        </a>
      )}
    </article>
  )
}
