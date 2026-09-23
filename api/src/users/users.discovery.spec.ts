jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
  customAlphabet: () => () => "test-slug",
}));

import { Types } from "mongoose";
import { UsersService } from "./users.service";

describe("UsersService public merchant discovery", () => {
  it("returns only live merchants with an active payment QR serial", async () => {
    const merchantId = new Types.ObjectId();
    let capturedFilter: unknown;
    const execMerchants = jest.fn().mockResolvedValue([
      {
        _id: merchantId,
        businessName: "Mina's Market",
        businessIndustry: "Groceries",
        mainAddress: { city: "Lagos", state: "Lagos" },
      },
    ]);
    const userFind = jest.fn((filter: unknown) => {
      capturedFilter = filter;
      return {
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({ exec: execMerchants }),
              }),
            }),
          }),
        }),
      };
    });
    const qrKitModel = {
      distinct: jest.fn().mockResolvedValue([merchantId]),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest
                .fn()
                .mockResolvedValue([{ merchantId, serialNumber: "FS-ABC123" }]),
            }),
          }),
        }),
      }),
    };
    const userModel = {
      find: userFind,
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      }),
    };
    const service = Object.create(UsersService.prototype) as UsersService;
    Object.assign(service, { userModel, qrKitModel });

    const result = await service.discoverMerchants({
      search: "Mina.",
      page: 1,
      limit: 20,
    });

    expect(qrKitModel.distinct).toHaveBeenCalledWith("merchantId", {
      activationStatus: "activated",
      merchantId: { $ne: null },
    });
    const filter = capturedFilter as {
      role: string;
      shopIsLive: boolean;
      $or: Array<{ businessName: RegExp }>;
    };
    expect(filter).toMatchObject({ role: "merchant", shopIsLive: true });
    expect(filter.$or[0].businessName.test("Mina.")).toBe(true);
    expect(filter.$or[0].businessName.test("MinaX")).toBe(false);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: merchantId.toString(),
        businessName: "Mina's Market",
        serialNumber: "FS-ABC123",
      }),
    ]);
  });

  it("returns a customer-safe public business profile", async () => {
    const merchantId = new Types.ObjectId();
    const userModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: merchantId,
              businessName: "Mina's Market",
              businessIndustry: "Groceries",
              businessDescription: "Fresh groceries every day",
              mainAddress: { city: "Lagos", state: "Lagos" },
              socialLinks: { instagram: "minasmarket" },
              shopIsLive: false,
              planStatus: "verified",
              verificationLevel: "PRO",
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      }),
    };
    const qrKitModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ serialNumber: "FS-ABC123" }),
            }),
          }),
        }),
      }),
    };
    const storeModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };
    const saleModel = {
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(4),
      }),
      aggregate: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ averageSpend: 2500, orderCount: 2 }]),
      }),
    };
    const feedbackModel = {
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ count: 2, averageRating: 4.5 }]),
      }),
    };
    const service = Object.create(UsersService.prototype) as UsersService;
    Object.assign(service, {
      userModel,
      qrKitModel,
      storeModel,
      saleModel,
      feedbackModel,
    });

    const result = await service.getPublicMerchantProfile(String(merchantId));

    expect(userModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: merchantId,
        role: "merchant",
      }),
    );
    expect(userModel.findOne.mock.calls[0][0]).not.toHaveProperty("shopIsLive");
    expect(result).toEqual(
      expect.objectContaining({
        id: String(merchantId),
        businessName: "Mina's Market",
        serialNumber: "FS-ABC123",
        verificationLevel: "PRO",
      }),
    );
    expect(result.stats).toMatchObject({
      monthlyVisits: 4,
      favoriteCount: 3,
      averageSpend: 2500,
      averageRating: 4.5,
    });
    expect(result).not.toHaveProperty("bankAccounts");
  });
});
