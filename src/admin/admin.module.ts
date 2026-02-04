import { Module } from '@nestjs/common'
import { AdminAuthModule } from './admin-auth/admin-auth.module'
import { AdminQRKitsModule } from './qr-kits/admin-qr-kits.module'
import { AdminAgentsModule } from './agents/admin-agents.module'
import { AdminMerchantsModule } from './merchants/admin-merchants.module'

@Module({
  imports: [AdminAuthModule, AdminQRKitsModule, AdminAgentsModule, AdminMerchantsModule],
  exports: [],
})
export class AdminModule {}

