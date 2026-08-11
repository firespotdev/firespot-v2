import { useQuery } from "@tanstack/react-query";
import { PayoutsApi } from "./payoutsApi";

export const usePayouts = (params?: { page?: number; perPage?: number }) => {
  return useQuery({
    queryKey: ["payouts", params],
    queryFn: () => PayoutsApi.getPayouts(params),
  });
};

export const usePayoutDetails = (settlementId?: string) => {
  return useQuery({
    queryKey: ["payout-details", settlementId],
    queryFn: () => PayoutsApi.getPayoutDetails(settlementId!),
    enabled: Boolean(settlementId),
  });
};
