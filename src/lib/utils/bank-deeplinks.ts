/**
 * Banking app deeplink schemes and store links
 * Real deeplinks: string (e.g., 'opay://', 'kuda://', or smart links)
 * Store links: object with ios and android store URLs for banks without real deeplinks
 */
const BANK_APP_SCHEMES: Record<
  string,
  string | { ios: string; android: string }
> = {
  GTBank: {
    ios: '',
    android: '',
  },
  'Access Bank': {
    ios: '',
    android: '',
  },
  'First Bank': {
    ios: '',
    android: '',
  },
  OPay: 'https://opayapp.onelink.me/2h9f/g2eyphrb',
  Kuda: 'https://kuda.onelink.me/abUI/344e3dde/',
  Moniepoint: 'https://moniepoint.sng.link/Dcbc3/df2f?_smtype=3',
  'Zenith Bank': '',
  UBA: {
    ios: 'https://itunes.apple.com/ng/app/uba-mobile-banking/id1000669926?mt=8',
    android: 'https://play.google.com/store/apps/details?id=com.uba.vericash',
  },
  Palmpay: 'https://go.onelink.me/ieol/website',
  Providus: {
    ios: 'https://apps.apple.com/ng/app/providusplus/id1566859972',
    android:
      'https://play.google.com/store/apps/details?id=com.providus.providusbank&hl=en&gl=US',
  },
  WEMA: {
    ios: '',
    android: '',
  },
  'Sterling Bank': {
    ios: '',
    android: '',
  },
  FCMB: {
    ios: '',
    android: '',
  },
  'Fidelity Bank': {
    ios: 'https://apps.apple.com/us/app/fidelity-online-banking/id1051038075',
    android:
      'https://play.google.com/store/apps/details?id=com.interswitchng.www&hl=en',
  },
  Ecobank: {
    ios: '',
    android: '',
  },
  'Heritage Bank': {
    ios: '',
    android: '',
  },
  'Keystone Bank': {
    ios: '',
    android: '',
  },
  'Union Bank': {
    ios: '',
    android: '',
  },
  'Unity Bank': {
    ios: '',
    android: '',
  },
  'Stanbic IBTC': {
    ios: '',
    android: '',
  },
  'Standard Chartered': {
    ios: '',
    android: '',
  },
  Citibank: {
    ios: '',
    android: '',
  },
  'Globus Bank': {
    ios: '',
    android: '',
  },
  'Jaiz Bank': {
    ios: '',
    android: '',
  },
  'Lotus Bank': {
    ios: '',
    android: '',
  },
  'Suntrust Bank': {
    ios: '',
    android: '',
  },
  'Titan Trust Bank': {
    ios: '',
    android: '',
  },
  'Optimus Bank': {
    ios: '',
    android: '',
  },
  'Parallex Bank': {
    ios: '',
    android: '',
  },
  'PremiumTrust Bank': {
    ios: '',
    android: '',
  },
  Carbon: '',
  Paga: '',
  VFD: '',
  Eyowo: '',
  Gomoney: '',
  Branch: '',
  'Tangerine Money': '',
  '9mobile': {
    ios: '',
    android: '',
  },
  'Airtel Smartcash': {
    ios: '',
    android: '',
  },
  'MTN MoMo': {
    ios: '',
    android: '',
  },
  'Hope PSB': {
    ios: '',
    android: '',
  },
}

/**
 * Detect if the device is iOS
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  )
}

/**
 * Detect if the device is Android
 */
function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

/**
 * Get the app scheme or store link for a bank
 * @param bankName - The name of the bank
 * @returns The deeplink URL, store link object, or undefined if not found
 */
export function getBankAppScheme(
  bankName: string,
): string | { ios: string; android: string } | undefined {
  return BANK_APP_SCHEMES[bankName]
}

/**
 * Open a banking app via deeplink or store link
 * @param bankName - The name of the bank
 * @returns void
 */
export function openBankingApp(bankName: string): void {
  const scheme = getBankAppScheme(bankName)
  if (!scheme) return

  // If it's a string, it's a real deeplink - use it directly
  if (typeof scheme === 'string') {
    window.location.href = scheme
    return
  }

  // If it's an object, it's store links - use based on device
  if (typeof scheme === 'object') {
    let storeLink: string | undefined

    if (isIOS()) {
      storeLink = scheme.ios
    } else if (isAndroid()) {
      storeLink = scheme.android
    } else {
      // Fallback to Android store link for other devices
      storeLink = scheme.android
    }

    if (storeLink) {
      window.open(storeLink, '_blank')
    }
  }
}
