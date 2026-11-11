import {
  claimInviteSms,
  DAILY_INVITE_SMS_LIMIT,
  lagosDayKey,
} from "./invite-sms-quota";

describe("invite SMS daily cap", () => {
  const merchantId = "507f1f77bcf86cd799439012";
  const updated = (modifiedCount: number) => ({ modifiedCount });

  it("is 100 texts a day", () => {
    expect(DAILY_INVITE_SMS_LIMIT).toBe(100);
  });

  it("counts days in Lagos time", () => {
    // 23:30 UTC is already the next day in Lagos (UTC+1).
    expect(lagosDayKey(new Date("2026-11-11T23:30:00Z"))).toBe("2026-11-12");
    expect(lagosDayKey(new Date("2026-11-11T22:30:00Z"))).toBe("2026-11-11");
  });

  it("counts another text while today is under the cap", async () => {
    const userModel = { updateOne: jest.fn().mockResolvedValue(updated(1)) };

    await expect(claimInviteSms(userModel, merchantId)).resolves.toBe(true);
    expect(userModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteSmsDay: lagosDayKey(),
        inviteSmsCount: { $lt: DAILY_INVITE_SMS_LIMIT },
      }),
      { $inc: { inviteSmsCount: 1 } },
    );
  });

  it("starts a fresh count on a new day", async () => {
    const userModel = {
      updateOne: jest
        .fn()
        .mockResolvedValueOnce(updated(0))
        .mockResolvedValueOnce(updated(1)),
    };

    await expect(claimInviteSms(userModel, merchantId)).resolves.toBe(true);
    expect(userModel.updateOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ inviteSmsDay: { $ne: lagosDayKey() } }),
      { $set: { inviteSmsDay: lagosDayKey(), inviteSmsCount: 1 } },
    );
  });

  it("refuses once today's 100 texts are used", async () => {
    const userModel = { updateOne: jest.fn().mockResolvedValue(updated(0)) };

    await expect(claimInviteSms(userModel, merchantId)).resolves.toBe(false);
  });
});
