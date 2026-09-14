'use client'

import JSZip from 'jszip'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getA4ImagePlacement, waitForElementAssets } from './pdf-download'

interface GeneratePDFOptions {
  scale?: number
  backgroundColor?: string
}

/**
 * Generates a PDF blob from an HTML element (for use in batch downloads)
 */
export async function generatePDFBlob(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<Blob> {
  const { scale = 4, backgroundColor = '#FFFFFF' } = options

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
  const placement = getA4ImagePlacement(pdf, aspectRatio)

  pdf.addImage(
    dataUrl,
    'PNG',
    placement.x,
    placement.y,
    placement.width,
    placement.height,
    undefined,
    'FAST'
  )

  // Return as Blob instead of downloading
  return pdf.output('blob')
}

interface QRKitPDFData {
  serialNumber: string
  pdfBlob: Blob
}

/**
 * Downloads multiple QR kit PDFs as a ZIP file
 */
export async function downloadQRKitsAsZip(
  pdfDataList: QRKitPDFData[],
  zipFilename: string = 'firespot-qr-kits.zip'
): Promise<void> {
  const zip = new JSZip()

  // Add each PDF to the ZIP
  for (const { serialNumber, pdfBlob } of pdfDataList) {
    zip.file(`firespot-qr-kit-${serialNumber}.pdf`, pdfBlob)
  }

  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' })

  // Create download link and trigger download
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
