"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { ArrowLeft } from "lucide-react";
import { EmptyState, LoaderCircle, StatusBadge } from "@/components/ui";
import { usePayoutDetails } from "@/services/payouts";

function naira(amount: number): string {
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayoutDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const settlementId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, isError } = usePayoutDetails(settlementId);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F5F6F8] font-satoshi">
      <div className="mx-auto min-h-dvh w-full max-w-125 px-3 pb-8">
        <header className="grid grid-cols-[24px_1fr_24px] items-center py-3.5">
          <button type="button" onClick={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-6 w-6 text-black" />
          </button>
          <h1 className="text-center text-[20px] font-bold text-black">
            Payout details
          </h1>
          <span aria-hidden="true" />
        </header>

        {isError || !data ? (
          <div className="mt-16">
            <EmptyState
              emoji={<span className="text-[56px]">⚠️</span>}
              title="Payout unavailable"
              details="This payout could not be loaded. It may not belong to this account, or Paystack may be temporarily unavailable."
              cta={null}
            />
          </div>
        ) : (
          <>
            <section className="mt-3 rounded-[16px] border border-[#E6E8EB] bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.5px] text-[#64748B]">
                    Settlement #{data.settlement.id}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                    ₦{naira(data.settlement.amount)}
                  </p>
                </div>
                <StatusBadge
                  status={
                    data.settlement.status === "Paid" ? "PAID" : "PENDING"
                  }
                  label={data.settlement.status}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#F1F5F9] pt-4 text-sm">
                <div>
                  <p className="text-[#64748B]">Gross</p>
                  <p className="font-bold text-[#0F172A]">
                    ₦{naira(data.settlement.grossAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Fees</p>
                  <p className="font-bold text-[#0F172A]">
                    ₦{naira(data.settlement.fees)}
                  </p>
                </div>
              </div>
            </section>

            <h2 className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-[0.5px] text-[#64748B]">
              Transactions
            </h2>
            {data.transactions.length === 0 ? (
              <div className="rounded-[16px] border border-[#E6E8EB] bg-white p-6 text-center text-sm text-[#64748B]">
                No transactions were returned for this settlement.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] overflow-hidden rounded-[16px] border border-[#E6E8EB] bg-white shadow-xs">
                {data.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0F172A]">
                        {transaction.reference}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-[#64748B]">
                        {transaction.channel?.replaceAll("_", " ") || "Payment"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#0F172A]">
                        ₦{naira(transaction.netAmount)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        Fee ₦{naira(transaction.fees)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
