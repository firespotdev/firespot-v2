import { apiClient } from "@/lib/utils/axios";
import type { PayoutDetailsResponse, PayoutsResponse } from "./interface";

export const PayoutsApi = {
  getPayouts: async (params?: {
    page?: number;
    perPage?: number;
  }): Promise<PayoutsResponse> => {
    const { data } = await apiClient.get("/payouts", { params });
    return data;
  },

  getPayoutDetails: async (
    settlementId: string,
  ): Promise<PayoutDetailsResponse> => {
    const { data } = await apiClient.get(`/payouts/${settlementId}`);
    return data;
  },
};
