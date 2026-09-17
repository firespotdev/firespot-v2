import { Types } from "mongoose";
import { ProductsService } from "./products.service";

describe("ProductsService public product discovery", () => {
  it("limits products to live merchants with active payment QR kits", async () => {
    const merchantId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    let capturedFilter: unknown;
    const productFind = jest.fn((filter: unknown) => {
      capturedFilter = filter;
      return {
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([
                      {
                        _id: productId,
                        name: "Canvas shoe",
                        price: 12000,
                        merchantId: {
                          _id: merchantId,
                          businessName: "Mina's Market",
                        },
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    const productModel = {
      find: productFind,
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      }),
    };
    const userModel = {
      find: jest.fn().mockReturnValue({
        distinct: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([merchantId]),
        }),
      }),
    };
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
    const service = Object.create(ProductsService.prototype) as ProductsService;
    Object.assign(service, { productModel, userModel, qrKitModel });

    const result = await service.discoverProducts({
      search: "shoe.",
      page: 1,
      limit: 20,
    });

    expect(userModel.find).toHaveBeenCalledWith({
      role: "merchant",
      shopIsLive: true,
    });
    expect(qrKitModel.distinct).toHaveBeenCalledWith("merchantId", {
      merchantId: { $in: [merchantId] },
      activationStatus: "activated",
    });
    const filter = capturedFilter as {
      isArchived: boolean;
      $or: Array<{ name: RegExp }>;
    };
    expect(filter).toMatchObject({ isArchived: false });
    expect(filter.$or[0].name.test("shoe.")).toBe(true);
    expect(filter.$or[0].name.test("shoeX")).toBe(false);
    expect(result.data[0]?.id).toBe(productId.toString());
    expect(result.data[0]?.merchant.id).toBe(merchantId.toString());
    expect(result.data[0]?.merchant.serialNumber).toBe("FS-ABC123");
  });
});
