/**
 * Copies existing posts' preview images to Cloudinary. Posts saved before
 * PostsService stored images kept the provider's own link, and those expire
 * (TikTok's within days), so each post's original link is fetched again for a
 * fresh image. Dry run by default; pass --apply to write. Safe to re-run:
 * posts that already have a stored image are skipped.
 */
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import {
  fetchPostMetadata,
  parseSupportedPostUrl,
} from "../posts/post-metadata";

const POST_IMAGE_FOLDER = "firespot/posts";

function readEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env");
  const file = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const fromFile = Object.fromEntries(
    file
      .split("\n")
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );
  return { ...fromFile, ...(process.env as Record<string, string>) };
}

// Must match PostsService.hostPreviewImage so later edits overwrite the same image.
const publicIdFor = (merchantId: string, sourceUrl: string) =>
  createHash("sha256")
    .update(`${merchantId}:${sourceUrl}`)
    .digest("hex")
    .slice(0, 32);

async function main() {
  const env = readEnv();
  for (const key of [
    "MONGODB_URI",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    if (!env[key]) throw new Error(`${key} is required`);
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not ready");
  const posts = db.collection("posts");
  const pending = await posts
    .find({ "preview.imagePublicId": { $exists: false } })
    .project({ merchantId: 1, sourceUrl: 1 })
    .toArray();

  const apply = process.argv.includes("--apply");
  console.log(
    `${pending.length} post(s) without a stored image.${apply ? "" : " Dry run; pass --apply to copy them."}`,
  );
  if (!apply) return;

  let stored = 0;
  for (const post of pending) {
    const label = `${post._id} (${post.sourceUrl})`;
    try {
      const source = parseSupportedPostUrl(post.sourceUrl);
      const metadata = await fetchPostMetadata(source);
      if (!metadata.imageUrl) {
        console.log(`- ${label}: the link has no image now, skipped`);
        continue;
      }
      const result = await cloudinary.uploader.upload(metadata.imageUrl, {
        folder: POST_IMAGE_FOLDER,
        public_id: publicIdFor(String(post.merchantId), post.sourceUrl),
        overwrite: true,
        resource_type: "image",
        transformation: [{ width: 800, crop: "limit" }, { quality: "auto" }],
      });
      await posts.updateOne(
        { _id: post._id },
        {
          $set: {
            "preview.imageUrl": result.secure_url,
            "preview.imagePublicId": result.public_id,
          },
        },
      );
      stored += 1;
      console.log(`- ${label}: stored`);
    } catch (error) {
      console.log(`- ${label}: failed (${(error as Error).message})`);
    }
  }
  console.log(`Stored ${stored} of ${pending.length} image(s).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
