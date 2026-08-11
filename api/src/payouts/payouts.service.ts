import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import {
  PaystackPaginationMeta,
  PaystackService,
  PaystackSettlement,
} from "../users/services/paystack.service";
import { PaystackSubaccountsService } from "../users/services/paystack-subaccounts.service";
import { Sale, SaleDocument } from "../schemas/sale.schema";

export interface SettlementItem {
  id: number;
  domain: string;
  status: "Incoming" | "Processing" | "Paid" | "Failed";
  rawStatus: string;
  amount: number; // in Naira
  grossAmount: number;
  fees: number;
  settlementDate: string;
  settlementDateFormatted?: string;
  monthGroup?: string;
  totalCount?: number;
  subaccountCode?: string;
}

export interface NextPayoutEstimate {
  amount: number; // in Naira
  dateLabel: string; // e.g. "Tomorrow", "Monday", "Today"
  status: "Incoming";
}

export interface PayoutsResponse {
  hasSubaccount: boolean;
  unavailableReason?: "no_plan" | "no_bank" | "provisioning_failed";
  nextPayout: NextPayoutEstimate | null;
  settlements: SettlementItem[];
  meta?: PaystackPaginationMeta | null;
}

function calculateNextPayoutDate(now = new Date()): {
  dateLabel: string;
  targetDate: Date;
} {
  const target = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

  // Paystack settles T+1 working days
  if (dayOfWeek === 5) {
    // Friday -> settles Monday (+3 days)
    target.setDate(target.getDate() + 3);
    return { dateLabel: "Monday", targetDate: target };
  } else if (dayOfWeek === 6) {
    // Saturday -> settles Monday (+2 days)
    target.setDate(target.getDate() + 2);
    return { dateLabel: "Monday", targetDate: target };
  } else {
    // Sun-Thu -> settles next day
    target.setDate(target.getDate() + 1);
    const label =
      target.getDate() === now.getDate() + 1 ? "Tomorrow" : "Next working day";
    return { dateLabel: label, targetDate: target };
  }
}

function payoutDateLabel(dateStr?: string): string {
  if (!dateStr) return calculateNextPayoutDate().dateLabel;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime()))
    return calculateNextPayoutDate().dateLabel;

  const now = new Date();
  const localDay = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  const today = localDay(now);
  const tomorrow = localDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const targetDay = localDay(target);
  if (targetDay === today) return "Today";
  if (targetDay === tomorrow) return "Tomorrow";
  return target.toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatMonthGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Earlier";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function mapPaystackStatus(
  status?: string,
): "Incoming" | "Processing" | "Paid" | "Failed" {
  switch (status?.toLowerCase()) {
    case "success":
    case "paid":
    case "settled":
      return "Paid";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "pending":
    default:
      return "Incoming";
  }
}

@Injectable()
export class PayoutsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private paystackService: PaystackService,
    private paystackSubaccountsService: PaystackSubaccountsService,
  ) {}

  async getPayouts(
    merchantId: string,
    query?: { page?: number; perPage?: number },
  ): Promise<PayoutsResponse> {
    const user = await this.userModel.findById(merchantId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.paystackSubaccountCode) {
      const provisioning =
        await this.paystackSubaccountsService.ensureForUser(user);
      if (provisioning.status !== "ready") {
        const unavailableReason =
          provisioning.status === "failed"
            ? "provisioning_failed"
            : provisioning.status;
        return {
          hasSubaccount: false,
          unavailableReason,
          nextPayout: null,
          settlements: [],
        };
      }
    }

    if (!user.paystackSubaccountCode) {
      return {
        hasSubaccount: false,
        unavailableReason: "provisioning_failed",
        nextPayout: null,
        settlements: [],
      };
    }

    const response = await this.paystackService.listSettlements(
      user.paystackSubaccountCode,
      query,
    );

    const data = response.data;
    const meta = response.meta || null;

    let incomingSumKobo = 0;
    const settlements: SettlementItem[] = data.map((item) => {
      const statusMapped = mapPaystackStatus(item.status);
      // Paystack defines effective_amount as what reaches the settlement
      // account; total_processed is gross and total_fees is the deduction.
      const netKobo =
        item.effective_amount ?? item.total_amount ?? item.amount ?? 0;
      const grossKobo = item.total_processed ?? netKobo;
      const feeKobo = item.total_fees ?? Math.max(0, grossKobo - netKobo);
      const amountNaira = netKobo / 100;

      if (statusMapped === "Incoming") {
        incomingSumKobo += netKobo;
      }

      const dateStr = item.settlement_date || item.createdAt || "";
      return {
        id: item.id,
        domain: item.domain || "live",
        status: statusMapped,
        rawStatus: item.status,
        amount: amountNaira,
        grossAmount: grossKobo / 100,
        fees: feeKobo / 100,
        settlementDate: dateStr,
        monthGroup: formatMonthGroup(dateStr),
        totalCount: item.total_count,
        subaccountCode: user.paystackSubaccountCode,
      };
    });

    let nextPayout: NextPayoutEstimate | null = null;
    if (
      incomingSumKobo > 0 ||
      settlements.some((s) => s.status === "Incoming")
    ) {
      const incomingSettlements = settlements.filter(
        (settlement) => settlement.status === "Incoming",
      );
      const nextSettlement = incomingSettlements
        .filter((settlement) => settlement.settlementDate)
        .sort(
          (left, right) =>
            new Date(left.settlementDate).getTime() -
            new Date(right.settlementDate).getTime(),
        )[0];
      const incomingAmount =
        nextSettlement?.amount ||
        (incomingSumKobo > 0 ? incomingSumKobo / 100 : 0);

      nextPayout = {
        amount: incomingAmount,
        dateLabel: payoutDateLabel(nextSettlement?.settlementDate),
        status: "Incoming",
      };
    }

    return {
      hasSubaccount: true,
      nextPayout,
      settlements,
      meta,
    };
  }

  async getPayoutDetails(
    merchantId: string,
    settlementId: string,
    query?: { page?: number; perPage?: number },
  ) {
    const user = await this.userModel.findById(merchantId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.paystackSubaccountCode) {
      throw new NotFoundException("Subaccount not found");
    }

    // The detail endpoint itself accepts only a settlement id. Prove that id
    // appears in the authenticated merchant's filtered settlement list before
    // exposing its transactions.
    let ownedSettlement: PaystackSettlement | undefined;
    let page = 1;
    do {
      const settlements = await this.paystackService.listSettlements(
        user.paystackSubaccountCode,
        { page, perPage: 100 },
      );
      ownedSettlement = settlements.data.find(
        (item) => String(item.id) === String(settlementId),
      );
      if (ownedSettlement) break;
      const pageCount = Number(settlements.meta?.pageCount || 1);
      if (page >= pageCount) break;
      page += 1;
    } while (page <= 100);

    if (!ownedSettlement) {
      throw new ForbiddenException(
        "Settlement does not belong to this merchant",
      );
    }

    const details = await this.paystackService.getSettlementTransactions(
      settlementId,
      query,
    );

    const rawTransactions = details.data;
    const references = rawTransactions
      .map((transaction) => transaction.reference)
      .filter((reference): reference is string => Boolean(reference));
    const localSales = references.length
      ? await this.saleModel
          .find({
            merchantId: user._id,
            paystackReference: { $in: references },
          })
          .select(
            "paystackReference grossAmount paystackFee firespotFee netAmount",
          )
          .lean()
          .exec()
      : [];
    const saleByReference = new Map(
      localSales
        .filter((sale) => Boolean(sale.paystackReference))
        .map((sale) => [sale.paystackReference, sale]),
    );

    return {
      settlement: {
        id: ownedSettlement.id,
        status: mapPaystackStatus(ownedSettlement.status),
        amount:
          (ownedSettlement.effective_amount ??
            ownedSettlement.total_amount ??
            0) / 100,
        grossAmount:
          (ownedSettlement.total_processed ??
            ownedSettlement.effective_amount ??
            ownedSettlement.total_amount ??
            0) / 100,
        fees: (ownedSettlement.total_fees ?? 0) / 100,
        settlementDate: ownedSettlement.settlement_date,
      },
      transactions: rawTransactions.map((transaction) => {
        const localSale = saleByReference.get(transaction.reference);
        const grossAmount =
          localSale?.grossAmount ?? (transaction.amount ?? 0) / 100;
        const paystackFee =
          localSale?.paystackFee ?? (transaction.fees ?? 0) / 100;
        const firespotFee = localSale?.firespotFee ?? 0;
        return {
          id: transaction.id,
          reference: transaction.reference,
          status: transaction.status,
          amount: grossAmount,
          paystackFee,
          firespotFee,
          fees: paystackFee + firespotFee,
          netAmount:
            localSale?.netAmount ?? grossAmount - paystackFee - firespotFee,
          channel: transaction.channel,
          paidAt: transaction.paid_at || transaction.paidAt,
        };
      }),
      meta: details.meta || null,
    };
  }
}
