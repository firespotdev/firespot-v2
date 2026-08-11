import { Types } from "mongoose";
import { ScansService } from "./scans.service";

const selectedQuery = <T>(value: T) => ({
  select: jest.fn().mockResolvedValue(value),
});

function makeService(merchant: Record<string, unknown>) {
  const scanModel = {
    aggregate: jest
      .fn()
      .mockResolvedValue([
        { qrKitScans: [], accountCopies: [], customers: [] },
      ]),
  };
  const qrKitModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  const userModel = {
    findById: jest.fn(() => selectedQuery(merchant)),
  };
  const saleModel = {
    aggregate: jest.fn().mockResolvedValue([]),
  };
  const service = new ScansService(
    scanModel as never,
    qrKitModel as never,
    userModel as never,
    saleModel as never,
  );

  return { service, scanModel, saleModel };
}

describe("ScansService insights access", () => {
  const merchantId = new Types.ObjectId().toString();

  it.each(["LITE", "PRO", "PROMAX"])(
    "allows %s merchants to load insights without a plan gate",
    async (planTier) => {
      const { service, scanModel, saleModel } = makeService({
        planTier,
        planStatus: "verified",
        bankAccounts: [],
      });

      const result = await service.getMerchantInsights(merchantId, {});
      expect(result.traffic.totalCustomers).toBe(0);
      expect(result.linkedCounts).toEqual({ bankAccounts: 0, qrKits: 0 });
      expect(scanModel.aggregate).toHaveBeenCalledTimes(1);
      expect(saleModel.aggregate).toHaveBeenCalledTimes(1);
    },
  );
});
