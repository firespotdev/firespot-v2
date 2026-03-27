import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale, SaleSchema } from '../schemas/sale.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { QRKit, QRKitSchema } from '../schemas/qrkit.schema';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
    ]),
    EventsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService]
})
export class SalesModule {}
