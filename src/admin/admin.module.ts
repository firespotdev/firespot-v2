import { Module } from "@nestjs/common";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { AdminQRKitsModule } from "./qr-kits/admin-qr-kits.module";
import { AdminAgentsModule } from "./agents/admin-agents.module";
import { AdminMerchantsModule } from "./merchants/admin-merchants.module";
import { AdminOrdersModule } from "./orders/admin-orders.module";

@Module({
  imports: [
    AdminAuthModule,
    AdminQRKitsModule,
    AdminAgentsModule,
    AdminMerchantsModule,
    AdminOrdersModule,
  ],
  exports: [],
})
export class AdminModule {}
