export interface User {
  id: string
  phoneNumber: string
  phoneCountryCode?: string
  fullPhoneNumber: string
  businessName?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  profilePhotoUrl?: string
  referralCode?: string
  merchantSlug?: string
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
}
