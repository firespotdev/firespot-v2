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
    ios: 'https://apps.apple.com/us/app/gtworld/id1227647130',
    android: 'https://play.google.com/store/apps/details?id=com.gtbank.gtworldv1&hl=en_US',
  },
  'Access Bank': {
    ios: 'https://apps.apple.com/ng/app/access-more/id1501024389',
    android: 'https://play.google.com/store/apps/details?id=com.accessbank.nextgen&hl=en',
  },
  'First Bank': {
    ios: 'https://itunes.apple.com/ua/app/firstmobile-app/id1039809331?mt=8',
    android: 'https://play.google.com/store/apps/details?id=com.firstbank.firstmobile&hl=en',
  },
  OPay: 'https://opayapp.onelink.me/2h9f/g2eyphrb',
  Kuda: 'https://kuda.onelink.me/abUI/344e3dde/',
  Moniepoint: 'https://moniepoint.sng.link/Dcbc3/df2f?_smtype=3',
  'Zenith Bank': {
    ios: 'https://itunes.apple.com/ng/app/zenith-bank-mobile-app/id732850254?mt=8',
    android: 'https://play.google.com/store/apps/details?id=com.zenithBank.eazymoney&hl=en'
  },
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
  WEMA: 'https://alat.onelink.me/nsx9/website',
  'Alat By Wema': 'https://alat.onelink.me/nsx9/website',
  'Sterling Bank': {
    ios: 'https://apps.apple.com/us/app/sterling-onebank/id1489139430',
    android: 'https://play.google.com/store/apps/details?id=com.sterlingng.sterlingmobile',
  },
  FCMB: 'http://onelink.to/y4pjhj',
  'Fidelity Bank': {
    ios: 'https://apps.apple.com/us/app/fidelity-online-banking/id1051038075',
    android:
      'https://play.google.com/store/apps/details?id=com.interswitchng.www&hl=en',
  },
  Ecobank: {
    ios: 'https://itunes.apple.com/tz/app/ecobank-mobile-app/id1017658759?mt=8',
    android: 'https://play.google.com/store/apps/details?id=com.app.ecobank',
  },
  'Heritage Bank': {
    ios: 'http://itunes.apple.com/au/app/heritage-mobile-banking/id386772598?mt=8&ls=1',
    android: 'https://play.google.com/store/apps/details?id=au.com.heritage.app',
  },
  'Union Bank': {
    ios: 'https://apps.apple.com/ng/app/unionmobile/id1253595309',
    android: 'https://play.google.com/store/apps/details?id=com.ceva.ubmobile.stallion&pli=1',
  },
  'Unity Bank': {
    ios: 'https://apps.apple.com/ng/app/unitymobile-for-unity-bank/id768698266',
    android: 'https://play.google.com/store/apps/details?id=com.teamapt.unitymobile&hl=en',
  },
  'Stanbic IBTC': {
    ios: 'https://apps.apple.com/ng/app/stanbic-ibtc-mobile-3-0/id6477922208',
    android: 'https://play.google.com/store/apps/details?id=com.StanbicMobile&pcampaignid=web_share',
  },
  'Standard Chartered': {
    ios: 'https://apps.apple.com/ng/app/sc-mobile-nigeria/id650746202',
    android: 'https://play.google.com/store/apps/details?id=com.sc.breezenigeria.banking&hl=en',
  },
  Citibank: {
    ios: 'https://apps.apple.com/us/app/citi-mobile/id301724680',
    android: 'https://play.google.com/store/apps/details?id=com.citi.citimobile',
  },
  'Globus Bank': {
    ios: 'https://apps.apple.com/us/app/globus-mobile/id1487557023',
    android: 'https://play.google.com/store/apps/details?id=com.nero.globus_mobile&hl=en',
  },
  'Jaiz Bank': {
    ios: 'https://apps.apple.com/ng/app/jaizmobile/id991728720',
    android: 'https://play.google.com/store/apps/details?id=com.jaizbank.app&hl=en',
  },
  'Lotus Bank': {
    ios: 'https://apps.apple.com/ng/app/lotus-bank-app/id1599550703',
    android: 'https://play.google.com/store/apps/details?id=com.lotusbank.ibank&hl=en&pli=1',
  },
  'Suntrust Bank': {
    ios: 'https://apps.apple.com/ng/app/suntrust/id1477463734',
    android: 'https://play.google.com/store/apps/details?id=com.digicore.suntrust',
  },
  'Parallex Bank': {
    ios: 'https://apps.apple.com/ng/app/parallex-bank-mobile-app/id6467655510',
    android: 'https://play.google.com/store/apps/details?id=com.parallex.mobileapp',
  },
  'PremiumTrust Bank': {
    ios: 'https://apps.apple.com/us/app/premiumtrust-mobile/id1645438315',
    android: 'https://play.google.com/store/apps/details?id=com.ptb.mobile',
  },
  Carbon: {
    ios:'https://app.adjust.com/n1z55dp',
    android: 'https://play.google.com/store/apps/details?id=com.lenddo.mobile.paylater&referrer=utm_source%3Dcarbonportal%26utm_medium%3Dcarbonnavbutton%26utm_term%3Dcarbonportal%26utm_content%3Dcarbonnavbutton%26utm_campaign%25carbonportal%26anid%3Dadmob'
  },
  Paga: 'https://smart.link/h9vtrwl09tln2',
  VFD: 'https://onelink.to/vg9tjm',
  'Airtel Smartcash': {
    ios: 'https://smartcash.onelink.me/Dnai/web',
    android: 'https://play.google.com/store/apps/details?id=com.africa.smartcash',
  },
  Grey: {
    ios: 'https://link.grey.co/iOSapp',
    android: 'https://link.grey.co/androidapp'
  },
  'Chipper Cash' :{
    ios: 'https://apps.apple.com/us/app/chipper-cash/id1353631552',
    android: 'https://play.google.com/store/apps/details?id=com.chippercash&hl=en_US'
  },
  Cowrywise: 'https://cwry.se/app',
  Piggyvest: {
    ios: 'https://apps.apple.com/ng/app/piggyvest/id1263117994',
    android: 'https://play.google.com/store/apps/details?id=com.piggybankng.piggy'
  },
  'Fairmoney MFB': {
    ios: 'https://apps.apple.com/ng/app/fairmoney-microfinance-bank/id6456485223',
    android: 'https://play.google.com/store/apps/details?id=ng.com.fairmoney.fairmoney&hl=en'
  },
  Bamboo: 'https://onelink.to/appsite',
  Trove: {
    ios: 'https://apps.apple.com/app/trove-investing-simplified/id1463057240',
    android: 'https://play.google.com/store/apps/details?id=co.troveapp.android'
  },
  Chaka: {
    ios: 'https://apps.apple.com/ng/app/chaka-invest-trade-globally/id1507169124',
    android: 'https://play.google.com/store/apps/details?id=ng.chaka.android&hl=en&gl=US'
  },
  Risevest: 'https://risevest.onelink.me/gb0g?af_js_web=true&af_ss_ver=2_7_2&pid=direct&c=direct&af_channel=direct&af_ss_ui=true&web_referrer=https://www.google.com/',
  Renmoney: 'https://renmoneyng.onelink.me/anA4/lqgpam49',
  'Pocket App': {
    ios: 'https://apps.apple.com/ng/app/abeg/id1532676793',
    android: 'https://play.google.com/store/apps/details?id=com.abegapp'
  },
  'Jumia Pay': {
    ios: 'https://apps.apple.com/us/app/jumiapay/id1294620379',
    android: 'https://play.google.com/store/apps/details?id=com.jumia.one.android&hl=en'
  },
  'Konga Pay': {
    ios: 'https://apps.apple.com/ng/app/kongapay/id1105457515',
    android: 'https://play.google.com/store/apps/details?id=com.kongapay.android&hl=en'
  },
  '9Payment SB': {
    ios: 'https://apps.apple.com/ng/app/bank9ja/id1623785886',
    android: 'https://play.google.com/store/apps/details?id=com.psbcustomer'
  },
  'Momo PSB': {
    ios: 'https://apps.apple.com/ng/app/momopsb-app/id6466779764',
    android: 'https://play.google.com/store/apps/details?id=ng.mtn.android.psb.momo'
  }
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
