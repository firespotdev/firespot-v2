import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

interface BankVerificationResponse {
  status: boolean
  message: string
  data: {
    account_number: string
    account_name: string
    bank_id: number
  }
}

interface InitializeTransactionResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface CreateSubaccountResponse {
  status: boolean
  message: string
  data: {
    business_name: string
    settlement_bank: string
    account_number: string
    percentage_charge: number
    subaccount_code: string
    id: number
  }
}

interface VerifyTransactionResponse {
  status: boolean
  message: string
  data: {
    id: number
    status: string
    reference: string
    amount: number
    paid_at: string
    channel: string
    currency: string
  }
}

interface CachedVerification {
  accountName: string
  accountNumber: string
  timestamp: number
}

@Injectable()
export class PaystackService {
  private readonly paystackSecretKey: string
  private readonly baseUrl = 'https://api.paystack.co'
  // Cache verification results for 5 minutes to avoid duplicate API calls
  private readonly verificationCache = new Map<string, CachedVerification>()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    if (!secretKey) {
      throw new Error(
        'PAYSTACK_SECRET_KEY is not configured. Please set it in your .env file.',
      )
    }
    this.paystackSecretKey = secretKey
  }

  private getCacheKey(accountNumber: string, bankCode: string): string {
    return `${accountNumber}-${bankCode}`
  }

  private getFromCache(
    accountNumber: string,
    bankCode: string,
  ): CachedVerification | null {
    const key = this.getCacheKey(accountNumber, bankCode)
    const cached = this.verificationCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached
    }
    // Remove expired entry
    if (cached) {
      this.verificationCache.delete(key)
    }
    return null
  }

  private setCache(
    accountNumber: string,
    bankCode: string,
    result: { accountName: string; accountNumber: string },
  ): void {
    const key = this.getCacheKey(accountNumber, bankCode)
    this.verificationCache.set(key, {
      ...result,
      timestamp: Date.now(),
    })
  }

  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
    // Check cache first to avoid duplicate Paystack API calls
    const cached = this.getFromCache(accountNumber, bankCode)
    if (cached) {
      return {
        accountName: cached.accountName,
        accountNumber: cached.accountNumber,
      }
    }

    try {
      const response = await axios.get<BankVerificationResponse>(
        `${this.baseUrl}/bank/resolve`,
        {
          params: {
            account_number: accountNumber,
            bank_code: bankCode,
          },
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      )

      if (response.data.status && response.data.data) {
        const result = {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        }
        // Cache the result for subsequent calls
        this.setCache(accountNumber, bankCode, result)
        return result
      }

      throw new HttpException(
        'Could not verify account details',
        HttpStatus.BAD_REQUEST,
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || 'Failed to verify account number'
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST

        // Provide more helpful error message for 401 errors
        if (statusCode === 401) {
          throw new HttpException(
            'Paystack API key is invalid or missing. Please check your PAYSTACK_SECRET_KEY configuration.',
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }

        throw new HttpException(errorMessage, statusCode)
      }
      throw error
    }
  }

  async getBanks(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/bank`, {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
        params: {
          country: 'nigeria',
        },
      })

      return response.data.data
    } catch (error) {
      throw new HttpException(
        'Failed to fetch banks list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async initializeTransaction(params: {
    email: string
    amount: number
    reference: string
    callbackUrl: string
    metadata?: Record<string, any>
    subaccount?: string
    transactionCharge?: number
  }): Promise<{
    authorizationUrl: string
    accessCode: string
    reference: string
  }> {
    try {
      const response = await axios.post<InitializeTransactionResponse>(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: params.email,
          amount: params.amount,
          reference: params.reference,
          callback_url: params.callbackUrl,
          metadata: params.metadata,
          subaccount: params.subaccount,
          transaction_charge: params.transactionCharge,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.data.status && response.data.data) {
        return {
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference: response.data.data.reference,
        }
      }

      throw new HttpException(
        'Failed to initialize transaction',
        HttpStatus.BAD_REQUEST,
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to initialize payment',
          HttpStatus.BAD_REQUEST,
        )
      }
      throw error
    }
  }

  async verifyTransaction(reference: string): Promise<{
    status: string
    reference: string
    amount: number
    paidAt: string
  }> {
    try {
      const response = await axios.get<VerifyTransactionResponse>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      )

      if (response.data.status && response.data.data) {
        return {
          status: response.data.data.status,
          reference: response.data.data.reference,
          amount: response.data.data.amount,
          paidAt: response.data.data.paid_at,
        }
      }

      throw new HttpException(
        'Failed to verify transaction',
        HttpStatus.BAD_REQUEST,
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to verify payment',
          HttpStatus.BAD_REQUEST,
        )
      }
      throw error
    }
  }

  async createSubaccount(params: {
    businessName: string
    settlementBank: string
    accountNumber: string
    percentageCharge: number
    description?: string
  }): Promise<{ subaccountCode: string }> {
    try {
      const response = await axios.post<CreateSubaccountResponse>(
        `${this.baseUrl}/subaccount`,
        {
          business_name: params.businessName,
          settlement_bank: params.settlementBank,
          account_number: params.accountNumber,
          percentage_charge: params.percentageCharge,
          description: params.description,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.data.status && response.data.data) {
        return {
          subaccountCode: response.data.data.subaccount_code,
        }
      }

      throw new HttpException(
        'Failed to create subaccount',
        HttpStatus.BAD_REQUEST,
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to create subaccount',
          HttpStatus.BAD_REQUEST,
        )
      }
      throw error
    }
  }

  async updateSubaccount(
    subaccountCode: string,
    params: {
      businessName?: string
      settlementBank?: string
      accountNumber?: string
      percentageCharge?: number
      active?: boolean
    },
  ): Promise<any> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/subaccount/${subaccountCode}`,
        {
          business_name: params.businessName,
          settlement_bank: params.settlementBank,
          account_number: params.accountNumber,
          percentage_charge: params.percentageCharge,
          active: params.active,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to update subaccount',
          HttpStatus.BAD_REQUEST,
        )
      }
      throw error
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto')
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex')
    return hash === signature
  }
}
