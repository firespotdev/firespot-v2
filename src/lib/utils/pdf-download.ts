'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

interface DownloadElementOptions {
  filename?: string
  scale?: number
  backgroundColor?: string
}

/**
 * Downloads an HTML element as a PDF file.
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: DownloadElementOptions = {}
): Promise<void> {
  const {
    filename = 'firespot-qr-kit.pdf',
    scale = 3,
    backgroundColor = '#000000',
  } = options

  try {
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

    // Add the image data directly to the PDF
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

    // Trigger the download
    pdf.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Detailed error logging to help debug if it still fails
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    throw error
  }
}
