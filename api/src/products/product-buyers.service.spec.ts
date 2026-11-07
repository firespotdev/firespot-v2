import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import { ProductBuyersService, publicName } from "./product-buyers.service";

const chain = <T>(result: T) => {
  const query = {
    select: jest.fn(() => query),
    lean: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(result),
  };
  return query;
};

describe("publicName", () => {
  it.each([
    ["Deji Salako", "Deji S."],
    ["  michael   faraday ", "Michael F."],
    ["Ada", "Ada"],
    ["Ngozi Ada Obi", "Ngozi O."],
    ["+2348012345678", null],
    ["+234 801 234 5678", null],
    ["Mama Tolu (owes 5k)", null],
    ["   ", null],
    ["", null],
    [undefined, null],
  ])("turns %p into %p", (input, expected) => {
    expect(publicName(input)).toBe(expected);
  });
});

describe("ProductBuyersService", () => {
  const merchantId = new Types.ObjectId();
  const productId = new Types.ObjectId();
  const dejiId = new Types.ObjectId();
  const placeholderId = new Types.ObjectId();
  const michaelId = new Types.ObjectId();

  const users = [
    {
      _id: dejiId,
      fullName: "Deji Salako",
      profilePhotoUrl: "https://img/deji.jpg",
    },
    // A placeholder account: no name, so it must never be shown.
    { _id: placeholderId, fullName: "" },
    { _id: michaelId, fullName: "Michael Faraday" },
  ];

  function setup({
    buyerCount = 0,
    recentUserIds = [] as Types.ObjectId[],
    feedback = [] as Array<Record<string, unknown>>,
  } = {}) {
    const saleModel = {
      collection: { name: "sales" },
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            total: buyerCount ? [{ count: buyerCount }] : [],
            recent: recentUserIds.map((userId) => ({ userId })),
          },
        ]),
      }),
    };
    const userModel = {
      find: jest.fn((filter: { _id: { $in: Types.ObjectId[] } }) =>
        chain(
          users.filter((user) =>
            filter._id.$in.some((id) => String(id) === String(user._id)),
          ),
        ),
      ),
    };
    const feedbackModel = {
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(feedback),
      }),
    };
    const service = new ProductBuyersService(
      saleModel as never,
      userModel as never,
      feedbackModel as never,
    );
    return { service, saleModel, feedbackModel };
  }

  it("rejects ids that are not ObjectIds", async () => {
    const { service } = setup();
    await expect(
      service.getBuyers("not-an-id", String(productId)),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getBuyers(String(merchantId), "nope"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("only counts this merchant's confirmed sales of the product", async () => {
    const { service, saleModel } = setup();
    await service.getBuyers(String(merchantId), String(productId));

    const [match] = saleModel.aggregate.mock.calls[0][0];
    expect(match).toEqual({
      $match: {
        merchantId,
        status: "CONFIRMED",
        "items.productId": String(productId),
      },
    });
  });

  it("names the two latest buyers from their accounts, skipping unnamed ones", async () => {
    const { service } = setup({
      buyerCount: 5,
      recentUserIds: [dejiId, placeholderId, michaelId],
    });

    const result = await service.getBuyers(
      String(merchantId),
      String(productId),
    );

    expect(result.buyerCount).toBe(5);
    expect(result.recentBuyers).toEqual([
      { name: "Deji S.", photoUrl: "https://img/deji.jpg" },
      { name: "Michael F.", photoUrl: null },
    ]);
  });

  it("joins reviews to this product's confirmed sales, capped", async () => {
    const { service, feedbackModel } = setup({ buyerCount: 1 });
    await service.getBuyers(String(merchantId), String(productId));

    const pipeline = feedbackModel.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: { merchantId } });
    const lookup = pipeline.find(
      (stage: Record<string, unknown>) => "$lookup" in stage,
    ).$lookup;
    expect(lookup).toMatchObject({
      from: "sales",
      localField: "saleId",
      foreignField: "_id",
      pipeline: [
        {
          $match: { status: "CONFIRMED", "items.productId": String(productId) },
        },
        { $project: { _id: 1 } },
      ],
    });
    expect(pipeline).toContainEqual({ $limit: 20 });
  });

  it("names reviewers from their accounts and never from the stored label", async () => {
    const createdAt = new Date("2026-10-28T10:00:00Z");
    const firstId = new Types.ObjectId();
    const secondId = new Types.ObjectId();
    const { service } = setup({
      buyerCount: 2,
      feedback: [
        {
          _id: firstId,
          customerUserId: dejiId,
          customerName: "+2348012345678",
          rating: 5,
          comment: "Lovely",
          createdAt,
        },
        {
          _id: secondId,
          customerName: "New customer",
          customerPhotoUrl: "https://img/guest.jpg",
          rating: 4,
          comment: "Good",
          createdAt,
        },
      ],
    });

    const result = await service.getBuyers(
      String(merchantId),
      String(productId),
    );

    expect(result.reviews).toEqual([
      {
        id: String(firstId),
        name: "Deji S.",
        photoUrl: "https://img/deji.jpg",
        rating: 5,
        comment: "Lovely",
        createdAt,
      },
      {
        id: String(secondId),
        name: "Customer",
        photoUrl: null,
        rating: 4,
        comment: "Good",
        createdAt,
      },
    ]);
  });

  it("returns an empty result without querying reviews when nobody bought it", async () => {
    const { service, feedbackModel } = setup();

    const result = await service.getBuyers(
      String(merchantId),
      String(productId),
    );

    expect(result).toEqual({ buyerCount: 0, recentBuyers: [], reviews: [] });
    expect(feedbackModel.aggregate).not.toHaveBeenCalled();
  });
});
