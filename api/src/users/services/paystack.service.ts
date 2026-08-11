import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

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

interface CreateSubaccountResponse {
  status: boolean;
  message: string;
  data: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
    subaccount_code: string;
    id: number;
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
    fees?: number;
    domain?: string;
    // Present when the transaction was tied to a plan (subscription tiers)
    customer?: { customer_code?: string };
    plan?: string | { plan_code?: string };
    authorization?: {
      authorization_code?: string;
      channel?: string;
      brand?: string;
      last4?: string;
      bank?: string;
      card_type?: string;
      reusable?: boolean;
    };
  };
}

interface CreatePlanResponse {
  status: boolean;
  message: string;
  data: { plan_code: string; name: string; amount: number; interval: string };
}

interface CreateSubscriptionResponse {
  status: boolean;
  message: string;
  data: { subscription_code: string; email_token: string; status: string };
}

export interface PaystackPaginationMeta {
  total?: number;
  skipped?: number;
  perPage?: number;
  page?: number;
  pageCount?: number;
}

export interface PaystackSettlement {
  id: number;
  domain?: string;
  status: string;
  effective_amount?: number;
  total_amount?: number;
  amount?: number;
  total_processed?: number;
  total_fees?: number;
  settlement_date?: string;
  createdAt?: string;
  total_count?: number;
}

export interface PaystackSettlementTransaction {
  id: number;
  reference?: string;
  status?: string;
  amount?: number;
  fees?: number;
  channel?: string;
  paid_at?: string;
  paidAt?: string;
}

interface PaystackListResponse<T> {
  status: boolean;
  message: string;
  data: T[];
  meta?: PaystackPaginationMeta;
}

interface PaystackErrorResponse {
  message?: string;
}

export interface PaystackRefund {
  id: number;
  transaction?: number | { id?: number; reference?: string };
  amount: number;
  currency?: string;
  status: string;
  refund_reference?: string;
  expected_at?: string;
  customer_note?: string;
  merchant_note?: string;
}

export interface PaystackDisputeRecord {
  id: number;
  amount: number;
  currency?: string;
  status: string;
  category?: string;
  resolution?: string;
  dueAt?: string;
  due_at?: string;
  refund_amount?: number;
  transaction?:
    | number
    | {
        id?: number;
        reference?: string;
        amount?: number;
      };
}

interface CachedVerification {
  accountName: string;
  accountNumber: string;
  timestamp: number;
}

@Injectable()
export class PaystackService {
  private readonly paystackSecretKey: string;
  private readonly baseUrl = "https://api.paystack.co";
  // Cache verification results for 5 minutes to avoid duplicate API calls
  private readonly verificationCache = new Map<string, CachedVerification>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not configured. Please set it in your .env file.",
      );
    }
    this.paystackSecretKey = secretKey;
  }

  private getCacheKey(accountNumber: string, bankCode: string): string {
    return `${accountNumber}-${bankCode}`;
  }

  private getFromCache(
    accountNumber: string,
    bankCode: string,
  ): CachedVerification | null {
    const key = this.getCacheKey(accountNumber, bankCode);
    const cached = this.verificationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached;
    }
    // Remove expired entry
    if (cached) {
      this.verificationCache.delete(key);
    }
    return null;
  }

  private setCache(
    accountNumber: string,
    bankCode: string,
    result: { accountName: string; accountNumber: string },
  ): void {
    const key = this.getCacheKey(accountNumber, bankCode);
    this.verificationCache.set(key, {
      ...result,
      timestamp: Date.now(),
    });
  }

  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
    // Check cache first to avoid duplicate Paystack API calls
    const cached = this.getFromCache(accountNumber, bankCode);
    if (cached) {
      return {
        accountName: cached.accountName,
        accountNumber: cached.accountNumber,
      };
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
      );

      if (response.data.status && response.data.data) {
        const result = {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
        // Cache the result for subsequent calls
        this.setCache(accountNumber, bankCode, result);
        return result;
      }

      throw new HttpException(
        "Could not verify account details",
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Failed to verify account number";
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST;

        // Provide more helpful error message for 401 errors
        if (statusCode === 401) {
          throw new HttpException(
            "Paystack API key is invalid or missing. Please check your PAYSTACK_SECRET_KEY configuration.",
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        throw new HttpException(errorMessage, statusCode);
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
          country: "nigeria",
        },
      });

      return response.data.data;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch banks list",
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
    subaccount?: string;
    transactionCharge?: number;
    bearer?: "account" | "subaccount";
    channels?: string[];
    /** Paystack plan code. When set, paying creates a recurring subscription. */
    plan?: string;
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
          subaccount: params.subaccount,
          transaction_charge: params.transactionCharge,
          bearer: params.bearer,
          channels: params.channels,
          plan: params.plan,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
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
        "Failed to initialize transaction",
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to initialize payment",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<{
    id: number;
    status: string;
    reference: string;
    amount: number;
    paidAt: string;
    channel?: string;
    currency?: string;
    fees?: number;
    domain?: string;
    customerCode?: string;
    planCode?: string;
    authorizationCode?: string;
    authorizationDetails?: {
      channel?: string;
      brand?: string;
      last4?: string;
      bank?: string;
      cardType?: string;
      reusable?: boolean;
    };
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
        const d = response.data.data;
        const planCode =
          typeof d.plan === "string" ? d.plan : d.plan?.plan_code;
        return {
          id: d.id,
          status: d.status,
          reference: d.reference,
          amount: d.amount,
          paidAt: d.paid_at,
          channel: d.channel,
          currency: d.currency,
          fees: d.fees,
          domain: d.domain,
          customerCode: d.customer?.customer_code,
          planCode,
          authorizationCode: d.authorization?.authorization_code,
          authorizationDetails: d.authorization
            ? {
                channel: d.authorization.channel,
                brand: d.authorization.brand,
                last4: d.authorization.last4,
                bank: d.authorization.bank,
                cardType: d.authorization.card_type,
                reusable: d.authorization.reusable,
              }
            : undefined,
        };
      }

      throw new HttpException(
        "Failed to verify transaction",
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to verify payment",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createRefund(params: {
    transaction: string | number;
    amount?: number;
    currency?: string;
    customerNote?: string;
    merchantNote?: string;
  }): Promise<PaystackRefund> {
    return this.requestData<PaystackRefund>("post", "/refund", {
      transaction: params.transaction,
      amount: params.amount,
      currency: params.currency,
      customer_note: params.customerNote,
      merchant_note: params.merchantNote,
    });
  }

  async fetchRefund(id: string | number): Promise<PaystackRefund> {
    return this.requestData<PaystackRefund>("get", `/refund/${id}`);
  }

  async retryRefundWithCustomerDetails(
    id: string | number,
    details: { currency: string; accountNumber: string; bankId: number },
  ): Promise<PaystackRefund> {
    return this.requestData<PaystackRefund>(
      "post",
      `/refund/retry_with_customer_details/${id}`,
      {
        refund_account_details: {
          currency: details.currency,
          account_number: details.accountNumber,
          bank_id: details.bankId,
        },
      },
    );
  }

  async listDisputes(
    params: {
      status?: string;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<PaystackDisputeRecord[]> {
    const response = await axios.get<
      PaystackListResponse<PaystackDisputeRecord>
    >(`${this.baseUrl}/dispute`, {
      headers: { Authorization: `Bearer ${this.paystackSecretKey}` },
      params: {
        status: params.status,
        page: params.page,
        perPage: params.perPage,
      },
    });
    return response.data.data;
  }

  async fetchDispute(id: string | number): Promise<PaystackDisputeRecord> {
    return this.requestData<PaystackDisputeRecord>("get", `/dispute/${id}`);
  }

  async getDisputeUploadUrl(
    id: string | number,
    filename: string,
  ): Promise<{ signedUrl: string; fileName: string }> {
    const data = await this.requestData<any>(
      "get",
      `/dispute/${id}/upload_url?upload_filename=${encodeURIComponent(filename)}`,
    );
    return {
      signedUrl: data.signedUrl || data.signed_url,
      fileName: data.fileName || data.file_name || filename,
    };
  }

  async uploadDisputeEvidenceFile(
    signedUrl: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await axios.put(signedUrl, buffer, {
      headers: { "Content-Type": contentType },
      maxBodyLength: Infinity,
    });
  }

  async addDisputeEvidence(
    id: string | number,
    params: {
      customerEmail?: string;
      customerName?: string;
      customerPhone?: string;
      serviceDetails: string;
      deliveryAddress?: string;
      deliveryDate?: string;
    },
  ): Promise<any> {
    return this.requestData<any>("post", `/dispute/${id}/evidence`, {
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      service_details: params.serviceDetails,
      delivery_address: params.deliveryAddress,
      delivery_date: params.deliveryDate,
    });
  }

  async resolveDispute(
    id: string | number,
    params: {
      resolution: "merchant-accepted" | "declined";
      message: string;
      refundAmount?: number;
      uploadedFilename?: string;
      evidenceId?: number;
    },
  ): Promise<PaystackDisputeRecord> {
    return this.requestData<PaystackDisputeRecord>(
      "put",
      `/dispute/${id}/resolve`,
      {
        resolution: params.resolution,
        message: params.message,
        refund_amount: params.refundAmount,
        uploaded_filename: params.uploadedFilename,
        evidence: params.evidenceId,
      },
    );
  }

  private async requestData<T>(
    method: "get" | "post" | "put",
    path: string,
    data?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const response = await axios.request<{
        status: boolean;
        message: string;
        data: T;
      }>({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.data.status) {
        throw new HttpException(response.data.message, HttpStatus.BAD_REQUEST);
      }
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          (error.response?.data as PaystackErrorResponse | undefined)
            ?.message || "Paystack request failed",
          error.response?.status || HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /**
   * Creates a recurring plan. Used once per tier (PRO / PRO MAX) during setup;
   * the resulting plan_code goes into env config.
   */
  async createPlan(params: {
    name: string;
    amount: number; // kobo
    interval: "monthly" | "annually";
  }): Promise<{ planCode: string }> {
    try {
      const response = await axios.post<CreatePlanResponse>(
        `${this.baseUrl}/plan`,
        {
          name: params.name,
          amount: params.amount,
          interval: params.interval,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.status && response.data.data) {
        return { planCode: response.data.data.plan_code };
      }
      throw new HttpException("Failed to create plan", HttpStatus.BAD_REQUEST);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to create plan",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /**
   * Subscribes an existing customer to a plan using a saved authorization.
   * PRO MAX bills one subscription per active store, so this is called per
   * extra store beyond the one created by the initial checkout.
   */
  async createSubscription(params: {
    customer: string;
    plan: string;
    authorization?: string;
    /**
     * When recurring billing should begin. Used on a prorated upgrade so the
     * new tier's first full charge lands on the merchant's existing renewal
     * date instead of resetting the billing cycle.
     */
    startDate?: Date;
  }): Promise<{ subscriptionCode: string; emailToken: string }> {
    try {
      const response = await axios.post<CreateSubscriptionResponse>(
        `${this.baseUrl}/subscription`,
        {
          customer: params.customer,
          plan: params.plan,
          authorization: params.authorization,
          start_date: params.startDate?.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.status && response.data.data) {
        return {
          subscriptionCode: response.data.data.subscription_code,
          emailToken: response.data.data.email_token,
        };
      }
      throw new HttpException(
        "Failed to create subscription",
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to create subscription",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /**
   * Charges a saved card directly — no checkout redirect. Used for prorated
   * upgrades so the merchant is billed only the difference in-place.
   *
   * Returns success:false (rather than throwing) on a declined card, so the
   * caller can fall back to a checkout for the same amount.
   */
  async chargeAuthorization(params: {
    email: string;
    amount: number; // kobo
    authorizationCode: string;
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; reference?: string; message?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/charge_authorization`,
        {
          email: params.email,
          amount: params.amount,
          authorization_code: params.authorizationCode,
          reference: params.reference,
          metadata: params.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = response.data?.data;
      return {
        success: data?.status === "success",
        reference: data?.reference,
        message: data?.gateway_response || response.data?.message,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message:
            error.response?.data?.message || "Could not charge saved card",
        };
      }
      throw error;
    }
  }

  /** Disables a subscription (e.g. when a PRO MAX store is removed). */
  async disableSubscription(params: {
    code: string;
    token: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/subscription/disable`,
        { code: params.code, token: params.token },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return { success: Boolean(response.data?.status) };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to disable subscription",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async fetchSubscription(code: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/subscription/${code}`, {
        headers: { Authorization: `Bearer ${this.paystackSecretKey}` },
      });
      return response.data?.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to fetch subscription",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createSubaccount(params: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
    description?: string;
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
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.status && response.data.data) {
        return {
          subaccountCode: response.data.data.subaccount_code,
        };
      }

      throw new HttpException(
        "Failed to create subaccount",
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to create subaccount",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateSubaccount(
    subaccountCode: string,
    params: {
      businessName?: string;
      settlementBank?: string;
      accountNumber?: string;
      percentageCharge?: number;
      active?: boolean;
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
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to update subaccount",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async listSettlements(
    subaccountCode: string,
    params?: { perPage?: number; page?: number },
  ): Promise<PaystackListResponse<PaystackSettlement>> {
    try {
      const response = await axios.get<
        PaystackListResponse<PaystackSettlement>
      >(`${this.baseUrl}/settlement`, {
        params: {
          subaccount: subaccountCode,
          perPage: params?.perPage || 50,
          page: params?.page || 1,
        },
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError<PaystackErrorResponse>(error)) {
        throw new HttpException(
          error.response?.data?.message || "Failed to fetch settlements",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSettlementTransactions(
    settlementId: string,
    params?: { perPage?: number; page?: number },
  ): Promise<PaystackListResponse<PaystackSettlementTransaction>> {
    try {
      const response = await axios.get<
        PaystackListResponse<PaystackSettlementTransaction>
      >(`${this.baseUrl}/settlement/${settlementId}/transactions`, {
        params: {
          perPage: params?.perPage || 50,
          page: params?.page || 1,
        },
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError<PaystackErrorResponse>(error)) {
        throw new HttpException(
          error.response?.data?.message ||
            "Failed to fetch settlement transactions",
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha512", this.paystackSecretKey)
      .update(payload)
      .digest("hex");
    return hash === signature;
  }
}
