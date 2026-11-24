'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Bookmark, MoreHorizontal, ShoppingBag } from 'lucide-react'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { useSafeBack } from '@/hooks/use-safe-back'
import { OrderPill } from '@/components/personal/post/order-pill'
import { PostMedia } from '@/components/personal/post/post-media'
import { PostItems } from '@/components/personal/post/post-items'
import { PostPoster } from '@/components/personal/post/post-poster'
import { PostExplore } from '@/components/personal/post/post-explore'
import { PostViewer } from '@/components/personal/post/post-viewer'
import { usePostOrder } from '@/components/personal/post/use-post-order'
import { useSavedPostToggle } from '@/components/saved/use-saved-toggles'
import { useBusinessProfile } from '@/services/business-profile'
import { usePostsFeed, usePublicPost } from '@/services/posts'
import { usePublicCatalogue } from '@/services/products/hooks'

const EXPLORE_LIMIT = 8

async function sharePost(title: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href })
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    showNotificationToast({ message: 'Post link copied', mode: 'success' })
  } catch (error) {
    if ((error as DOMException).name !== 'AbortError') {
      showNotificationToast({ message: 'Could not share this post.', mode: 'error' })
    }
  }
}

function PostPageContent() {
  const postId = useSearchParams().get('postId') || ''
  const goBack = useSafeBack('/home')
  const [isFullScreen, setIsFullScreen] = useState(false)

  const postQuery = usePublicPost(postId)
  const post = postQuery.data
  const merchantId = post?.merchant?._id
  const profileQuery = useBusinessProfile(merchantId)
  const catalogueQuery = usePublicCatalogue(merchantId)
  const feedQuery = usePostsFeed({ mode: 'latest' })
  const savedPosts = useSavedPostToggle()

  const business = profileQuery.data
  const catalogue = useMemo(
    () => (catalogueQuery.data?.products ?? []).filter((product) => !product.isArchived),
    [catalogueQuery.data],
  )
  // The post carries light item records; the catalogue has the full ones
  // (options, variants) that ordering needs.
  const postProducts = useMemo(() => {
    const ids = new Set((post?.productIds ?? []).map((item) => item._id))
    return catalogue.filter((product) => ids.has(product._id))
  }, [catalogue, post])
  const morePosts = useMemo(
    () =>
      (feedQuery.data?.data ?? [])
        .filter((item) => item._id !== postId)
        .slice(0, EXPLORE_LIMIT),
    [feedQuery.data, postId],
  )

  const order = usePostOrder(merchantId, business?.serialNumber)
  const isSaved = savedPosts.isSaved(postId)

  if (postQuery.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <LoaderCircle />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center font-satoshi">
        <h1 className="text-[20px] font-bold text-black">Post unavailable</h1>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          This post may have been removed.
        </p>
        <button
          type="button"
          onClick={goBack}
          className="mt-6 h-11 rounded-full bg-black px-6 text-sm font-bold text-white"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-125 bg-white font-satoshi">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-black active:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <OrderPill itemCount={order.itemCount} onView={order.openOrder} />
        <button
          type="button"
          onClick={() => void sharePost(post.merchant?.businessName || 'Firespot post')}
          aria-label="Share post"
          className="flex h-10 w-10 items-center justify-center rounded-full text-black active:bg-gray-100"
        >
          <MoreHorizontal size={24} />
        </button>
      </header>

      <main className="px-4 pb-28">
        <PostMedia post={post} onExpand={() => setIsFullScreen(true)} />

        <section className="border-b border-[#F1F1F1] py-5">
          <h1 className="text-[14px] font-bold text-black">
            {post.merchant?.businessName}
          </h1>
          {post.caption && (
            <p className="mt-1 text-[14px] leading-relaxed font-medium whitespace-pre-line text-[#6B7280]">
              {post.caption}
            </p>
          )}
        </section>

        {merchantId && (
          <PostItems
            products={postProducts}
            merchantId={merchantId}
            canOrder={Boolean(business?.serialNumber)}
            onBuyNow={() => order.buyNow(postProducts)}
          />
        )}

        {business && <PostPoster business={business} products={catalogue} />}

        <PostExplore posts={morePosts} />
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-125 items-center justify-end gap-6 border-t border-[#F1F1F1] bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => savedPosts.toggle(postId)}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
          className="flex h-10 items-center gap-2 text-black"
        >
          <Bookmark size={24} strokeWidth={1.8} fill={isSaved ? 'currentColor' : 'none'} />
          <span className="text-[15px] font-medium">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          onClick={order.openOrder}
          disabled={order.itemCount === 0}
          aria-label="View your order"
          className="flex h-10 items-center gap-2 text-black disabled:opacity-40"
        >
          <ShoppingBag size={24} strokeWidth={1.8} />
          <span className="text-[15px] font-medium">{order.itemCount}</span>
        </button>
      </footer>

      {isFullScreen && (
        <PostViewer
          posts={[post, ...morePosts]}
          itemCount={order.itemCount}
          onViewOrder={order.openOrder}
          onClose={() => setIsFullScreen(false)}
        />
      )}
    </div>
  )
}

export default function PostPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <PostPageContent />
    </Suspense>
  )
}
