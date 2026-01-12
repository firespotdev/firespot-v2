import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminQRKitsModule } from './qr-kits/admin-qr-kits.module';

@Module({
  imports: [AdminAuthModule, AdminQRKitsModule],
  exports: [],
})
export class AdminModule {}
