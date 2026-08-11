import {
  getLitePaystackChannel,
  getMerchantPaystackChannels,
} from "./paystack-collection-channels";

describe("Paystack collection channel entitlements", () => {
  const verified = { planStatus: "verified" };

  it("uses card for LITE outside production", () => {
    expect(
      getMerchantPaystackChannels(
        { ...verified, planTier: "LITE" },
        { NODE_ENV: "development" },
      ),
    ).toEqual(["card"]);
  });

  it("uses bank transfer for LITE in production", () => {
    expect(
      getMerchantPaystackChannels(
        { ...verified, planTier: "LITE" },
        { NODE_ENV: "production" },
      ),
    ).toEqual(["bank_transfer"]);
  });

  it("allows an explicit LITE channel override", () => {
    expect(
      getLitePaystackChannel({
        NODE_ENV: "production",
        PAYSTACK_LITE_CHANNEL: "card",
      }),
    ).toBe("card");
  });

  it("rejects an unsafe LITE channel override", () => {
    expect(() =>
      getLitePaystackChannel({
        NODE_ENV: "production",
        PAYSTACK_LITE_CHANNEL: "ussd",
      }),
    ).toThrow("PAYSTACK_LITE_CHANNEL must be either card or bank_transfer");
  });

  it("keeps configured multiple channels for PRO and PRO MAX", () => {
    const environment = {
      NODE_ENV: "production",
      PAYSTACK_COLLECTION_CHANNELS: "card,bank_transfer,ussd",
    };

    expect(
      getMerchantPaystackChannels(
        { ...verified, planTier: "PRO" },
        environment,
      ),
    ).toEqual(["card", "bank_transfer", "ussd"]);
    expect(
      getMerchantPaystackChannels(
        { ...verified, planTier: "PROMAX" },
        environment,
      ),
    ).toEqual(["card", "bank_transfer", "ussd"]);
  });
});
