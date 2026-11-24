import { Types } from "mongoose";

/** Most invite texts (new customers and suppliers) one merchant can send a day. */
export const DAILY_INVITE_SMS_LIMIT = 100;

interface UserCounter {
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => PromiseLike<{ modifiedCount: number }>;
}

/** Calendar day in Lagos as YYYY-MM-DD; Nigeria has no daylight saving. */
export function lagosDayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Takes one of the merchant's invite texts for today. Each step is a single
 * atomic update, so concurrent requests can't push the count past the cap.
 * Returns false once today's texts are used up.
 */
export async function claimInviteSms(
  userModel: UserCounter,
  merchantId: string | Types.ObjectId,
  now = new Date(),
): Promise<boolean> {
  const day = lagosDayKey(now);
  const _id = new Types.ObjectId(merchantId.toString());
  const takeToday = () =>
    userModel.updateOne(
      {
        _id,
        inviteSmsDay: day,
        inviteSmsCount: { $lt: DAILY_INVITE_SMS_LIMIT },
      },
      { $inc: { inviteSmsCount: 1 } },
    );

  if ((await takeToday()).modifiedCount === 1) return true;

  const startedToday = await userModel.updateOne(
    { _id, inviteSmsDay: { $ne: day } },
    { $set: { inviteSmsDay: day, inviteSmsCount: 1 } },
  );
  if (startedToday.modifiedCount === 1) return true;

  // Another request may have started today's count first; try once more.
  return (await takeToday()).modifiedCount === 1;
}
