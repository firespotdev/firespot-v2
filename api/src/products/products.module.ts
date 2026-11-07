import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "../schemas/product.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { Sale, SaleSchema } from "../schemas/sale.schema";
import { Feedback, FeedbackSchema } from "../schemas/feedback.schema";
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
import { ProductBuyersService } from "./product-buyers.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, ProductBuyersService, CloudinaryService],
  exports: [ProductsService],
})
export class ProductsModule {}
