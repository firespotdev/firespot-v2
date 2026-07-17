export interface User {
  id: string
  phoneNumber: string
  phoneCountryCode?: string
  fullPhoneNumber: string
  firstName?: string
  lastName?: string
  role?: 'merchant' | 'customer'
  businessName?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  profilePhotoUrl?: string
  referralCode?: string
  merchantSlug?: string
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
