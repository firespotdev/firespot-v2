import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { AdminAuthModule } from "../admin/admin-auth/admin-auth.module";
import { UsersModule } from "../users/users.module";
import { Sale, SaleSchema } from "../schemas/sale.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Refund, RefundSchema } from "../schemas/refund.schema";
import {
  PaystackDispute,
  PaystackDisputeSchema,
} from "../schemas/paystack-dispute.schema";
import { RefundsController } from "./refunds.controller";
import { DisputesController } from "./disputes.controller";
import { AdminPaymentCasesController } from "./admin-payment-cases.controller";
import { RefundsService } from "./refunds.service";
import { DisputesService } from "./disputes.service";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
      { name: Refund.name, schema: RefundSchema },
      { name: PaystackDispute.name, schema: PaystackDisputeSchema },
    ]),
    AuthModule,
    AdminAuthModule,
    UsersModule,
    ReportsModule,
  ],
  controllers: [
    RefundsController,
    DisputesController,
    AdminPaymentCasesController,
  ],
  providers: [RefundsService, DisputesService],
  exports: [RefundsService, DisputesService],
})
export class PaymentCasesModule {}
