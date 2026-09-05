'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Edit3,
  History,
  Link2,
  LoaderCircle,
  Plus,
  Trash,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from '@bprogress/next/app'
import { Spinner, showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useProducts } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import {
  useCreatePost,
  usePostPreview,
  useUpdatePost,
} from '@/services/posts/hooks'
import type {
  MerchantPost,
  PostPlatform,
  PostPreviewResponse,
} from '@/services/posts/postsApi'
import { useUserProfile } from '@/services/users'
import { ClipboardText } from 'iconsax-reactjs'

const PLATFORM_ICONS: Record<PostPlatform, string> = {
  instagram: '/icons/ig.svg',
  facebook: '/icons/fb.svg',
  x: '/icons/twitter.svg',
  tiktok: '/icons/tiktok.png',
}

interface PostComposerDrawerProps {
  closeDrawer: () => void
  post?: MerchantPost
}

const money = (value: number) =>
  value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const errorMessage = (err: unknown, fallback: string): string => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === 'string'
  ) {
    return (err as { response: { data: { message: string } } }).response.data
      .message
  }
  return fallback
}

function PostComposerForm({ closeDrawer, post }: PostComposerDrawerProps) {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const profile = useUserProfile()
  const products = useProducts({ archived: false })
  const previewPost = usePostPreview()
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  const [sourceUrl, setSourceUrl] = useState(post?.sourceUrl || '')
  const [preview, setPreview] = useState<PostPreviewResponse | null>(
    post
      ? {
          sourceUrl: post.sourceUrl,
          platform: post.platform,
          preview: post.preview,
        }
      : null,
  )
  const [caption, setCaption] = useState(post?.caption || '')
  const [selectedIds, setSelectedIds] = useState(
    post?.productIds.map((product) => product._id) || [],
  )
  const [submittingStatus, setSubmittingStatus] = useState<
    'DRAFT' | 'PUBLISHED' | null
  >(null)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [previewImageError, setPreviewImageError] = useState(false)

  const activeRequestIdRef = useRef(0)
  const lastFetchedUrlRef = useRef(post?.sourceUrl || '')

  const selectedProducts = useMemo(() => {
    const productMap = new Map<
      string,
      Product | MerchantPost['productIds'][number]
    >((products.data || []).map((product) => [product._id, product]))
    for (const product of post?.productIds || []) {
      if (!productMap.has(product._id)) productMap.set(product._id, product)
    }
    return selectedIds
      .map((id) => productMap.get(id))
      .filter((product): product is NonNullable<typeof product> =>
        Boolean(product),
      )
  }, [post?.productIds, products.data, selectedIds])

  const handlePreview = async (value = sourceUrl) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (trimmed === lastFetchedUrlRef.current && preview) return

    const currentId = ++activeRequestIdRef.current
    try {
      const result = await previewPost.mutateAsync(trimmed)
      if (currentId !== activeRequestIdRef.current) return
      lastFetchedUrlRef.current = result.sourceUrl
      setSourceUrl(result.sourceUrl)
      setPreviewImageError(false)
      setPreview(result)
    } catch (err: unknown) {
      if (currentId !== activeRequestIdRef.current) return
      showNotificationToast({
        message: errorMessage(
          err,
          'Use a public Instagram, Facebook, X, or TikTok post link.',
        ),
      })
    }
  }

  const handlePaste = async () => {
    try {
      const value = await navigator.clipboard.readText()
      if (!value.trim()) {
        showNotificationToast({ message: 'Your clipboard is empty.' })
        return
      }
      setSourceUrl(value.trim())
      await handlePreview(value)
    } catch {
      showNotificationToast({ message: 'Could not read your clipboard.' })
    }
  }

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!sourceUrl.trim()) {
      showNotificationToast({ message: 'Paste a social post link first.' })
      return
    }

    const payload = {
      sourceUrl: sourceUrl.trim(),
      caption: caption.trim() || undefined,
      productIds: selectedIds,
      status,
    } as const

    setSubmittingStatus(status)
    try {
      if (post) {
        await updatePost.mutateAsync({ id: post._id, payload })
      } else {
        await createPost.mutateAsync(payload)
      }
      showNotificationToast({
        message: status === 'PUBLISHED' ? 'Post published' : 'Saved to drafts',
        mode: 'success',
      })
      closeDrawer()
      if (!post) router.push('/posts')
    } catch (err: unknown) {
      showNotificationToast({
        message: errorMessage(err, 'Could not save this post. Try again.'),
      })
    } finally {
      setSubmittingStatus(null)
    }
  }

  const hasUnsavedChanges = Boolean(
    (sourceUrl.trim() && sourceUrl.trim() !== (post?.sourceUrl || '')) ||
    (caption.trim() && caption.trim() !== (post?.caption || '')) ||
    selectedIds.length !== (post?.productIds?.length || 0),
  )

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true)
    } else {
      closeDrawer()
    }
  }

  const isSaving = Boolean(submittingStatus)
  const businessName =
    profile.data?.businessName ||
    [profile.data?.firstName, profile.data?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Your business'

  return (
    <div className="flex h-dvh flex-col bg-linear-to-br from-[#FFFFFF] to-[#F2F4F6] font-satoshi">
      <header className="flex shrink-0 items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => {
            closeDrawer()
            router.push('/posts')
          }}
          aria-label="View drafts and posts"
          className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#00000014] text-[#6B7280] transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <History size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-black">Posts</h1>
        <button
          type="button"
          onClick={handleRequestClose}
          aria-label="Close post composer"
          className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#F1F1F1] text-[#6B7280] transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <X size={20} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-2">
        {preview ? (
          <section className="relative mx-auto flex w-full max-w-[170px] aspect-[0.60] flex-col items-center justify-center overflow-hidden rounded-[12px]">
            <div className="h-full w-full">
              {preview.preview.imageUrl && !previewImageError ? (
                // Provider thumbnails remain externally hosted and may expire.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.preview.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setPreviewImageError(true)}
                />
              ) : (
                <div className="h-full w-full bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-black/20" />
              <div className="absolute inset-x-3 bottom-3 text-white">
                <span className="flex h-5 w-5 items-center justify-center drop-shadow-md">
                  <Image
                    src={PLATFORM_ICONS[preview.platform]}
                    alt={`${preview.platform} post`}
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                  />
                </span>
                <p className="mt-2 truncate text-[14px] font-medium">
                  {businessName}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-[#D1D5DB]">
                  {preview.preview.description ||
                    preview.preview.title ||
                    preview.sourceUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewImageError(false)
                  setPreview(null)
                }}
                aria-label="Edit post link"
                className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white shadow-[0px_2px_4px_0px_#0000000A]"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceUrl('')
                  setPreviewImageError(false)
                  setPreview(null)
                  lastFetchedUrlRef.current = ''
                }}
                aria-label="Remove post link"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white shadow-[0px_2px_4px_0px_#0000000A]"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </section>
        ) : (
          <section className="relative mx-auto flex w-full max-w-[170px] aspect-[0.60] flex-col items-center justify-center overflow-hidden rounded-[12px] p-2 border-2 border-dashed border-[#D1D5DB] bg-[#EBEDF0]">
            <div className="relative flex h-full w-full flex-col items-center justify-center">
              <Link2 size={20} strokeWidth={2} className="text-black" />

              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                onBlur={() => void handlePreview()}
                placeholder="Tap to paste link"
                className="mt-2 w-full bg-transparent text-center text-sm text-[#6B7280] outline-none placeholder:text-[#6B7280] focus-visible:underline"
              />
              <button
                type="button"
                onClick={() => void handlePaste()}
                disabled={previewPost.isPending}
                className="absolute inset-x-0 bottom-0 mx-auto flex h-9 w-[92%] items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_4px_8px_0px_#0000000A] transition-transform disabled:opacity-60"
              >
                {previewPost.isPending ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Resolving link</span>
                  </>
                ) : (
                  <>
                    <ClipboardText size={16} />
                    PASTE
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        <section className="mx-auto mt-6 overflow-hidden rounded-[12px] border border-[#E2E5EA] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
          <div className="border-b border-[#F1F1F1] px-4 pb-2 pt-4">
            <label
              htmlFor="post-caption"
              className="block text-[12px] font-medium text-[#64748B]"
            >
              Caption
            </label>
            <textarea
              id="post-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Tell customers what's in this post..."
              className="w-full resize-none bg-transparent text-[14px] font-medium leading-[130%] text-black placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>

          <div className="px-4 py-4">
            <span className="text-[12px] font-medium text-[#64748B]">
              Items in this post
            </span>
            <div className="flex items-end justify-between gap-3">
              <p className="-tracking-[0.4px] text-[20px] font-bold text-[#9CA3AF]">
                {selectedProducts.length
                  ? `${selectedProducts.length} item${selectedProducts.length === 1 ? '' : 's'}`
                  : 'Tag items for sale'}
              </p>
              <button
                type="button"
                onClick={() =>
                  openDrawer({
                    type: 'post-product-select',
                    props: {
                      selectedIds,
                      onConfirm: setSelectedIds,
                    },
                  })
                }
                className="flex h-8 shrink-0 items-center gap-2 rounded-[6px] bg-[#F4F6F8] px-2 text-[14px] font-medium text-black transition-colors"
              >
                <Plus strokeWidth={2} className="w-4 h-4" />
                Select items
              </button>
            </div>
          </div>
          {selectedProducts.length > 0 && (
            <div className="divide-y divide-[#F1F1F1] border-t border-[#F1F1F1]">
              {selectedProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center gap-3 py-2 px-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[#9CA3AF]">
                        <Link2 size={18} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-[#111827]">
                      {product.name}
                    </p>
                    <p className="truncate text-[14px] font-medium text-[#6B7280]">
                      {product.description || 'No description'}
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#374151]">
                      NGN {money(product.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((current) =>
                        current.filter((id) => id !== product._id),
                      )
                    }
                    aria-label={`Remove ${product.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F1F1F1] text-[#6B7280] hover:text-black"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="flex shrink-0 gap-3 border-t border-[#E2E5EA] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] rounded-t-[12px] pt-4">
        <button
          type="button"
          onClick={() => void handleSubmit('DRAFT')}
          disabled={isSaving || previewPost.isPending}
          className="flex min-h-[48px] h-12 flex-1 items-center justify-center rounded-full bg-[#F1F1F1] text-[16px] font-bold text-black transition-colors hover:bg-[#E5E7EB] disabled:opacity-50"
        >
          {submittingStatus === 'DRAFT' ? <Spinner /> : 'Save to drafts'}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit('PUBLISHED')}
          disabled={isSaving || previewPost.isPending}
          className="flex min-h-[48px] h-12 flex-1 items-center justify-center rounded-full bg-black text-[16px] font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {submittingStatus === 'PUBLISHED' ? <Spinner /> : 'Share Post'}
        </button>
      </footer>

      {showDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Discard changes"
        >
          <div className="w-full max-w-[340px] rounded-[20px] bg-white p-5 text-center shadow-xl">
            <h3 className="text-[18px] font-bold text-black">
              Discard unsaved post?
            </h3>
            <p className="mt-2 text-sm text-[#6B7280]">
              You have unsaved changes that will be lost if you leave.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 rounded-full bg-[#F1F1F1] py-3 text-sm font-bold text-black"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardModal(false)
                  closeDrawer()
                }}
                className="flex-1 rounded-full bg-[#EF4444] py-3 text-sm font-bold text-white"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PostComposerDrawer(props: PostComposerDrawerProps) {
  return (
    <PostComposerForm
      key={props.post?._id || 'new-post'}
      closeDrawer={props.closeDrawer}
      post={props.post}
    />
  )
}
