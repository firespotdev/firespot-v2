import {
  adminCanAcceptDispute,
  requiresRefundApproval,
} from "./payment-cases.rules";

describe("payment case rules", () => {
  describe("requiresRefundApproval", () => {
    const threshold = 500_000 * 100;

    it("does not require approval below the cumulative threshold", () => {
      expect(requiresRefundApproval(threshold - 1, threshold)).toBe(false);
    });

    it("requires approval at the threshold", () => {
      expect(requiresRefundApproval(threshold, threshold)).toBe(true);
    });

    it("uses cumulative exposure across partial refunds", () => {
      const alreadyRefunded = 350_000 * 100;
      const newlyReserved = 150_000 * 100;
      expect(
        requiresRefundApproval(alreadyRefunded + newlyReserved, threshold),
      ).toBe(true);
    });
  });

  describe("adminCanAcceptDispute", () => {
    const now = new Date("2026-08-11T12:00:00.000Z");

    it("keeps admins read-only before the emergency window", () => {
      expect(
        adminCanAcceptDispute(new Date("2026-08-11T12:00:01.000Z"), now),
      ).toBe(false);
    });

    it("allows acceptance once the merchant response window has elapsed", () => {
      expect(adminCanAcceptDispute(now, now)).toBe(true);
    });

    it("does not allow acceptance without a Paystack deadline", () => {
      expect(adminCanAcceptDispute(undefined, now)).toBe(false);
    });
  });
});
