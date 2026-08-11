import {
  getEffectiveTier,
  type PlanStateLike,
} from "../merchant-plans/constants/plans";

export const PAYSTACK_COLLECTION_CHANNELS = [
  "card",
  "bank_transfer",
  "bank",
  "ussd",
  "qr",
  "apple_pay",
  "payattitude",
  "mobile_money",
  "eft",
  "capitec_pay",
] as const;

export type PaystackCollectionChannel =
  (typeof PAYSTACK_COLLECTION_CHANNELS)[number];

const DEFAULT_COLLECTION_CHANNELS: PaystackCollectionChannel[] = [
  "card",
  "bank_transfer",
  "bank",
  "ussd",
  "qr",
];

interface ChannelEnvironment {
  NODE_ENV?: string;
  PAYSTACK_COLLECTION_CHANNELS?: string;
  PAYSTACK_LITE_CHANNEL?: string;
}

function configuredCollectionChannels(
  environment: ChannelEnvironment,
): PaystackCollectionChannel[] {
  const requested = (environment.PAYSTACK_COLLECTION_CHANNELS || "")
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel): channel is PaystackCollectionChannel =>
      PAYSTACK_COLLECTION_CHANNELS.includes(
        channel as PaystackCollectionChannel,
      ),
    );

  return requested.length ? requested : DEFAULT_COLLECTION_CHANNELS;
}

/**
 * LITE stays on one Paystack channel: card in non-production environments,
 * where Pay with Transfer has no documented sandbox workflow, and managed
 * bank transfer in production. PAYSTACK_LITE_CHANNEL is an explicit deploy
 * override and intentionally accepts only those two values.
 */
export function getLitePaystackChannel(
  environment: ChannelEnvironment = process.env,
): "card" | "bank_transfer" {
  const configured = environment.PAYSTACK_LITE_CHANNEL?.trim();
  if (configured) {
    if (configured !== "card" && configured !== "bank_transfer") {
      throw new Error(
        "PAYSTACK_LITE_CHANNEL must be either card or bank_transfer",
      );
    }
    return configured;
  }

  return environment.NODE_ENV === "production" ? "bank_transfer" : "card";
}

export function getMerchantPaystackChannels(
  merchant: PlanStateLike,
  environment: ChannelEnvironment = process.env,
): PaystackCollectionChannel[] {
  const tier = getEffectiveTier(merchant);
  if (!tier) return [];
  if (tier === "LITE") return [getLitePaystackChannel(environment)];
  return configuredCollectionChannels(environment);
}
