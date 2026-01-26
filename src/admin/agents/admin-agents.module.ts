import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AdminAgentsController } from './admin-agents.controller'
import { AdminAgentsService } from './admin-agents.service'
import { Agent, AgentSchema } from '../schemas/agent.schema'
import { QRKit, QRKitSchema } from '../../schemas/qrkit.schema'
import { User, UserSchema } from '../../schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Agent.name, schema: AgentSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminAgentsController],
  providers: [AdminAgentsService],
  exports: [AdminAgentsService],
})
export class AdminAgentsModule {}
