import type { User } from '../auth/interface'

export interface BankAccount {
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  isPrimary: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserProfile extends User {
  bankAccounts: BankAccount[]
  merchantSlug?: string
  availableKitEntitlements?: number
  createdAt: string
  updatedAt: string
}

export interface QRKitActivationResponse {
  message: string
  serialNumber: string
  activationAmount: number
  qrKitId: string
  authorizationUrl?: string
  reference?: string
  isAutoActivated?: boolean
}

export interface SerialCheckResponse {
  status: 'available' | 'already_bound' | 'not_found'
  serialNumber: string
}

export interface PaymentVerificationResponse {
  message: string
  serialNumber: string
  merchantId: string
  alreadyActivated: boolean
}

export interface UpdateProfilePhotoResponse {
  message: string
  profilePhotoUrl: string
}

export interface UpdateProfileBannerResponse {
  message: string
  profileBannerUrl: string
}
