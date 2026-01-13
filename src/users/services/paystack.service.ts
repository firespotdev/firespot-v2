import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface BankVerificationResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
  };
}

@Injectable()
export class PaystackService {
  private readonly paystackSecretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
  }

  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
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
      );

      if (response.data.status && response.data.data) {
        return {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
      }

      throw new HttpException(
        'Could not verify account details',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to verify account number',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
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
      });

      return response.data.data;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch banks list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, any>;
  }): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
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
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status && response.data.data) {
        return {
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference: response.data.data.reference,
        };
      }

      throw new HttpException(
        'Failed to initialize transaction',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to initialize payment',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<{
    status: string;
    reference: string;
    amount: number;
    paidAt: string;
  }> {
    try {
      const response = await axios.get<VerifyTransactionResponse>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      if (response.data.status && response.data.data) {
        return {
          status: response.data.data.status,
          reference: response.data.data.reference,
          amount: response.data.data.amount,
          paidAt: response.data.data.paid_at,
        };
      }

      throw new HttpException(
        'Failed to verify transaction',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || 'Failed to verify payment',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
}
