import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PostPlatform = "instagram" | "facebook" | "x" | "tiktok";
export type PostStatus = "DRAFT" | "PUBLISHED";

@Schema({ _id: false })
export class PostPreview {
  @Prop({ maxlength: 200 })
  title?: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ maxlength: 2048 })
  imageUrl?: string;

  @Prop({ maxlength: 120 })
  siteName?: string;

  @Prop({ enum: ["success", "failed", "partial"], default: "success" })
  extractionStatus?: "success" | "failed" | "partial";
}

export const PostPreviewSchema = SchemaFactory.createForClass(PostPreview);

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, maxlength: 2048 })
  sourceUrl: string;

  @Prop({
    required: true,
    enum: ["instagram", "facebook", "x", "tiktok"],
    index: true,
  })
  platform: PostPlatform;

  @Prop({ type: PostPreviewSchema, default: {} })
  preview: PostPreview;

  @Prop({ maxlength: 500, default: "" })
  caption: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }], default: [] })
  productIds: Types.ObjectId[];

  @Prop({ enum: ["DRAFT", "PUBLISHED"], default: "DRAFT", index: true })
  status: PostStatus;

  @Prop({ index: true })
  publishedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
export type PostDocument = Post & Document;

PostSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
PostSchema.index({ status: 1, publishedAt: -1 });
