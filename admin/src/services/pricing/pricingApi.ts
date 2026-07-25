import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/utils/axios';

/** QR kit pricing, in naira. Zero means free. */
export interface QRKitPricing {
  kitPrice: number;
  deliveryFee: number;
  activationAmount: number;
  maxKitsPerOrder: number;
}

const FALLBACK_PRICING: QRKitPricing = {
  kitPrice: 0,
  deliveryFee: 0,
  activationAmount: 0,
  maxKitsPerOrder: 5,
};

export const pricingApi = {
  getPricing: async (): Promise<QRKitPricing> => {
    const response = await adminApiClient.get<QRKitPricing>(
      '/qr-orders/pricing',
    );
    return response.data;
  },
};

/**
 * Server-authoritative pricing.
 *
 * Kit records carry their own `activationAmount` column, but it goes stale:
 * kits created before a price change keep the old value while the API charges
 * the configured one. Read prices from here, not from the kit.
 */
export const useQRKitPricing = () => {
  const query = useQuery({
    queryKey: ['qr-kit-pricing'],
    queryFn: () => pricingApi.getPricing(),
    staleTime: 1000 * 60 * 60,
  });

  return { ...query, pricing: query.data ?? FALLBACK_PRICING };
};
