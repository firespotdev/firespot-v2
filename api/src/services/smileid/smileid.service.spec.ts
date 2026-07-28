import { SmileIdService } from "./smileid.service";

describe("SmileIdService result classification", () => {
  const service = new SmileIdService({
    get: jest.fn().mockReturnValue(""),
  } as any);

  it.each(["0812", "0814", "0815", "1213"])(
    "treats provisional result code %s as pending",
    (ResultCode) => {
      expect(service.isPendingResult({ ResultCode })).toBe(true);
    },
  );

  it("treats an under-review action as pending", () => {
    expect(
      service.isPendingResult({
        Actions: {
          Liveness_Check: "Under Review",
          Selfie_Provided: "Passed",
        },
      }),
    ).toBe(true);
  });

  it("waits for the biometric action result after the ID lookup callback", () => {
    const payload = {
      ResultCode: "1012",
      ResultText: "ID Number Validated",
    };

    expect(service.isPendingResult(payload, "biometric_kyc")).toBe(true);
    expect(service.isSuccessfulResult(payload, "biometric_kyc")).toBe(false);
    expect(service.isPendingResult(payload, "enhanced_kyc")).toBe(false);
    expect(service.isSuccessfulResult(payload, "enhanced_kyc")).toBe(true);
  });

  it("does not classify terminal pass and fail results as pending", () => {
    expect(
      service.isPendingResult({
        ResultCode: "0810",
        ResultText: "Enroll User",
      }),
    ).toBe(false);
    expect(
      service.isPendingResult({
        ResultCode: "0811",
        ResultText: "Failed Enroll",
      }),
    ).toBe(false);
  });
});
