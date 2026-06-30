export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type CustomerType = 'New' | 'Repeat';
export type SaleSource = 'QR scan' | 'Link shared' | 'Manual';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'POS' | 'Other';

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
  createdAt: string | Date;
  updatedAt: string | Date;
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
