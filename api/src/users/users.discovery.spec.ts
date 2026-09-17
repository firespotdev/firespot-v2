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
});
