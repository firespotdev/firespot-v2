import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

@Schema({ _id: false })
export class MerchantSaleDraftItem {
  @Prop({ required: true })
  clientId: string;

  @Prop()
  productId?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  imageUrl?: string;

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  selectedVariant?: Record<string, unknown>;
}

const MerchantSaleDraftItemSchema = SchemaFactory.createForClass(
  MerchantSaleDraftItem,
);

@Schema({ timestamps: true })
export class MerchantSaleDraft {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ enum: ["amount", "items"], required: true })
  activeTab: "amount" | "items";

  @Prop({ default: "" })
  amountInput: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ type: [MerchantSaleDraftItemSchema], default: [] })
  items: MerchantSaleDraftItem[];

  @Prop()
  paymentMethod?: string;

  @Prop({ enum: ["full", "part"], default: "full" })
  installmentType: "full" | "part";

  @Prop({ default: 0, min: 0 })
  amountPaid: number;

  @Prop({ default: false })
  hasSetInstallment: boolean;

  @Prop({ type: Types.ObjectId, ref: "MerchantCustomer" })
  customerId?: Types.ObjectId;

  @Prop()
  dueDate?: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const MerchantSaleDraftSchema =
  SchemaFactory.createForClass(MerchantSaleDraft);
export type MerchantSaleDraftDocument = HydratedDocument<MerchantSaleDraft>;

MerchantSaleDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MerchantSaleDraftSchema.index({ merchantId: 1, updatedAt: -1 });
MerchantSaleDraftSchema.index(
  { merchantId: 1, clientId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientId: { $type: "string" } },
  },
);
