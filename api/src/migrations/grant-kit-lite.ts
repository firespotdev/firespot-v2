/** Dry run by default. Pass --apply to grant LITE to existing kit owners. */
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import { User, UserSchema } from "../schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import { PaystackService } from "../users/services/paystack.service";
import { PaystackSubaccountsService } from "../users/services/paystack-subaccounts.service";
import { grantKitLite } from "../merchant-plans/kit-lite";

async function main() {
  const envPath = path.resolve(__dirname, "../../.env");
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const uri =
    process.env.MONGODB_URI ||
    env
      .match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/m)?.[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  const users = mongoose.model<User>("User", UserSchema);
  const apply = process.argv.includes("--apply");
  // Only --apply provisions collection subaccounts; dry runs perform no writes
  // or Paystack requests. Fail before granting anything if credentials are absent.
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY ||
    env
      .match(/^\s*PAYSTACK_SECRET_KEY\s*=\s*(.+)\s*$/m)?.[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  const subaccounts = apply
    ? new PaystackSubaccountsService(
        users,
        new PaystackService(
          new ConfigService({ PAYSTACK_SECRET_KEY: secretKey }),
        ),
      )
    : null;
  const owners = mongoose.connection
    .collection("qrkits")
    .aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { activationStatus: "activated", merchantId: { $ne: null } } },
      { $group: { _id: "$merchantId" } },
    ]);
  let eligible = 0;
  let collectionSetups = 0;
  for await (const owner of owners) {
    const user = await users.findOne({
      _id: owner._id,
      role: "merchant",
      planTier: { $in: [null, "", "LITE"] },
      pendingPlanChange: null,
    });
    if (!user) continue;
    const needsGrant = !user.planStatus || user.planStatus === "none";
    if (!needsGrant && user.planTier !== "LITE") continue;
    if (needsGrant) eligible += 1;
    collectionSetups += 1;
    if (apply) {
      await grantKitLite(users, owner._id);
      // Also retry provisioning for already-granted LITE owners on reruns.
      const result = await subaccounts.ensureForUserId(owner._id.toString());
      if (result.status === "failed")
        throw new Error(
          `Subaccount provisioning failed for ${owner._id.toString()}. Rerun --apply to retry.`,
        );
    }
  }
  console.log(
    `${apply ? "Applied" : "Dry run"}: ${eligible} eligible kit owner(s); ${collectionSetups} collection setup(s) ${apply ? "checked" : "to check"}.${apply ? "" : " Pass --apply to grant LITE."}`,
  );
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Backfill failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
