export interface CreateQROrderPayload {
  quantity: number;
  phoneNumber: string;
  state: string;
  lga: string;
  deliveryAddress: string;
}

/**
 * Server-side pricing, in naira. Zero means free.
 *
 * Always read prices from here rather than hardcoding them: the API is the
 * only thing that knows what it will actually charge, and these values are
 * env-driven, so a hardcoded copy silently lies when pricing changes.
 */
export interface QRKitPricing {
  kitPrice: number;
  deliveryFee: number;
  activationAmount: number;
  maxKitsPerOrder: number;
}

export type QROrderPaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

/** The settled order returned by /qr-orders/verify/:reference. */
export interface VerifyQROrderResponse {
  _id: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: QROrderPaymentStatus;
  orderStatus: string;
  paidAt?: string;
}

export interface CreateQROrderResponse {
  orderId: string;
  /** Present only for free orders — no payment step follows. */
  isFree?: boolean;
  /** Present only when payment is required. */
  authorizationUrl?: string;
  reference?: string;
  totalAmount?: number;
}
