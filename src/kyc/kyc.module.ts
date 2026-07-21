import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from '../schemas/user.schema'
import { KycController } from './kyc.controller'
import { KycService } from './kyc.service'
import { SmileIdService } from '../services/smileid/smileid.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [KycController],
  providers: [KycService, SmileIdService],
  exports: [KycService, SmileIdService],
})
export class KycModule {}
