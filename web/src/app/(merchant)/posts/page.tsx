'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import {
  BackButton,
  Button,
  ConfirmDialog,
  EmptyState,
  LoaderCircle,
  TabSwitch,
  showNotificationToast,
} from '@/components/ui'
import { PostCard } from '@/components/posts/post-card'
import { useDrawerStore } from '@/services/drawer'
import { useDeletePost, usePosts } from '@/services/posts/hooks'
import type { MerchantPost } from '@/services/posts'
import { Sort } from 'iconsax-reactjs'

type PostsTab = 'DRAFTS' | 'POSTS'

export default function PostsPage() {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const posts = usePosts()
  const deletePost = useDeletePost()
  const [tab, setTab] = useState<PostsTab>('POSTS')
  const [deleteTarget, setDeleteTarget] = useState<MerchantPost | null>(null)
  const [sortOldestFirst, setSortOldestFirst] = useState(false)

  const visiblePosts = useMemo(() => {
    const list = (posts.data || []).filter((post) =>
      tab === 'DRAFTS' ? post.status === 'DRAFT' : post.status === 'PUBLISHED',
    )
    return sortOldestFirst ? [...list].reverse() : list
  }, [posts.data, tab, sortOldestFirst])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePost.mutateAsync(deleteTarget._id)
      showNotificationToast({ message: 'Post deleted', mode: 'success' })
      setDeleteTarget(null)
    } catch {
      showNotificationToast({ message: 'Could not delete this post.' })
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto min-h-dvh w-full max-w-125 px-3 pb-10">
        <header className="flex items-center py-1.75">
          <BackButton onClick={() => router.back()} />
          <TabSwitch
            value={tab}
            onChange={setTab}
            options={[
              { label: 'DRAFTS', value: 'DRAFTS' },
              { label: 'POSTS', value: 'POSTS' },
            ]}
            maxW="max-w-[216px]"
            className="mx-auto"
          />
          <button
            type="button"
            onClick={() => setSortOldestFirst((prev) => !prev)}
            aria-label="Filter or sort posts"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-black transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <Sort size={24} strokeWidth={2} />
          </button>
        </header>

        {posts.isLoading ? (
          <div
            role="status"
            aria-label="Loading posts"
            className="flex min-h-[70dvh] items-center justify-center"
          >
            <LoaderCircle />
          </div>
        ) : posts.isError ? (
          <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm font-medium text-[#00000080]">
              Posts could not load. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void posts.refetch()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Retry
            </button>
          </div>
        ) : visiblePosts.length ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  manage
                  onEdit={
                    post.status === 'DRAFT'
                      ? () =>
                          openDrawer({
                            type: 'post-composer',
                            props: { post },
                          })
                      : undefined
                  }
                  onDelete={() => setDeleteTarget(post)}
                />
              ))}
            </div>
            <p className="pb-2 pt-6 text-center text-[14px] font-medium text-[#00000066]">
              You’ve reached the end of the list
            </p>
          </>
        ) : (
          <div className="flex min-h-[70dvh] items-center justify-center">
            <EmptyState
              emoji={<span className="text-[56px]">📣</span>}
              title={tab === 'DRAFTS' ? 'No drafts yet' : 'No posts yet'}
              details={
                tab === 'DRAFTS'
                  ? 'Save a post while you are still working on it.'
                  : 'Share a shop update so customers can discover what is new.'
              }
              cta={
                <Button
                  onClick={() => openDrawer({ type: 'post-composer' })}
                  className="mt-6 h-10 w-fit px-5 text-sm"
                >
                  <Plus size={16} /> Create post
                </Button>
              }
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete post?"
        description="This removes the post from your Posts and the customer feed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deletePost.isPending}
      />
    </div>
  )
}
