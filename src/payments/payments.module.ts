import { Module, forwardRef } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { UsersModule } from "../users/users.module";
import { QRKitsModule } from "../qr-kits/qr-kits.module";
import { QROrdersModule } from "../qr-orders/qr-orders.module";

@Module({
  imports: [UsersModule, forwardRef(() => QRKitsModule), forwardRef(() => QROrdersModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
