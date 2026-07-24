import { ConfigService } from "@nestjs/config";

/**
 * QR kit pricing, in NAIRA.
 *
 * All values default to 0, i.e. kits are free end to end. Setting a non-zero
 * price re-enables the Paystack paywall for that step with no code change —
 * see `QROrdersService.createOrder` and `QRKitsService.initiateActivation`.
 *
 * Amounts are held in naira everywhere and converted to kobo only at the
 * Paystack boundary via `nairaToKobo`.
 */
export interface QRKitPricing {
  kitPrice: number;
  deliveryFee: number;
  activationAmount: number;
  maxKitsPerOrder: number;
}

const readAmount = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.warn(
      `Invalid pricing env value "${raw}", falling back to ${fallback}`,
    );
    return fallback;
  }

  return parsed;
};

export const getQRKitPricing = (
  configService: ConfigService,
): QRKitPricing => ({
  kitPrice: readAmount(configService.get<string>("QR_KIT_PRICE"), 0),
  deliveryFee: readAmount(configService.get<string>("QR_KIT_DELIVERY_FEE"), 0),
  activationAmount: readAmount(
    configService.get<string>("QR_KIT_ACTIVATION_AMOUNT"),
    0,
  ),
  maxKitsPerOrder: readAmount(
    configService.get<string>("QR_KIT_MAX_PER_ORDER"),
    5,
  ),
});

export const nairaToKobo = (naira: number): number => Math.round(naira * 100);
