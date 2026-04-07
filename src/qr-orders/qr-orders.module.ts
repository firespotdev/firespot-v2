import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { QROrdersController } from './qr-orders.controller'
import { QROrdersService } from './qr-orders.service'
import { QROrder, QROrderSchema } from '../schemas/qr-order.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { UsersModule } from '../users/users.module'
import { QRKitsModule } from '../qr-kits/qr-kits.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QROrder.name, schema: QROrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule),
    QRKitsModule,
  ],
  controllers: [QROrdersController],
  providers: [QROrdersService],
  exports: [QROrdersService],
})
export class QROrdersModule {}
