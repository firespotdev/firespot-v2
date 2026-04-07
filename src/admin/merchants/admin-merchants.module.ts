import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminMerchantsController } from "./admin-merchants.controller";
import { AdminMerchantsService } from "./admin-merchants.service";
import { User, UserSchema } from "../../schemas/user.schema";
import { QRKit, QRKitSchema } from "../../schemas/qrkit.schema";

import { Sale, SaleSchema } from "../../schemas/sale.schema";
import { Scan, ScanSchema } from "../../schemas/scan.schema";
import { QROrder, QROrderSchema } from "../../schemas/qr-order.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Scan.name, schema: ScanSchema },
      { name: QROrder.name, schema: QROrderSchema },
    ]),
  ],
  controllers: [AdminMerchantsController],
  providers: [AdminMerchantsService],
  exports: [AdminMerchantsService],
})
export class AdminMerchantsModule {}
