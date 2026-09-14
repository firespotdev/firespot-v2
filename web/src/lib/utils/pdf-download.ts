'use client'

import { toBlob, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

interface DownloadElementOptions {
  filename?: string
  scale?: number
  backgroundColor?: string
  pageMarginMm?: number
}

interface SharePNGOptions {
  filename?: string
  title?: string
  text?: string
}

const shouldIncludeNode = (node: HTMLElement) =>
  !node.hasAttribute?.('data-export-exclude')

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

export async function waitForElementAssets(
  element: HTMLElement,
): Promise<void> {
  const assetsReady = Promise.all([
    document.fonts?.ready,
    ...Array.from(element.querySelectorAll('img')).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        })
      }
      await image.decode().catch(() => undefined)
    }),
  ])
  await Promise.race([
    assetsReady,
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ])

  await nextPaint()
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function sharePNGBlob(
  blob: Blob,
  options: SharePNGOptions = {},
): Promise<'shared' | 'downloaded'> {
  const filename = sanitizeFilename(
    options.filename || 'firespot-receipt.png',
  )
  const file = new File([blob], filename, { type: 'image/png' })
  const shareData: ShareData = {
    files: [file],
    title: options.title,
    text: options.text,
  }

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare(shareData)
  ) {
    await navigator.share(shareData)
    return 'shared'
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

export async function renderElementAsPNG(
  element: HTMLElement,
  options: DownloadElementOptions = {},
): Promise<Blob> {
  const { scale = 3, backgroundColor } = options
  await waitForElementAssets(element)

  const blob = await toBlob(element, {
    pixelRatio: scale,
    cacheBust: true,
    includeQueryParams: true,
    backgroundColor,
    width: element.scrollWidth,
    height: element.scrollHeight,
    filter: shouldIncludeNode,
  })

  if (!blob) throw new Error('The receipt image could not be generated')
  return blob
}

export async function downloadElementAsPNG(
  element: HTMLElement,
  options: DownloadElementOptions = {},
): Promise<void> {
  const blob = await renderElementAsPNG(element, options)
  downloadBlob(blob, options.filename || 'firespot-receipt.png')
}

/** Downloads the displayed element proportionally on a centered A4 page. */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: DownloadElementOptions = {},
): Promise<void> {
  const {
    filename = 'firespot-qr-kit.pdf',
    scale = 4,
    backgroundColor,
    pageMarginMm = 10,
  } = options

  await waitForElementAssets(element)
  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    cacheBust: true,
    includeQueryParams: true,
    backgroundColor,
    width: element.scrollWidth,
    height: element.scrollHeight,
    filter: shouldIncludeNode,
  })

  const aspectRatio = element.scrollWidth / element.scrollHeight
  const pdf = new jsPDF({
    orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxWidth = pageWidth - pageMarginMm * 2
  const maxHeight = pageHeight - pageMarginMm * 2
  let imageWidth = maxWidth
  let imageHeight = imageWidth / aspectRatio

  if (imageHeight > maxHeight) {
    imageHeight = maxHeight
    imageWidth = imageHeight * aspectRatio
  }

  const imageX = (pageWidth - imageWidth) / 2
  const imageY = (pageHeight - imageHeight) / 2
  pdf.addImage(
    dataUrl,
    'PNG',
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    undefined,
    'FAST',
  )
  pdf.save(filename)
}
