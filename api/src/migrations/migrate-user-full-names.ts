/** Run before deploying the fullName API. Dry run by default; pass --apply to write. */
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";

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
  await mongoose.connect(uri);
  const users = mongoose.connection.collection("users");
  const filter = {
    $or: [{ firstName: { $exists: true } }, { lastName: { $exists: true } }],
  };
  const count = await users.countDocuments(filter);
  if (!process.argv.includes("--apply")) {
    console.log(
      `Dry run: ${count} user(s) have legacy name fields. Pass --apply to migrate.`,
    );
    return;
  }
  // Preserve an existing fullName. Business names, bank names, roles and
  // onboarding flags stay untouched, including merchant-first accounts.
  const result = await users.updateMany(filter, [
    {
      $set: {
        fullName: {
          $cond: [
            { $ne: [{ $trim: { input: { $ifNull: ["$fullName", ""] } } }, ""] },
            "$fullName",
            {
              $let: {
                vars: {
                  name: {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ["$firstName", ""] },
                          " ",
                          { $ifNull: ["$lastName", ""] },
                        ],
                      },
                    },
                  },
                },
                in: { $cond: [{ $ne: ["$$name", ""] }, "$$name", "$$REMOVE"] },
              },
            },
          ],
        },
      },
    },
    { $unset: ["firstName", "lastName"] },
  ]);
  console.log(`Migrated ${result.modifiedCount} user(s).`);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
