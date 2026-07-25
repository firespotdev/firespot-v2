/**
 * Check if a color is dark (black or near-black)
 */
function isDarkColor(color: string): boolean {
  if (!color) return false
  const normalized = color.toLowerCase().trim()
  return (
    normalized === '#000000' ||
    normalized === '#000' ||
    normalized === 'black' ||
    normalized === 'rgb(0, 0, 0)' ||
    normalized === 'rgb(0,0,0)' ||
    normalized.startsWith('#000')
  )
}

/**
 * Apply gradient and logo branding to QR code SVG
 */
export function applyBrandingToSVG(
  svg: string,
  gradientStart: string,
  gradientEnd: string,
  logoUrl: string | null,
  logoSize: number,
): string {
  // Parse SVG
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
  const svgElement = svgDoc.documentElement

  // Get SVG dimensions
  const width = parseFloat(svgElement.getAttribute('width') || '1000')
  const height = parseFloat(svgElement.getAttribute('height') || '1000')

  // Create or get defs element
  let defs = svgDoc.querySelector('defs')
  if (!defs) {
    defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svgElement.insertBefore(defs, svgElement.firstChild)
  }

  // Add gradient definition
  const gradientId = 'qrGradient'
  let gradient = svgDoc.getElementById(gradientId) as SVGGradientElement | null

  if (!gradient) {
    gradient = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'linearGradient',
    ) as SVGGradientElement
    gradient.setAttribute('id', gradientId)
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', '100%')
    gradient.setAttribute('y2', '100%')

    const stop1 = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'stop',
    )
    stop1.setAttribute('offset', '0.32%')
    stop1.setAttribute('stop-color', gradientStart)

    const stop2 = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'stop',
    )
    stop2.setAttribute('offset', '100.3%')
    stop2.setAttribute('stop-color', gradientEnd)

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
  } else {
    // Update existing gradient
    const stops = gradient.querySelectorAll('stop')
    if (stops[0]) stops[0].setAttribute('stop-color', gradientStart)
    if (stops[1]) stops[1].setAttribute('stop-color', gradientEnd)
  }

  // Replace dark fills with gradient
  const allElements = svgDoc.querySelectorAll('*')
  allElements.forEach((element) => {
    // Check fill attribute
    const fill = element.getAttribute('fill')
    if (fill && isDarkColor(fill)) {
      element.setAttribute('fill', `url(#${gradientId})`)
    }

    // Check stroke attribute
    const stroke = element.getAttribute('stroke')
    if (stroke && isDarkColor(stroke)) {
      element.setAttribute('stroke', `url(#${gradientId})`)
    }

    // Check inline style attribute
    const style = element.getAttribute('style')
    if (style) {
      let newStyle = style

      // Handle fill in style
      const fillMatch = style.match(/fill\s*:\s*([^;]+)/i)
      if (fillMatch && isDarkColor(fillMatch[1])) {
        newStyle = newStyle.replace(/fill\s*:\s*[^;]+/i, `fill: url(#${gradientId})`)
      }

      // Handle stroke in style
      const strokeMatch = style.match(/stroke\s*:\s*([^;]+)/i)
      if (strokeMatch && isDarkColor(strokeMatch[1])) {
        newStyle = newStyle.replace(/stroke\s*:\s*[^;]+/i, `stroke: url(#${gradientId})`)
      }

      if (newStyle !== style) {
        element.setAttribute('style', newStyle)
      }
    }
  })

  // Also check for path elements without explicit fill (they default to black)
  const paths = svgDoc.querySelectorAll('path, rect, polygon, circle, ellipse')
  paths.forEach((path) => {
    const fill = path.getAttribute('fill')
    const style = path.getAttribute('style')
    const hasFillInStyle = style && /fill\s*:/i.test(style)

    // If no fill specified, SVG defaults to black, so apply gradient
    if (!fill && !hasFillInStyle) {
      path.setAttribute('fill', `url(#${gradientId})`)
    }
  })

  // Apply rounded corners to rect elements (QR code modules)
  const rects = svgDoc.querySelectorAll('rect')
  rects.forEach((rect) => {
    const rectWidth = parseFloat(rect.getAttribute('width') || '0')
    const rectHeight = parseFloat(rect.getAttribute('height') || '0')
    const fill = rect.getAttribute('fill')

    // Only round dark/gradient-filled rects (QR modules), not white background
    const isWhite =
      fill === '#FFFFFF' ||
      fill === '#ffffff' ||
      fill === '#FFF' ||
      fill === '#fff' ||
      fill === 'white'

    if (!isWhite && rectWidth > 0 && rectHeight > 0) {
      // Apply ~40% corner radius for a nice rounded look
      const radius = Math.min(rectWidth, rectHeight) * 0.4
      rect.setAttribute('rx', String(radius))
      rect.setAttribute('ry', String(radius))
    }
  })

  // Add logo in center if provided
  if (logoUrl) {
    const centerX = width / 2
    const centerY = height / 2
    const logoDimension = (Math.min(width, height) * logoSize) / 100

    // Create group for logo
    const logoGroup = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )

    // Add white background circle/square behind logo
    const background = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    )
    const bgSize = logoDimension * 1.2 // Slightly larger than logo
    background.setAttribute('x', String(centerX - bgSize / 2))
    background.setAttribute('y', String(centerY - bgSize / 2))
    background.setAttribute('width', String(bgSize))
    background.setAttribute('height', String(bgSize))
    background.setAttribute('fill', '#ffffff')
    background.setAttribute('rx', String(bgSize * 0.1)) // Rounded corners
    logoGroup.appendChild(background)

    // Add logo image
    const logoImage = svgDoc.createElementNS(
      'http://www.w3.org/2000/svg',
      'image',
    )
    logoImage.setAttribute('href', logoUrl)
    logoImage.setAttribute('x', String(centerX - logoDimension / 2))
    logoImage.setAttribute('y', String(centerY - logoDimension / 2))
    logoImage.setAttribute('width', String(logoDimension))
    logoImage.setAttribute('height', String(logoDimension))
    logoImage.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    logoGroup.appendChild(logoImage)

    svgElement.appendChild(logoGroup)
  }

  // Serialize back to string
  const serializer = new XMLSerializer()
  return serializer.serializeToString(svgElement)
}
