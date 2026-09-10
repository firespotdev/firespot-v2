export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'OUTSTANDING' | 'ARCHIVED';
export type CustomerType = 'New' | 'Repeat';
export type SaleSource = 'QR scan' | 'Link shared' | 'Manual';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'POS' | 'Other';

export interface SaleItem {
  productId?: string;
  productName?: string;
  productDescription?: string;
  productImageUrl?: string;
  price?: number;
  quantity?: number;
  selectedVariant?: {
    label?: string;
    values?: Array<{ optionId?: string; optionName?: string; valueId?: string; value: string }>;
    size?: string;
    color?: string;
  };
}

export interface PublicSaleMerchant {
  businessName?: string;
  merchantSlug?: string;
  businessImageUrl?: string;
  profilePhotoUrl?: string;
}

export interface SaleCustomer {
  _id?: string;
  name?: string;
  businessName?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
}

export interface SaleCustomerIdentity {
  _id?: string;
  profilePhotoUrl?: string;
}

/** Limited sale view served by the public GET /sales/:id/public endpoint */
export interface PublicSale {
  id: string;
  status: SaleStatus;
  amount?: number;
  items: SaleItem[];
  location?: string;
  createdAt: string;
  recordedAt?: string;
  reference?: string;
  receiptUrl?: string;
  customerMarkedPaidAt?: string;
  cancelledBy?: 'merchant' | 'customer';
  isCopied?: boolean;
  targetBankName?: string;
  targetAccountNumber?: string;
  sourceBankName?: string;
  paymentMethod?: string;
  paymentRail?: 'manual_transfer' | 'paystack';
  paystackAttemptStatus?:
    | 'initializing'
    | 'pending'
    | 'success'
    | 'failed'
    | 'abandoned';
  channel?: string;
  description?: string;
  serialNumber?: string;
  merchant: PublicSaleMerchant | null;
  canSaveCard?: boolean;
  cardDetails?: {
    brand?: string;
    last4?: string;
    bank?: string;
    cardType?: string;
  };
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth?: string;
  expYear?: string;
  bank?: string;
  cardType?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface Sale {
  _id: string;
  merchantId: CustomerSaleMerchant | string;
  customerFingerprint?: string;
  customerType?: CustomerType;
  source?: SaleSource;
  status: SaleStatus;
  reference?: string;
  amount?: number;
  description?: string;
  paymentMethod?: PaymentMethod | string;
  targetBankName?: string;
  targetAccountNumber?: string;
  sourceBankName?: string;
  serialNumber?: string;
  qrKitName?: string;
  customerPurchaseCount?: number;
  recordedAt?: string | Date;
  hasBeenEdited?: boolean;
  isArchived?: boolean;
  isPaidInFull?: boolean;
  amountPaid?: number;
  totalDue?: number;
  balanceOwed?: number;
  customerId?: SaleCustomer | string;
  customerUserId?: SaleCustomerIdentity | string;
  customerName?: string;
  customerPhone?: string;
  payerPaystackEmail?: string;
  items?: SaleItem[];
  receiptUrl?: string;
  receiptPublicId?: string;
  customerMarkedPaidAt?: string | Date;
  isScanned?: boolean;
  isCopied?: boolean;
  cancelledBy?: 'merchant' | 'customer';
  dueDate?: string | Date;
  isCollection?: boolean;
  paymentRail?: 'manual_transfer' | 'paystack';
  paystackAttemptStatus?:
    | 'initializing'
    | 'pending'
    | 'success'
    | 'failed'
    | 'abandoned';
  channel?: string;
  location?: string;
  repayments?: Array<{
    amount: number;
    paymentMethod: string;
    recordedAt?: string | Date;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Merchant fields populated on a customer's activity sale */
export interface CustomerSaleMerchant {
  _id?: string;
  businessName?: string;
  merchantSlug?: string;
  businessImageUrl?: string;
  profilePhotoUrl?: string;
  businessIndustry?: string;
}

/** A sale as seen from the paying customer's activity feed (merchant populated) */
export interface CustomerSale extends Omit<Sale, 'merchantId'> {
  merchantId: CustomerSaleMerchant | string;
}

export interface TrendData {
  label: string;
  amount: number;
  count: number;
}

export interface SalesStats {
  pendingSalesCount: number;
  pendingSalesAmount: number;
  todaySalesCount: number;
  todaySalesAmount: number;
  totalSalesAmount: number;
  percentageChange: number;
  previousPeriodLabel: string;
  trend: TrendData[];
}

export interface SalesResponse {
  data: Sale[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface ConfirmAllSalesResult {
  confirmed: Sale[];
  count: number;
  totalAmount: number;
}

export interface ArchiveAllSalesResult {
  count: number;
}
