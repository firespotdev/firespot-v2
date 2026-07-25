'use client'

import JSZip from 'jszip'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

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
  const { scale = 3, backgroundColor = '#000000' } = options

  // Generate PNG at high resolution using html-to-image
  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    cacheBust: true,
    backgroundColor,
  })

  // Create a temporary image to get dimensions
  const img = new Image()
  img.src = dataUrl

  await new Promise((resolve) => {
    img.onload = resolve
  })

  // Calculate PDF dimensions based on image aspect ratio
  const imgWidth = img.width
  const imgHeight = img.height
  const aspectRatio = imgWidth / imgHeight

  // Use A4 width (210mm) as reference, calculate height to maintain aspect ratio
  const pdfWidth = 210
  const pdfHeight = pdfWidth / aspectRatio

  // Create PDF with custom dimensions
  const pdf = new jsPDF({
    orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  })

  // Add image data directly to the PDF
  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

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
