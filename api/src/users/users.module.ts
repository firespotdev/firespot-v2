import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PaystackService } from "./services/paystack.service";
import { CloudinaryService } from "./services/cloudinary.service";
import { User, UserSchema } from "../schemas/user.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { Product, ProductSchema } from "../schemas/product.schema";
import { AuthModule } from "../auth/auth.module";
import { MerchantReferralsModule } from "../merchant-referrals/merchant-referrals.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => AuthModule),
    MerchantReferralsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, PaystackService, CloudinaryService],
  exports: [UsersService, PaystackService, CloudinaryService],
})
export class UsersModule {}
