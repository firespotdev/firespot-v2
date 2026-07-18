export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'OUTSTANDING' | 'ARCHIVED';
export type CustomerType = 'New' | 'Repeat';
export type SaleSource = 'QR scan' | 'Link shared' | 'Manual';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'POS' | 'Other';

export interface SaleItem {
  productId?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  selectedVariant?: {
    size?: string;
    color?: string;
  };
}

export interface PublicSaleMerchant {
  businessName?: string;
  merchantSlug?: string;
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
  isCopied?: boolean;
  targetBankName?: string;
  paymentMethod?: string;
  description?: string;
  serialNumber?: string;
  merchant: PublicSaleMerchant | null;
}

export interface Sale {
  _id: string;
  merchantId: any;
  customerFingerprint?: string;
  customerType?: CustomerType;
  source?: SaleSource;
  status: SaleStatus;
  reference?: string;
  amount?: number;
  description?: string;
  paymentMethod?: PaymentMethod | string;
  targetBankName?: string;
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
  customerId?: any;
  customerName?: string;
  customerPhone?: string;
  items?: SaleItem[];
  receiptUrl?: string;
  receiptPublicId?: string;
  dueDate?: string | Date;
  isCollection?: boolean;
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
  todaySalesCount: number;
  todaySalesAmount: number;
  totalSalesAmount: number;
  percentageChange: number;
  previousPeriodLabel: string;
  trend: TrendData[];
}

export interface SalesResponse {
  data: Sale[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
