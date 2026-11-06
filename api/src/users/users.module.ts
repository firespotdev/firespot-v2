import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PublicMerchantsController, UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PaystackService } from "./services/paystack.service";
import { CloudinaryService } from "./services/cloudinary.service";
import { User, UserSchema } from "../schemas/user.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { Product, ProductSchema } from "../schemas/product.schema";
import { Store, StoreSchema } from "../schemas/store.schema";
import { Sale, SaleSchema } from "../schemas/sale.schema";
import { Feedback, FeedbackSchema } from "../schemas/feedback.schema";
import { AuthModule } from "../auth/auth.module";
import { MerchantReferralsModule } from "../merchant-referrals/merchant-referrals.module";
import { PaystackSubaccountsService } from "./services/paystack-subaccounts.service";
import { GoogleGeocodingService } from "./services/google-geocoding.service";
import { CurrentLocationService } from "./current-location.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Store.name, schema: StoreSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
    forwardRef(() => AuthModule),
    MerchantReferralsModule,
  ],
  controllers: [UsersController, PublicMerchantsController],
  providers: [
    UsersService,
    PaystackService,
    PaystackSubaccountsService,
    CloudinaryService,
    GoogleGeocodingService,
    CurrentLocationService,
  ],
  exports: [
    UsersService,
    PaystackService,
    PaystackSubaccountsService,
    CloudinaryService,
  ],
})
export class UsersModule {}
