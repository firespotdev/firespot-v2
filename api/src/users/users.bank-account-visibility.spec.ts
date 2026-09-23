jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
  customAlphabet: () => () => "test-slug",
}));

import { HttpException, HttpStatus } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService - bank account visibility", () => {
  const userModel = {
    findById: jest.fn(),
  };

  const service = new UsersService(
    userModel as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it("persists whether customers can see a bank account", async () => {
    const account = {
      accountNumber: "0123456789",
      isEnabled: true,
    };
    const user = {
      bankAccounts: [account],
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockResolvedValue(user);

    const result = await service.setBankAccountEnabled(
      "merchant-id",
      account.accountNumber,
      false,
    );

    expect(account.isEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
    expect(result.bankAccount).toBe(account);
  });

  it("rejects an account that does not belong to the merchant", async () => {
    userModel.findById.mockResolvedValue({ bankAccounts: [] });

    await expect(
      service.setBankAccountEnabled("merchant-id", "0123456789", false),
    ).rejects.toThrow(
      new HttpException("Bank account not found", HttpStatus.NOT_FOUND),
    );
  });
});
