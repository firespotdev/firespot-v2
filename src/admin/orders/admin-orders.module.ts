import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { Order, OrderSchema } from '../../schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
