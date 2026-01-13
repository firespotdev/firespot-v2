export function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet'
  }

  if (
    /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      ua,
    )
  ) {
    return 'mobile'
  }

  return 'desktop'
}

export function detectBrowserType(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('chrome') && !ua.includes('edg')) {
    return 'chrome'
  }
  if (ua.includes('firefox')) {
    return 'firefox'
  }
  if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'safari'
  }
  if (ua.includes('edg')) {
    return 'edge'
  }
  if (ua.includes('opera') || ua.includes('opr')) {
    return 'opera'
  }

  return 'unknown'
}
