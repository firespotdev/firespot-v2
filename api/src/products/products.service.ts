import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../schemas/product.schema";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(
    merchantId: string,
    name: string,
    description: string,
    price: number,
    category: string,
    variants?: Array<{ size?: string; color?: string; price?: number }>,
    imageUrl?: string,
  ): Promise<Product> {
    const product = new this.productModel({
      merchantId: new Types.ObjectId(merchantId),
      name,
      description,
      price,
      category,
      variants,
      imageUrl,
    });
    return product.save();
  }

  async findAll(merchantId: string, search?: string, category?: string): Promise<Product[]> {
    const query: any = { merchantId: new Types.ObjectId(merchantId) };

    if (category && category !== "All") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    return this.productModel.find(query).sort({ name: 1 }).exec();
  }

  async update(id: string, merchantId: string, data: any): Promise<Product> {
    const product = await this.productModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), merchantId: new Types.ObjectId(merchantId) },
      { $set: data },
      { new: true },
    ).exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async remove(id: string, merchantId: string): Promise<void> {
    const result = await this.productModel.deleteOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Product not found");
    }
  }
}
