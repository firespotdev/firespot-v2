import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  imageUrl?: string;

  @Prop({ index: true })
  category?: string;

  @Prop({
    type: [{
      size: String,
      color: String,
      price: Number,
    }],
    default: [],
  })
  variants?: Array<{
    size?: string;
    color?: string;
    price?: number;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
export type ProductDocument = Product & Document;

ProductSchema.index({ merchantId: 1, category: 1 });
ProductSchema.index({ merchantId: 1, name: "text", description: "text" });
