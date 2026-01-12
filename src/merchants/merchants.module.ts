import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MerchantsController } from './merchants.controller'
import { MerchantsService } from './merchants.service'
import { User, UserSchema } from '../schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
