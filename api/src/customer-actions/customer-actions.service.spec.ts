import { Types } from "mongoose";
import { CustomerActionsService } from "./customer-actions.service";

const leanQuery = (value: unknown) => {
  const query = {
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
};

describe("CustomerActionsService cart drafts", () => {
  it("stores one current-price draft per customer and merchant for two days", async () => {
    const customerId = new Types.ObjectId();
    const merchantId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const draftId = new Types.ObjectId();
    const product = {
      _id: productId,
      merchantId,
      name: "Canvas shoe",
      price: 12000,
      options: [],
    };
    const updatedAt = new Date();
    let savedFilter: unknown;
    let savedUpdate: unknown;
    const cartDraftModel = {
      findOneAndUpdate: jest.fn((filter: unknown, update: unknown) => {
        savedFilter = filter;
        savedUpdate = update;
        return Promise.resolve(undefined);
      }),
      findOne: jest.fn().mockReturnValue(
        leanQuery({
          _id: draftId,
          merchantId,
          serialNumber: "FS-ABC123",
          items: [{ productId, quantity: 2 }],
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          updatedAt,
        }),
      ),
    };
    const productModel = {
      find: jest.fn().mockReturnValue(leanQuery([product])),
    };
    const qrKitModel = {
      findOne: jest
        .fn()
        .mockReturnValue(leanQuery({ _id: new Types.ObjectId() })),
      find: jest
        .fn()
        .mockReturnValue(
          leanQuery([{ merchantId, serialNumber: "FS-ABC123" }]),
        ),
    };
    const userModel = {
      find: jest
        .fn()
        .mockReturnValue(
          leanQuery([{ _id: merchantId, businessName: "Mina's Market" }]),
        ),
    };
    const service = new CustomerActionsService(
      cartDraftModel as never,
      {} as never,
      productModel as never,
      qrKitModel as never,
      {} as never,
      userModel as never,
    );

    const result = await service.saveCartDraft(
      customerId.toString(),
      merchantId.toString(),
      {
        serialNumber: "fs-abc123",
        items: [{ productId: productId.toString(), quantity: 2 }],
      },
    );

    expect(savedFilter).toEqual({ customerUserId: customerId, merchantId });
    const update = savedUpdate as {
      $set: { expiresAt: Date; serialNumber: string };
    };
    expect(update.$set.serialNumber).toBe("FS-ABC123");
    expect(update.$set.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      2 * 24 * 60 * 60 * 1000 - 5_000,
    );
    expect(result).toMatchObject({
      id: draftId.toString(),
      itemCount: 2,
      total: 24000,
    });
  });

  it("builds actions from pending and confirmed sales without outstanding debt", async () => {
    const customerId = new Types.ObjectId();
    const saleFilters: Array<Record<string, unknown>> = [];
    const cartDraftModel = {
      find: jest.fn().mockReturnValue(leanQuery([])),
    };
    const feedbackModel = {
      distinct: jest.fn().mockResolvedValue([]),
    };
    const qrKitModel = {
      find: jest.fn().mockReturnValue(leanQuery([])),
    };
    const saleModel = {
      find: jest.fn((filter: Record<string, unknown>) => {
        saleFilters.push(filter);
        return leanQuery([]);
      }),
    };
    const userModel = {
      find: jest.fn().mockReturnValue(leanQuery([])),
    };
    const service = new CustomerActionsService(
      cartDraftModel as never,
      feedbackModel as never,
      {} as never,
      qrKitModel as never,
      saleModel as never,
      userModel as never,
    );

    await expect(service.list(customerId.toString())).resolves.toEqual({
      data: [],
    });
    expect(saleFilters.map((filter) => filter.status)).toEqual([
      "PENDING",
      "CONFIRMED",
    ]);
    const pendingCreatedAt = saleFilters[0].createdAt as { $gte: unknown };
    expect(pendingCreatedAt.$gte).toBeInstanceOf(Date);
    expect(saleFilters).not.toContainEqual(
      expect.objectContaining({ status: "OUTSTANDING" }),
    );
  });
});
