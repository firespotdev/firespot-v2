import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class ProductCategory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({ required: true, trim: true })
  name: string

  @Prop({ default: 0 })
  sortOrder: number
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory)
export type ProductCategoryDocument = ProductCategory & Document

ProductCategorySchema.index({ merchantId: 1, name: 1 }, { unique: true })
