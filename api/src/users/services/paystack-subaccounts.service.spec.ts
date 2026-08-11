import { Types } from "mongoose";
import {
  FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
  PaystackSubaccountsService,
} from "./paystack-subaccounts.service";

const query = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const makeUser = (overrides: Record<string, unknown> = {}): any => ({
  _id: new Types.ObjectId(),
  planTier: "LITE",
  planStatus: "verified",
  businessName: "Lite Shop",
  bankAccounts: [
    {
      bankCode: "058",
      accountNumber: "0123456789",
      isPrimary: true,
    },
  ],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("PaystackSubaccountsService", () => {
  const userModel = { findById: jest.fn() };
  const paystackService = {
    createSubaccount: jest.fn(),
    updateSubaccount: jest.fn(),
  };
  let service: PaystackSubaccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaystackSubaccountsService(
      userModel as any,
      paystackService as any,
    );
    jest.spyOn((service as any).logger, "error").mockImplementation(() => {});
    jest.spyOn((service as any).logger, "log").mockImplementation(() => {});
  });

  it("provisions a LITE merchant and persists split configuration", async () => {
    const user = makeUser();
    paystackService.createSubaccount.mockResolvedValue({
      subaccountCode: "ACCT_LITE",
    });

    const result = await service.ensureForUser(user as any);

    expect(paystackService.createSubaccount).toHaveBeenCalledWith(
      expect.objectContaining({
        percentageCharge: FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
        settlementBank: "058",
        accountNumber: "0123456789",
      }),
    );
    expect(user).toMatchObject({
      paystackSubaccountCode: "ACCT_LITE",
      subaccountBankCode: "058",
      subaccountAccountNumber: "0123456789",
      subaccountPercentageCharge: FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
    });
    expect(user.save).toHaveBeenCalled();
    expect(result).toEqual({
      status: "ready",
      subaccountCode: "ACCT_LITE",
    });
  });

  it("repairs bank and percentage drift on an existing subaccount", async () => {
    const user = makeUser({
      paystackSubaccountCode: "ACCT_EXISTING",
      subaccountBankCode: "044",
      subaccountAccountNumber: "9999999999",
      subaccountPercentageCharge: 1,
    });
    paystackService.updateSubaccount.mockResolvedValue({ status: true });

    await service.ensureForUser(user as any);

    expect(paystackService.updateSubaccount).toHaveBeenCalledWith(
      "ACCT_EXISTING",
      expect.objectContaining({
        settlementBank: "058",
        accountNumber: "0123456789",
        percentageCharge: FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
      }),
    );
    expect(user.save).toHaveBeenCalled();
  });

  it("does not provision a merchant who has never bought a plan", async () => {
    const user = makeUser({ planTier: undefined });

    await expect(service.ensureForUser(user as any)).resolves.toEqual({
      status: "no_plan",
    });
    expect(paystackService.createSubaccount).not.toHaveBeenCalled();
    expect(paystackService.updateSubaccount).not.toHaveBeenCalled();
  });

  it("can lazily backfill an existing merchant by id", async () => {
    const user = makeUser({ paystackSubaccountCode: "ACCT_READY" });
    user.subaccountBankCode = "058";
    user.subaccountAccountNumber = "0123456789";
    user.subaccountPercentageCharge = FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE;
    userModel.findById.mockReturnValue(query(user));

    await expect(service.ensureForUserId(String(user._id))).resolves.toEqual({
      status: "ready",
      subaccountCode: "ACCT_READY",
    });
  });
});
