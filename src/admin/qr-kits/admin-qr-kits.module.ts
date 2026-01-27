import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AdminQRKitsController } from './admin-qr-kits.controller'
import { AdminQRKitsService } from './admin-qr-kits.service'
import { QRKit, QRKitSchema } from '../../schemas/qrkit.schema'
import { User, UserSchema } from '../../schemas/user.schema'
import { Agent, AgentSchema } from '../schemas/agent.schema'
import { QRCodeService } from '../../services/qr-code.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
      { name: Agent.name, schema: AgentSchema },
    ]),
  ],
  controllers: [AdminQRKitsController],
  providers: [AdminQRKitsService, QRCodeService],
  exports: [AdminQRKitsService],
})
export class AdminQRKitsModule {}
