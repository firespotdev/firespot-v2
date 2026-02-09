import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminMerchantsController } from "./admin-merchants.controller";
import { AdminMerchantsService } from "./admin-merchants.service";
import { User, UserSchema } from "../../schemas/user.schema";
import { QRKit, QRKitSchema } from "../../schemas/qrkit.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
    ]),
  ],
  controllers: [AdminMerchantsController],
  providers: [AdminMerchantsService],
  exports: [AdminMerchantsService],
})
export class AdminMerchantsModule {}
