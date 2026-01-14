/**
 * Banking app deeplink schemes
 * Maps bank names to their mobile app URL schemes
 * Note: These are placeholder schemes and may need adjustment based on actual app schemes
 */
const BANK_APP_SCHEMES: Record<string, string> = {
  GTBank: 'gtbankapp://',
  'Access Bank': 'accessbankapp://',
  'First Bank': 'firstbankapp://',
  OPay: 'https://opayapp.onelink.me/2h9f/g2eyphrb',
  Kuda: 'https://kuda.onelink.me/abUI/344e3dde/',
  Moniepoint: 'moniepoint://',
  'Zenith Bank': 'https://www.zenithbank.com/smartlink/',
  UBA: 'ubaapp://',
  Palmpay: 'palmpay://',
  Providus: 'providusapp://',
  WEMA: 'wemaapp://',
  'Sterling Bank': 'sterlingapp://',
  FCMB: 'fcmbapp://',
  'Fidelity Bank': 'fidelityapp://',
  Ecobank: 'ecobankapp://',
  'Heritage Bank': 'heritageapp://',
  'Keystone Bank': 'keystoneapp://',
  'Union Bank': 'unionbankapp://',
  'Unity Bank': 'unityapp://',
  'Stanbic IBTC': 'stanbicapp://',
  'Standard Chartered': 'standardcharteredapp://',
  Citibank: 'citibankapp://',
  'Globus Bank': 'globusapp://',
  'Jaiz Bank': 'jaizapp://',
  'Lotus Bank': 'lotusapp://',
  'Suntrust Bank': 'suntrustapp://',
  'Titan Trust Bank': 'titantrustapp://',
  'Optimus Bank': 'optimusapp://',
  'Parallex Bank': 'parallexapp://',
  'PremiumTrust Bank': 'premiumtrustapp://',
  Carbon: 'carbonapp://',
  Paga: 'pagaapp://',
  Paycom: 'paycomapp://',
  VFD: 'vfdapp://',
  Eyowo: 'eyowoapp://',
  Gomoney: 'gomoneyapp://',
  Branch: 'branchapp://',
  'Tangerine Money': 'tangerineapp://',
  '9mobile': '9mobileapp://',
  'Airtel Smartcash': 'airtelsmartcashapp://',
  'MTN MoMo': 'mtnmomoapp://',
  'Hope PSB': 'hopepsbapp://',
}

/**
 * Get the app scheme for a bank
 * @param bankName - The name of the bank
 * @returns The app scheme URL or undefined if not found
 */
export function getBankAppScheme(bankName: string): string | undefined {
  return BANK_APP_SCHEMES[bankName]
}

/**
 * Open a banking app via deeplink
 * @param bankName - The name of the bank
 * @returns void
 */
export function openBankingApp(bankName: string): void {
  const scheme = getBankAppScheme(bankName)
  if (scheme) {
    // Try to open the app
    // Browser will handle gracefully if app is not installed
    window.location.href = scheme
  }
}
