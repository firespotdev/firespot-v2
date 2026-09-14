export interface SettlementItem {
  id: number;
  domain: string;
  status: "Incoming" | "Processing" | "Paid" | "Failed";
  rawStatus: string;
  amount: number;
  grossAmount: number;
  fees: number;
  settlementDate: string;
  monthGroup?: string;
  totalCount?: number;
  subaccountCode?: string;
}

export interface NextPayoutEstimate {
  amount: number;
  dateLabel: string;
  status: "Incoming";
}

export interface PayoutsResponse {
  hasSubaccount: boolean;
  unavailableReason?: "no_plan" | "no_bank" | "provisioning_failed";
  nextPayout: NextPayoutEstimate | null;
  settlements: SettlementItem[];
  meta?: Record<string, unknown>;
}

export interface PayoutTransaction {
  id: number;
  reference: string;
  status: string;
  amount: number;
  fees: number;
  paystackFee: number;
  firespotFee: number;
  netAmount: number;
  channel: string;
  paidAt: string;
}

export interface PayoutDetailsResponse {
  settlement: {
    id: number;
    status: SettlementItem["status"];
    amount: number;
    grossAmount: number;
    fees: number;
    settlementDate: string;
  };
  transactions: PayoutTransaction[];
  meta?: Record<string, unknown>;
}
