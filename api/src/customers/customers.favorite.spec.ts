import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { CustomersService } from "./customers.service";

describe("CustomersService.setFavorite", () => {
  const merchantId = new Types.ObjectId().toString();
  const customerId = new Types.ObjectId().toString();

  const build = (result: unknown) => {
    const exec = jest.fn().mockResolvedValue(result);
    const populate = jest.fn().mockReturnValue({ exec });
    const customerModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({ populate }),
    };
    const service = new CustomersService(
      customerModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, customerModel };
  };

  it("saves the merchant's own customer", async () => {
    const { service, customerModel } = build({
      _id: customerId,
      name: "Belfry Sol",
      isFavorite: true,
      userId: { _id: "u1", profilePhotoUrl: "https://example.com/b.jpg" },
    });

    await expect(
      service.setFavorite(merchantId, customerId, true),
    ).resolves.toMatchObject({
      _id: customerId,
      isFavorite: true,
      userId: "u1",
      profilePhotoUrl: "https://example.com/b.jpg",
    });

    const [filter, update] = customerModel.findOneAndUpdate.mock.calls[0];
    expect(filter._id.toString()).toBe(customerId);
    expect(filter.merchantId.toString()).toBe(merchantId);
    expect(update).toEqual({ $set: { isFavorite: true } });
  });

  it("unsaves a customer", async () => {
    const { service, customerModel } = build({
      _id: customerId,
      isFavorite: false,
    });

    await service.setFavorite(merchantId, customerId, false);

    expect(customerModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: { isFavorite: false },
    });
  });

  it("returns not found for another merchant's customer", async () => {
    const { service } = build(null);

    await expect(
      service.setFavorite(merchantId, customerId, true),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns not found for an invalid customer id", async () => {
    const { service, customerModel } = build(null);

    await expect(
      service.setFavorite(merchantId, "not-an-id", true),
    ).rejects.toThrow(NotFoundException);
    expect(customerModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
