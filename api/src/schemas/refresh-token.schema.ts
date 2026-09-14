import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * A single active refresh token (rotated on every use). We store only the
 * SHA-256 hash so a database leak cannot be used to mint sessions. The
 * `expiresAt` TTL index lets MongoDB purge expired tokens automatically.
 */
@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  userAgent?: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
export type RefreshTokenDocument = RefreshToken & Document;

// TTL index — MongoDB removes the document once expiresAt passes.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
