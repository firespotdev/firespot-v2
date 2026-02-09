import { Module, forwardRef } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { UsersModule } from "../users/users.module";
import { QRKitsModule } from "../qr-kits/qr-kits.module";

@Module({
  imports: [UsersModule, forwardRef(() => QRKitsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
