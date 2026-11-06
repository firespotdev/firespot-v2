/**
 * Run immediately before deploying the Spots API. Renames the `stores`
 * collection to `spots`, `users.subscriptions[].storeId` to `spotId`, and
 * `planorders.storeCount` to `spotCount`. Dry run by default; pass --apply to
 * write. Safe to re-run: each step only touches data still in the old shape.
 */
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";

function mongoUri(): string {
  const envPath = path.resolve(__dirname, "../../.env");
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const uri =
    process.env.MONGODB_URI ||
    env
      .match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/m)?.[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  if (!uri) throw new Error("MONGODB_URI is required");
  return uri;
}

async function collectionCounts(db: mongoose.mongo.Db) {
  const names = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );
  const count = async (name: string) =>
    names.has(name) ? db.collection(name).countDocuments() : null;
  return { stores: await count("stores"), spots: await count("spots") };
}

// Moves storeId to spotId inside each subscription entry, leaving entries
// without a storeId exactly as they are.
const renameSubscriptionStoreId = [
  {
    $set: {
      subscriptions: {
        $map: {
          input: "$subscriptions",
          as: "entry",
          in: {
            $cond: [
              { $eq: [{ $type: "$$entry.storeId" }, "missing"] },
              "$$entry",
              {
                $mergeObjects: [
                  {
                    $arrayToObject: {
                      $filter: {
                        input: { $objectToArray: "$$entry" },
                        cond: { $ne: ["$$this.k", "storeId"] },
                      },
                    },
                  },
                  { spotId: "$$entry.storeId" },
                ],
              },
            ],
          },
        },
      },
    },
  },
];

async function main() {
  await mongoose.connect(mongoUri());
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not ready");

  const { stores, spots } = await collectionCounts(db);
  const usersFilter = { "subscriptions.storeId": { $exists: true } };
  const ordersFilter = { storeCount: { $exists: true } };
  const users = await db.collection("users").countDocuments(usersFilter);
  const orders = await db.collection("planorders").countDocuments(ordersFilter);

  // A booted Spots API may have created an empty `spots` collection with its
  // indexes. Replacing an empty one is safe; replacing real data is not.
  if (stores !== null && spots) {
    throw new Error(
      `Both "stores" (${stores}) and "spots" (${spots}) hold documents. Merge them manually.`,
    );
  }

  if (!process.argv.includes("--apply")) {
    console.log(
      [
        "Dry run. Pass --apply to migrate.",
        stores === null
          ? '- "stores" collection: absent (already migrated)'
          : `- "stores" collection: ${stores} document(s) to rename to "spots"`,
        `- users with subscriptions[].storeId: ${users}`,
        `- planorders with storeCount: ${orders}`,
      ].join("\n"),
    );
    return;
  }

  if (stores !== null) {
    await db.renameCollection("stores", "spots", { dropTarget: spots === 0 });
    console.log(`Renamed "stores" to "spots" (${stores} document(s)).`);
  }
  const usersResult = await db
    .collection("users")
    .updateMany(usersFilter, renameSubscriptionStoreId);
  console.log(`Renamed storeId in ${usersResult.modifiedCount} user(s).`);
  const ordersResult = await db
    .collection("planorders")
    .updateMany(ordersFilter, { $rename: { storeCount: "spotCount" } });
  console.log(`Renamed storeCount in ${ordersResult.modifiedCount} plan order(s).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
