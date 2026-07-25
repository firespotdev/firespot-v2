export interface Bank {
  id: number
  name: string
  slug: string
  code: string
  longcode: string
  gateway: string | null
  pay_with_bank: boolean
  supports_transfer: boolean
  available_for_direct_debit: boolean
  active: boolean
  country: string
  currency: string
  type: string
  is_deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface BankResponse {
  status: boolean
  message: string
  data: Bank[]
}

export interface ValidateAccountNumberResponse {
  status: boolean
  message: string
  data: {
    account_number: string
    account_name: string
  }
}
