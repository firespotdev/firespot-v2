jest.mock("nanoid", () => ({ customAlphabet: () => () => "test-slug" }));

import { Types } from "mongoose";
import { UsersService } from "./users.service";

describe("Shop setup checklist", () => {
  const userModel = { findById: jest.fn() };
  const productModel = { countDocuments: jest.fn().mockResolvedValue(0) };
  const qrKitModel = { countDocuments: jest.fn().mockResolvedValue(0) };
  const supplierModel = { countDocuments: jest.fn() };
  const service = new UsersService(
    userModel as unknown as ConstructorParameters<typeof UsersService>[0],
    qrKitModel as unknown as ConstructorParameters<typeof UsersService>[1],
    productModel as unknown as ConstructorParameters<typeof UsersService>[2],
    {} as ConstructorParameters<typeof UsersService>[3],
    {} as ConstructorParameters<typeof UsersService>[4],
    {} as ConstructorParameters<typeof UsersService>[5],
    {} as ConstructorParameters<typeof UsersService>[6],
    {} as ConstructorParameters<typeof UsersService>[7],
    {} as ConstructorParameters<typeof UsersService>[8],
    {} as ConstructorParameters<typeof UsersService>[9],
    supplierModel as unknown as ConstructorParameters<typeof UsersService>[10],
  );

  const suppliersItem = async (supplierCount: number) => {
    userModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      role: "merchant",
    });
    supplierModel.countDocuments.mockResolvedValue(supplierCount);
    const setup = await service.getShopSetup("merchant-id");
    return {
      item: setup.items.find((entry) => entry.key === "suppliers"),
      total: setup.total,
    };
  };

  it("counts supplier contacts as a setup step", async () => {
    const before = await suppliersItem(0);
    expect(before.item).toEqual({
      key: "suppliers",
      done: false,
      locked: false,
    });

    const after = await suppliersItem(1);
    expect(after.item).toMatchObject({ done: true, locked: false });
    expect(after.total).toBe(before.total);
  });

  it("checks suppliers only for the signed-in merchant", async () => {
    await suppliersItem(0);
    expect(supplierModel.countDocuments).toHaveBeenCalledWith({
      merchantId: expect.any(Types.ObjectId),
    });
  });
});
