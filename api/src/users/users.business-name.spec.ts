jest.mock("nanoid", () => ({ customAlphabet: () => () => "test-slug" }));

import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from "@nestjs/common";
import { UpdateBusinessNameDto } from "./dto/shop-setup.dto";
import { UsersService } from "./users.service";

describe("Business name settings", () => {
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
  const validate = (value: unknown): Promise<UpdateBusinessNameDto> =>
    pipe.transform(value, {
      type: "body",
      metatype: UpdateBusinessNameDto,
    }) as Promise<UpdateBusinessNameDto>;

  beforeEach(() => jest.clearAllMocks());

  it("saves the business name without replacing personal, banking or shop identity", async () => {
    const original = {
      role: "merchant",
      businessName: "ADA OKAFOR",
      fullName: "Ada Okafor",
      merchantSlug: "ada-shop",
      businessDescription: "Fresh pastries",
      businessIndustry: "Food & Drinks",
      bankAccounts: [
        { accountName: "ADA OKAFOR", accountNumber: "0123456789" },
      ],
      onboardingCompleted: true,
    };
    const user = { ...original, save: jest.fn().mockResolvedValue(undefined) };
    userModel.findById.mockResolvedValue(user);
    const dto = await validate({
      businessName: "  Ada's Pastries  ",
      fullName: "Unwanted name",
      merchantSlug: "unwanted-slug",
    });

    await expect(
      service.updateBusinessName("merchant-id", dto),
    ).resolves.toEqual({
      businessName: "Ada's Pastries",
    });
    expect(userModel.findById).toHaveBeenCalledWith("merchant-id");
    expect(user).toMatchObject({ ...original, businessName: "Ada's Pastries" });
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(dto).toEqual({ businessName: "Ada's Pastries" });
  });

  it.each([
    {},
    { businessName: "" },
    { businessName: "   " },
    { businessName: 123 },
    { businessName: "x".repeat(101) },
  ])("rejects an invalid business name: %j", async (payload) => {
    await expect(validate(payload)).rejects.toThrow();
  });

  it("accepts a name at the length limit", async () => {
    await expect(validate({ businessName: "x".repeat(100) })).resolves.toEqual({
      businessName: "x".repeat(100),
    });
  });

  it("rejects personal accounts without saving", async () => {
    const user = { role: "customer", save: jest.fn() };
    userModel.findById.mockResolvedValue(user);
    await expect(
      service.updateBusinessName("customer-id", { businessName: "Shop" }),
    ).rejects.toThrow(ForbiddenException);
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects missing accounts", async () => {
    userModel.findById.mockResolvedValue(null);
    await expect(
      service.updateBusinessName("missing-id", { businessName: "Shop" }),
    ).rejects.toThrow(
      new HttpException("User not found", HttpStatus.NOT_FOUND),
    );
  });

  it("propagates a save failure instead of reporting success", async () => {
    userModel.findById.mockResolvedValue({
      role: "merchant",
      save: jest.fn().mockRejectedValue(new Error("Save failed")),
    });
    await expect(
      service.updateBusinessName("merchant-id", { businessName: "Shop" }),
    ).rejects.toThrow("Save failed");
  });
});
