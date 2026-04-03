import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScansController } from "./scans.controller";
import { ScansService } from "./scans.service";
import { Scan, ScanSchema } from "../schemas/scan.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Sale, SaleSchema } from "../schemas/sale.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Scan.name, schema: ScanSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
  ],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService],
})
export class ScansModule {}
