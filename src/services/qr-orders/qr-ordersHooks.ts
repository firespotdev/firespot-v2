import { useMutation, useQuery } from '@tanstack/react-query';
import { QROrdersApi } from './qr-ordersApi';
import type {
  CreateQROrderPayload,
  QRKitPricing,
  VerifyQROrderResponse,
} from './interface';

/** Pricing is env-driven and effectively static; don't refetch it per screen. */
const PRICING_STALE_TIME = 1000 * 60 * 60;

const FALLBACK_PRICING: QRKitPricing = {
  kitPrice: 0,
  deliveryFee: 0,
  activationAmount: 0,
  maxKitsPerOrder: 5,
};

export const useCreateQROrder = () => {
  return useMutation({
    mutationFn: (payload: CreateQROrderPayload) =>
      QROrdersApi.createOrder(payload),
  });
};

export const useVerifyQROrderPayment = (
  reference: string,
  options?: Record<string, unknown>,
) => {
  return useQuery<VerifyQROrderResponse>({
    queryKey: ['qr-order-payment', reference],
    queryFn: () => QROrdersApi.verifyOrderPayment(reference),
    enabled: !!reference,
    ...options,
  });
};

/**
 * Server-authoritative QR kit pricing.
 *
 * `pricing` is never undefined so screens can render without a loading branch;
 * check `isLoading` before showing an amount, since the fallback reads as free
 * and quietly showing "free" for something chargeable would be worse than a
 * spinner.
 */
export const useQRKitPricing = () => {
  const query = useQuery({
    queryKey: ['qr-kit-pricing'],
    queryFn: () => QROrdersApi.getPricing(),
    staleTime: PRICING_STALE_TIME,
  });

  return {
    ...query,
    pricing: query.data ?? FALLBACK_PRICING,
  };
};
