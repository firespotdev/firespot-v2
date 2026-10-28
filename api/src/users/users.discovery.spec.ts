jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
  customAlphabet: () => () => "test-slug",
}));

import { Types } from "mongoose";
import { UsersService } from "./users.service";

describe("UsersService public merchant discovery", () => {
  describe("phone-number search", () => {
    const merchantId = new Types.ObjectId();
    const records = [
      {
        _id: merchantId,
        role: "merchant",
        businessName: "Mina's Market",
        phoneNumber: "8031234567",
        phoneCountryCode: "+234",
        shopIsLive: false,
        fullName: "Mina Personal Name",
        otpCode: "private-code",
        bankAccounts: [{ accountNumber: "0123456789" }],
      },
      {
        _id: new Types.ObjectId(),
        role: "customer",
        phoneNumber: "8037654321",
        phoneCountryCode: "+234",
      },
    ];

    function setup() {
      const matches = (filter: Record<string, unknown>) =>
        records.filter(
          (record) =>
            record.phoneNumber === filter.phoneNumber &&
            record.phoneCountryCode === filter.phoneCountryCode &&
            (!filter.role || record.role === filter.role),
        );
      const userModel = {
        find: jest.fn((filter: Record<string, unknown>) => ({
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(matches(filter)),
                  }),
                }),
              }),
            }),
          }),
        })),
        countDocuments: jest.fn((filter: Record<string, unknown>) => ({
          exec: jest.fn().mockResolvedValue(matches(filter).length),
        })),
      };
      const qrKitModel = {
        distinct: jest.fn().mockResolvedValue([]),
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
      const service = Object.create(UsersService.prototype) as UsersService;
      Object.assign(service, { userModel, qrKitModel });
      return { service, userModel, qrKitModel };
    }

    it.each([
      "08031234567",
      "8031234567",
      "+2348031234567",
      "2348031234567",
      "0803 123 4567",
      "+234 (803) 123-4567",
      "(0803) 123-4567",
    ])(
      "finds a seller without a live shop or QR kit using %s",
      async (search) => {
        const { service, userModel, qrKitModel } = setup();
        const result = await service.discoverMerchants({
          search,
          page: 1,
          limit: 20,
        });

        expect(result.data).toEqual([
          expect.objectContaining({
            id: String(merchantId),
            businessName: "Mina's Market",
            serialNumber: "",
          }),
        ]);
        expect(result.meta.total).toBe(1);
        expect(userModel.find.mock.calls[0][0]).not.toHaveProperty(
          "shopIsLive",
        );
        expect(userModel.find.mock.calls[0][0]).not.toHaveProperty("_id");
        expect(qrKitModel.distinct).not.toHaveBeenCalled();
        for (const field of [
          "phoneNumber",
          "fullName",
          "otpCode",
          "bankAccounts",
        ]) {
          expect(result.data[0]).not.toHaveProperty(field);
        }
      },
    );

    it.each(["08037654321", "08039999999", "0803123456"])(
      "does not return a personal account, unknown number or partial phone: %s",
      async (search) => {
        const { service } = setup();
        const result = await service.discoverMerchants({
          search,
          page: 1,
          limit: 20,
        });
        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
      },
    );
  });

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

  it.each([true, false])(
    "returns a customer-safe business profile (active QR: %s)",
    async (hasActiveQr) => {
      const merchantId = new Types.ObjectId();
      const userModel = {
        findOne: jest.fn<unknown, [unknown]>().mockReturnValue({
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
                exec: jest
                  .fn()
                  .mockResolvedValue(
                    hasActiveQr ? { serialNumber: "FS-ABC123" } : null,
                  ),
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
      expect(userModel.findOne.mock.calls[0][0]).not.toHaveProperty(
        "shopIsLive",
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: String(merchantId),
          businessName: "Mina's Market",
          serialNumber: hasActiveQr ? "FS-ABC123" : undefined,
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
    },
  );
});
