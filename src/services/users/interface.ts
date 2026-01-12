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
  createdAt: string
  updatedAt: string
}

export interface QRKitActivationResponse {
  message: string
  serialNumber: string
  activationAmount: number
  qrKitId: string
}

export interface UpdateProfilePhotoResponse {
  message: string
  profilePhotoUrl: string
}
