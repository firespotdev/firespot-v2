import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PaymentPayerGuard } from "./payment-payer.guard";
import { SalesController } from "../../sales/sales.controller";

jest.mock("nanoid", () => ({ nanoid: () => "TEST1234" }));

describe("Payment identity gate", () => {
  const guard = new PaymentPayerGuard();
  it("rejects anonymous payers", () => {
    expect(() => guard.handleRequest(null, undefined, null, {} as any)).toThrow(
      "Unauthorized",
    );
  });
  it("requires a personal name even when merchant onboarding is complete", () => {
    expect(() =>
      guard.handleRequest(
        null,
        { userId: "merchant", onboardingCompleted: true },
        null,
        {} as any,
      ),
    ).toThrow("Enter your full name");
  });
  it("accepts a named user without changing their merchant identity", () => {
    const user = { userId: "merchant", fullName: "Ada Okafor" };
    expect(guard.handleRequest(null, user, null, {} as any)).toBe(user);
  });
  it.each([
    "createPendingSale",
    "createPaystackCollectSale",
    "initializeExistingPaystackSale",
    "payWithSavedCard",
    "recordCopy",
    "markSalePaidByCustomer",
  ] as const)("protects %s with the identity gate", (method) => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SalesController.prototype[method]),
    ).toContain(PaymentPayerGuard);
  });
});
