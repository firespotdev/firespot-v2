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

export type ShopDay = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export interface ShopDaySchedule {
  day: ShopDay
  enabled: boolean
  opensAt?: string
  closesAt?: string
  closesNextDay: boolean
}

export interface EmployeeSetup {
  employeeCount: number
  staff: Array<{
    name: string
    phoneNumber: string
    source: 'contacts'
  }>
  configuredAt?: string
}

export interface ShopPolicies {
  returns: boolean
  exchanges: boolean
  cancellations: boolean
  refunds: boolean
  configuredAt?: string
}

export interface ActiveHoursSetup {
  openingHours: {
    useDifferentTimes: boolean
    timezone: string
    days: ShopDaySchedule[]
  }
  appointmentAndReservation: {
    bookingType: 'SPACE' | 'APPOINTMENT'
    bookableHours: {
      days: ShopDaySchedule[]
    }
    capacity: {
      guestsAtOnce?: number
      largestGroup?: number
      customersAtOnce?: number
    }
    instantConfirmation: boolean
    freeCancellations: boolean
    deposit: {
      amount: number
      depositType: 'FIXED' | 'PERCENTAGE'
    }
    freeCancellationHours?: number
  }
  configuredAt?: string
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
  employeeSetup?: EmployeeSetup | null
  shopPolicies?: ShopPolicies | null
  activeHoursSetup?: ActiveHoursSetup | null
  shopIsLive?: boolean
  bankName?: string
  accountNumber?: string
  accountName?: string
  profilePhotoUrl?: string
  profileBannerUrl?: string
  referralCode?: string
  merchantReferralCode?: string
  referralSource?: 'agent' | 'merchant' | null
  merchantSlug?: string
  // Merchant plan + verification state
  planTier?: 'LITE' | 'PRO' | 'PROMAX' | null
  planStatus?: 'none' | 'paid' | 'verifying' | 'verified' | 'failed'
  nextKycStep?: 'bvn' | 'nin' | 'cac' | null
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
  merchantReferralCode?: string
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
  merchantReferralCode?: string
}

export interface MerchantSetupResponse {
  message: string
  user: User
}
