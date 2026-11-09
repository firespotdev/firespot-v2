jest.mock("nanoid", () => ({ customAlphabet: () => () => "test-slug" }));

import { NotFoundException, ValidationPipe } from "@nestjs/common";
import { Types } from "mongoose";
import {
  CustomShopPolicyDto,
  UpdateShopPoliciesDto,
} from "./dto/shop-setup.dto";
import { UsersService } from "./users.service";

describe("Shop policies", () => {
  const userModel = { findById: jest.fn() };
  const service = new UsersService(
    userModel as unknown as ConstructorParameters<typeof UsersService>[0],
    {} as ConstructorParameters<typeof UsersService>[1],
    {} as ConstructorParameters<typeof UsersService>[2],
    {} as ConstructorParameters<typeof UsersService>[3],
    {} as ConstructorParameters<typeof UsersService>[4],
    {} as ConstructorParameters<typeof UsersService>[5],
    {} as ConstructorParameters<typeof UsersService>[6],
    {} as ConstructorParameters<typeof UsersService>[7],
    {} as ConstructorParameters<typeof UsersService>[8],
    {} as ConstructorParameters<typeof UsersService>[9],
  );
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const validate = <T>(metatype: new () => T, value: unknown): Promise<T> =>
    pipe.transform(value, { type: "body", metatype }) as Promise<T>;

  const existingPolicy = {
    _id: new Types.ObjectId(),
    title: "Deposits",
    details: "Bookings need a 20% deposit",
    appliesWithinDays: 14,
  };
  const merchant = (shopPolicies?: Record<string, unknown>) => ({
    role: "merchant",
    shopPolicies,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => jest.clearAllMocks());

  it("saves a time limit only for policies that are on, keeping custom policies", async () => {
    const user = merchant({
      returns: false,
      exchanges: false,
      cancellations: false,
      refunds: false,
      customPolicies: [existingPolicy],
    });
    userModel.findById.mockResolvedValue(user);
    const dto = await validate(UpdateShopPoliciesDto, {
      returns: true,
      exchanges: false,
      cancellations: true,
      refunds: false,
      appliesWithinDays: { returns: 30, exchanges: 7, cancellations: 3 },
    });

    await service.updateShopPolicies("merchant-id", dto);

    expect(user.shopPolicies).toEqual(
      expect.objectContaining({
        returns: true,
        exchanges: false,
        cancellations: true,
        refunds: false,
        appliesWithinDays: { returns: 30, cancellations: 3 },
        customPolicies: [existingPolicy],
        configuredAt: expect.any(Date),
      }),
    );
    expect(user.save).toHaveBeenCalled();
  });

  it("rejects time limits outside 1 to 365 days", async () => {
    await expect(
      validate(UpdateShopPoliciesDto, {
        returns: true,
        exchanges: false,
        cancellations: false,
        refunds: false,
        appliesWithinDays: { returns: 0 },
      }),
    ).rejects.toBeDefined();
    await expect(
      validate(CustomShopPolicyDto, {
        title: "Deposits",
        details: "Pay first",
        appliesWithinDays: 400,
      }),
    ).rejects.toBeDefined();
  });

  it("adds a custom policy without marking the step done", async () => {
    const user = merchant(undefined);
    userModel.findById.mockResolvedValue(user);
    const dto = await validate(CustomShopPolicyDto, {
      title: "  Deposits ",
      details: " Bookings need a 20% deposit ",
      appliesWithinDays: 14,
    });

    await service.addCustomShopPolicy("merchant-id", dto);

    expect(user.shopPolicies).toEqual({
      returns: false,
      exchanges: false,
      cancellations: false,
      refunds: false,
      customPolicies: [
        {
          _id: expect.any(Types.ObjectId),
          title: "Deposits",
          details: "Bookings need a 20% deposit",
          appliesWithinDays: 14,
        },
      ],
    });
  });

  it("edits and deletes a custom policy by id", async () => {
    const user = merchant({
      returns: true,
      exchanges: false,
      cancellations: false,
      refunds: false,
      customPolicies: [existingPolicy],
    });
    userModel.findById.mockResolvedValue(user);
    const id = String(existingPolicy._id);
    const dto = await validate(CustomShopPolicyDto, {
      title: "Deposits",
      details: "Bookings need a 50% deposit",
      appliesWithinDays: 7,
    });

    await service.updateCustomShopPolicy("merchant-id", id, dto);
    expect(
      (user.shopPolicies as { customPolicies: unknown[] }).customPolicies,
    ).toEqual([{ ...existingPolicy, details: dto.details, appliesWithinDays: 7 }]);

    await service.deleteCustomShopPolicy("merchant-id", id);
    expect(
      (user.shopPolicies as { customPolicies: unknown[] }).customPolicies,
    ).toEqual([]);
  });

  it("returns not found for a custom policy that doesn't exist", async () => {
    userModel.findById.mockResolvedValue(merchant({ customPolicies: [] }));

    await expect(
      service.deleteCustomShopPolicy(
        "merchant-id",
        String(new Types.ObjectId()),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
