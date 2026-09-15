import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  CustomerCartDraft,
  CustomerCartDraftSchema,
} from "../schemas/customer-cart-draft.schema";
import { Feedback, FeedbackSchema } from "../schemas/feedback.schema";
import { Product, ProductSchema } from "../schemas/product.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { Sale, SaleSchema } from "../schemas/sale.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { CustomerActionsController } from "./customer-actions.controller";
import { CustomerActionsService } from "./customer-actions.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerCartDraft.name, schema: CustomerCartDraftSchema },
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Product.name, schema: ProductSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CustomerActionsController],
  providers: [CustomerActionsService],
})
export class CustomerActionsModule {}
