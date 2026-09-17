import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@Schema({ _id: false })
export class CustomerCartDraftItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 99 })
  quantity: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  selectedVariant?: Record<string, unknown>;
}

const CustomerCartDraftItemSchema = SchemaFactory.createForClass(
  CustomerCartDraftItem,
);

@Schema({ timestamps: true })
export class CustomerCartDraft extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  customerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  serialNumber: string;

  @Prop({ type: [CustomerCartDraftItemSchema], required: true })
  items: CustomerCartDraftItem[];

  @Prop({ required: true, index: true })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerCartDraftSchema =
  SchemaFactory.createForClass(CustomerCartDraft);
export type CustomerCartDraftDocument = CustomerCartDraft & Document;

CustomerCartDraftSchema.index(
  { customerUserId: 1, merchantId: 1 },
  { unique: true },
);
CustomerCartDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
