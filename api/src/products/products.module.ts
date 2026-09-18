import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "../schemas/product.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import {
  ProductCategory,
  ProductCategorySchema,
} from '../schemas/product-category.schema';
import { CloudinaryService } from '../users/services/cloudinary.service';
import {
  ProductsController,
  PublicProductsController,
} from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
    ]),
  ],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, CloudinaryService],
  exports: [ProductsService],
})
export class ProductsModule {}
