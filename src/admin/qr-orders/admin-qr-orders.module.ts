import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminQROrdersController } from './admin-qr-orders.controller';
import { AdminQROrdersService } from './admin-qr-orders.service';
import { QROrder, QROrderSchema } from '../../schemas/qr-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QROrder.name, schema: QROrderSchema }]),
  ],
  controllers: [AdminQROrdersController],
  providers: [AdminQROrdersService],
  exports: [AdminQROrdersService],
})
export class AdminQROrdersModule {}
