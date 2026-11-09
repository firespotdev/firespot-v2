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

describe("ScansService recent scans", () => {
  const userId = new Types.ObjectId().toString();
  const scannedAt = new Date("2026-11-09T10:00:00.000Z");

  function makeRecentService({
    scans,
    payments,
    merchants,
  }: {
    scans: Record<string, unknown>[];
    payments: Record<string, unknown>[];
    merchants: Record<string, unknown>[];
  }) {
    const scanModel = {
      create: jest.fn(),
      aggregate: jest.fn().mockResolvedValue(scans),
    };
    const qrKitModel = {
      findById: jest.fn().mockResolvedValue({ firstScannedAt: new Date() }),
    };
    const userModel = {
      find: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(merchants),
        }),
      })),
    };
    const saleModel = {
      aggregate: jest.fn().mockResolvedValue(payments),
    };
    const service = new ScansService(
      scanModel as never,
      qrKitModel as never,
      userModel as never,
      saleModel as never,
    );
    return { service, scanModel };
  }

  it("lists each scanned business once, leaving out ones paid after the scan", async () => {
    const unpaid = new Types.ObjectId();
    const paid = new Types.ObjectId();
    const { service, scanModel } = makeRecentService({
      scans: [
        { _id: unpaid, lastScannedAt: scannedAt },
        { _id: paid, lastScannedAt: scannedAt },
      ],
      payments: [
        { _id: paid, lastPaidAt: new Date("2026-11-09T10:05:00.000Z") },
      ],
      merchants: [
        {
          _id: unpaid,
          businessName: "Theatre of Dreams",
          merchantSlug: "theatre",
          businessImageUrl: "https://example.com/logo.png",
          mainAddress: { city: "Wuse 2", state: "Abuja" },
          verificationLevel: "PROMAX",
          planStatus: "verified",
        },
        { _id: paid, businessName: "Paid Place" },
      ],
    });

    await expect(service.getRecentScansForUser(userId)).resolves.toEqual([
      {
        merchant: {
          _id: unpaid,
          businessName: "Theatre of Dreams",
          merchantSlug: "theatre",
          businessImageUrl: "https://example.com/logo.png",
          mainAddress: { city: "Wuse 2", state: "Abuja" },
          verificationLevel: "PROMAX",
        },
        lastScannedAt: scannedAt,
      },
    ]);
    const [pipeline] = scanModel.aggregate.mock.calls[0] as [
      Array<Record<string, { userId?: unknown; merchantId?: unknown }>>,
    ];
    expect(pipeline[0].$match.userId).toEqual(new Types.ObjectId(userId));
    expect(pipeline[0].$match.merchantId).toEqual({
      $ne: new Types.ObjectId(userId),
    });
  });

  it("shows no badge for a merchant whose plan is not verified", async () => {
    const merchantId = new Types.ObjectId();
    const { service } = makeRecentService({
      scans: [{ _id: merchantId, lastScannedAt: scannedAt }],
      payments: [],
      merchants: [
        {
          _id: merchantId,
          businessName: "Pending Plan",
          verificationLevel: "PRO",
          planStatus: "verifying",
        },
      ],
    });

    const [scan] = await service.getRecentScansForUser(userId);
    expect(scan.merchant.verificationLevel).toBeNull();
  });

  it("returns nothing for an invalid user id", async () => {
    const { service, scanModel } = makeRecentService({
      scans: [],
      payments: [],
      merchants: [],
    });

    await expect(service.getRecentScansForUser("not-an-id")).resolves.toEqual(
      [],
    );
    expect(scanModel.aggregate).not.toHaveBeenCalled();
  });

  it("records who scanned when the scanner is signed in", async () => {
    const { service, scanModel } = makeRecentService({
      scans: [],
      payments: [],
      merchants: [],
    });

    await service.createScan({
      qrKitId: new Types.ObjectId().toString(),
      merchantId: new Types.ObjectId().toString(),
      ipAddress: "127.0.0.1",
      userAgent: "test",
      userId,
    });

    expect(scanModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: new Types.ObjectId(userId) }),
    );
  });
});
