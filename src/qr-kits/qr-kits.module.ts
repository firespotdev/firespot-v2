import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { QRKitsController } from './qr-kits.controller'
import { QRKitsService } from './qr-kits.service'
import { QRKit, QRKitSchema } from '../schemas/qrkit.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [QRKitsController],
  providers: [QRKitsService],
  exports: [QRKitsService],
})
export class QRKitsModule {}
