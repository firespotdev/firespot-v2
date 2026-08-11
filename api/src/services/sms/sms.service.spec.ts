import { ConfigService } from "@nestjs/config";
import { SmsService } from "./sms.service";

describe("SmsService mock delivery", () => {
  it("logs generic SMS instead of calling Termii when MOCK_OTP is true", async () => {
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === "MOCK_OTP") return "true";
        return fallback;
      }),
    };
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const service = new SmsService(config as unknown as ConfigService);

    await expect(
      service.sendSms("+234 803 123 4567", "Test merchant alert"),
    ).resolves.toEqual({ status: "mock_success" });
    expect(log).toHaveBeenCalledWith("🔧 MOCK MODE: SMS request:", {
      to: "+234 803 123 4567",
      message: "Test merchant alert",
    });

    log.mockRestore();
  });
});
