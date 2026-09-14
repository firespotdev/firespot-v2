'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

interface DownloadElementOptions {
  filename?: string
  scale?: number
  backgroundColor?: string
  pageMarginMm?: number
}

export function getA4ImagePlacement(
  pdf: jsPDF,
  aspectRatio: number,
  marginMm = 10,
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxWidth = pageWidth - marginMm * 2
  const maxHeight = pageHeight - marginMm * 2
  let width = maxWidth
  let height = width / aspectRatio

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  }
}

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
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

/** Downloads the displayed QR-kit card proportionally on a centered A4 page. */
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
  })
  const aspectRatio = element.scrollWidth / element.scrollHeight
  const pdf = new jsPDF({
    orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const placement = getA4ImagePlacement(pdf, aspectRatio, pageMarginMm)

  pdf.addImage(
    dataUrl,
    'PNG',
    placement.x,
    placement.y,
    placement.width,
    placement.height,
    undefined,
    'FAST',
  )
  pdf.save(filename)
}
