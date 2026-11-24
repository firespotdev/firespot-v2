import {
  assertKeepsPaymentMethod,
  canTakeBankTransfer,
  canTakePaystackPayments,
  hasWorkingPaymentMethod,
  payerBankAccounts,
} from "./payment-availability";

const env = { NODE_ENV: "test" };
const account = (overrides: Record<string, unknown> = {}) => ({
  bankName: "OPay",
  accountNumber: "0123456789",
  isEnabled: true,
  ...overrides,
});
const paystackMerchant = {
  paystackSubaccountCode: "ACCT_x",
  paystackCollectionEnabled: true,
  planTier: "LITE",
  planStatus: "verified",
  kycCompletedAt: new Date(),
};

describe("payment availability", () => {
  it("counts bank transfer only when it is on and an account is enabled", () => {
    expect(canTakeBankTransfer({ bankAccounts: [account()] })).toBe(true);
    expect(
      canTakeBankTransfer({
        bankTransferEnabled: false,
        bankAccounts: [account()],
      }),
    ).toBe(false);
    expect(
      canTakeBankTransfer({ bankAccounts: [account({ isEnabled: false })] }),
    ).toBe(false);
    expect(canTakeBankTransfer({ bankAccounts: [] })).toBe(false);
  });

  it("counts Paystack only with a subaccount, a plan and an open channel", () => {
    expect(canTakePaystackPayments(paystackMerchant, env)).toBe(true);
    expect(
      canTakePaystackPayments(
        { ...paystackMerchant, paystackSubaccountCode: undefined },
        env,
      ),
    ).toBe(false);
    expect(
      canTakePaystackPayments(
        { ...paystackMerchant, paystackCollectionEnabled: false },
        env,
      ),
    ).toBe(false);
    expect(
      canTakePaystackPayments(
        { ...paystackMerchant, planTier: undefined, planStatus: "none" },
        env,
      ),
    ).toBe(false);
  });

  it("treats a shop with transfer off and no Paystack as unpayable", () => {
    expect(
      hasWorkingPaymentMethod(
        {
          bankTransferEnabled: false,
          bankAccounts: [account()],
          planStatus: "none",
        },
        env,
      ),
    ).toBe(false);
  });

  describe("payerBankAccounts", () => {
    it("shows enabled accounts while bank transfer is on", () => {
      const shown = payerBankAccounts(
        {
          bankAccounts: [
            account(),
            account({ accountNumber: "2", isEnabled: false }),
          ],
        },
        env,
      );
      expect(shown.map((a) => a.accountNumber)).toEqual(["0123456789"]);
    });

    it("hides accounts when transfer is off and Paystack works", () => {
      expect(
        payerBankAccounts(
          {
            ...paystackMerchant,
            bankTransferEnabled: false,
            bankAccounts: [account()],
          },
          env,
        ),
      ).toEqual([]);
    });

    it("falls back to the bank accounts when transfer is off and Paystack is unavailable", () => {
      const shown = payerBankAccounts(
        {
          bankTransferEnabled: false,
          bankAccounts: [account()],
          planStatus: "none",
        },
        env,
      );
      expect(shown).toHaveLength(1);
    });

    it("falls back to disabled accounts when nothing else can take payment", () => {
      const shown = payerBankAccounts(
        { bankAccounts: [account({ isEnabled: false })], planStatus: "none" },
        env,
      );
      expect(shown).toHaveLength(1);
    });
  });

  describe("assertKeepsPaymentMethod", () => {
    const working = { bankAccounts: [account()] };

    it("refuses a change that leaves a working shop with no way to get paid", () => {
      expect(() =>
        assertKeepsPaymentMethod(
          working,
          { ...working, bankTransferEnabled: false },
          env,
        ),
      ).toThrow("You need at least one way to get paid");
    });

    it("allows switching transfer off while Paystack works", () => {
      const before = { ...paystackMerchant, bankAccounts: [account()] };
      expect(() =>
        assertKeepsPaymentMethod(
          before,
          { ...before, bankTransferEnabled: false },
          env,
        ),
      ).not.toThrow();
    });

    it("does not block unrelated changes on a shop that already has none", () => {
      const broken = { bankTransferEnabled: false, bankAccounts: [account()] };
      expect(() => assertKeepsPaymentMethod(broken, broken, env)).not.toThrow();
    });
  });
});
