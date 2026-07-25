export interface ShopSocialLinks {
  instagram?: string
  facebook?: string
  whatsapp?: string
  tiktok?: string
  x?: string
}

export interface ShopFulfillment {
  walkIn?: boolean
  reservations?: boolean
  homeService?: boolean
  delivery?: boolean
}

export interface ShopMainAddress {
  state?: string
  city?: string
  address?: string
  insideMarket?: boolean
}

export interface User {
  id: string
  phoneNumber: string
  phoneCountryCode?: string
  fullPhoneNumber: string
  firstName?: string
  lastName?: string
  role?: 'merchant' | 'customer'
  businessName?: string
  businessIndustry?: string
  businessDescription?: string
  // Shop setup fields (prefill the setup forms)
  businessEmail?: string | null
  website?: string | null
  socialLinks?: ShopSocialLinks | null
  fulfillment?: ShopFulfillment | null
  mainAddress?: ShopMainAddress | null
  branchCount?: number | null
  shopIsLive?: boolean
  bankName?: string
  accountNumber?: string
  accountName?: string
  profilePhotoUrl?: string
  profileBannerUrl?: string
  referralCode?: string
  merchantSlug?: string
  // Merchant plan + verification state
  planTier?: 'LITE' | 'PRO' | 'PROMAX' | null
  planStatus?: 'none' | 'paid' | 'verifying' | 'verified' | 'failed'
  verificationLevel?: 'PRO' | 'PROMAX' | null
  /** Null while lapsed — bind badges to this, not verificationLevel. */
  effectiveVerificationLevel?: 'PRO' | 'PROMAX' | null
  planCurrentPeriodEnd?: string | null
  planGraceUntil?: string | null
  isLapsed?: boolean
  /**
   * Set on each OTP verification. The upgrade prompt keys its dismissal to
   * this so it stays hidden across reloads but re-surfaces on the next login.
   */
  lastLoginAt?: string
}

export interface RequestOtpPayload {
  phoneNumber: string
  phoneCountryCode: string
}

export interface RequestOtpResponse {
  success: boolean
  message: string
  expiresIn: number
  cooldownSeconds: number
}

export interface LoginResponse {
  success: boolean
  message: string
  expiresIn: number
  cooldownSeconds: number
}

export interface SignupResponse {
  success: boolean
  message: string
  expiresIn: number
  cooldownSeconds: number
}

export interface VerifyOtpResponse {
  accessToken: string
  isNewUser: boolean
  onboardingCompleted: boolean
  user: User
}

export interface LoginPayload {
  phoneNumber: string
  phoneCountryCode: string
}

export interface SignupPayload {
  phoneNumber: string
  phoneCountryCode: string
  bankName: string
  bankCode: string
  accountNumber: string
  referralCode?: string
}

export interface VerifyOtpPayload {
  phoneNumber: string
  otpCode: string
  phoneCountryCode?: string
}

export interface UpdateProfilePayload {
  firstName: string
  lastName: string
}

export interface UpdateProfileResponse {
  message: string
  user: User
}

export interface MerchantSetupPayload {
  businessName: string
  industry: string
  description: string
  bankName: string
  bankCode: string
  accountNumber: string
  referralCode?: string
}

export interface MerchantSetupResponse {
  message: string
  user: User
}
