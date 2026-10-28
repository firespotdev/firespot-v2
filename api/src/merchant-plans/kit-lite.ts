import { Model, Types } from "mongoose";
import { User } from "../schemas/user.schema";
import { getNextStep } from "./constants/plans";

/** Kit purchases replace the standalone LITE fee; KYC still gates collection. */
export async function grantKitLite(
  users: Model<User>,
  merchantId: string | Types.ObjectId,
) {
  const eligible = {
    _id: merchantId,
    role: "merchant",
    planTier: { $in: [null, "", "LITE"] },
    planStatus: { $in: [null, "none"] },
    pendingPlanChange: null,
  };
  const user = await users.findOne(eligible);
  if (!user) return false;
  const result = await users.updateOne(eligible, {
    $set: {
      planTier: "LITE",
      planStatus: getNextStep("LITE", user.kyc) ? "paid" : "verified",
    },
  });
  return result.modifiedCount > 0;
}
