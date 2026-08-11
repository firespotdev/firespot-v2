import { Module, forwardRef } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { UsersModule } from "../users/users.module";
import { QRKitsModule } from "../qr-kits/qr-kits.module";
import { QROrdersModule } from "../qr-orders/qr-orders.module";
import { MerchantPlansModule } from "../merchant-plans/merchant-plans.module";
import { SalesModule } from "../sales/sales.module";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PaystackWebhookEvent,
  PaystackWebhookEventSchema,
} from "../schemas/paystack-webhook-event.schema";
import { PaymentCasesModule } from "../payment-cases/payment-cases.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaystackWebhookEvent.name, schema: PaystackWebhookEventSchema },
    ]),
    UsersModule,
    forwardRef(() => QRKitsModule),
    forwardRef(() => QROrdersModule),
    MerchantPlansModule,
    forwardRef(() => SalesModule),
    PaymentCasesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
