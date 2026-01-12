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
}
