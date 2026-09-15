import { Types } from "mongoose";
import { FeedbackService } from "./feedback.service";

describe("FeedbackService customer identity", () => {
  const saleId = new Types.ObjectId();
  const merchantId = new Types.ObjectId();
  const customerId = new Types.ObjectId();

  const createService = (recordedAt: Date) => {
    const saleModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: saleId,
        merchantId,
        customerUserId: customerId,
        customerFingerprint: "original-device",
        recordedAt,
      }),
    };
    const qrKitModel = {
      findOne: jest.fn().mockResolvedValue({ collectFeedback: true }),
    };
    const userModel = {
      findById: jest.fn().mockResolvedValue({
        _id: merchantId,
        planTier: "PRO",
        planStatus: "paid",
      }),
    };
    const feedbackModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    };
    return new FeedbackService(
      feedbackModel as never,
      saleModel as never,
      qrKitModel as never,
      userModel as never,
    );
  };

  it("allows the authenticated payer from another device", async () => {
    const service = createService(new Date());

    await expect(
      service.getEligibility(
        saleId.toString(),
        "FS-ABC123",
        "different-device",
        customerId.toString(),
      ),
    ).resolves.toEqual({ eligible: true, reason: null });
  });

  it("expires feedback after two days", async () => {
    const service = createService(
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 1),
    );

    await expect(
      service.getEligibility(
        saleId.toString(),
        "FS-ABC123",
        "original-device",
        customerId.toString(),
      ),
    ).resolves.toEqual({ eligible: false, reason: "not_eligible" });
  });
});
