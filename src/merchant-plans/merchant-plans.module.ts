import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PlanOrder, PlanOrderSchema } from '../schemas/plan-order.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { UsersModule } from '../users/users.module'
import { StoresModule } from '../stores/stores.module'
import { MerchantPlansController } from './merchant-plans.controller'
import { MerchantPlansService } from './merchant-plans.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanOrder.name, schema: PlanOrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    StoresModule,
  ],
  controllers: [MerchantPlansController],
  providers: [MerchantPlansService],
  exports: [MerchantPlansService],
})
export class MerchantPlansModule {}
