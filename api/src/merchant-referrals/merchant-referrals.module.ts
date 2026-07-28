import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Agent, AgentSchema } from '../admin/schemas/agent.schema'
import {
  MerchantReferral,
  MerchantReferralSchema,
} from '../schemas/merchant-referral.schema'
import {
  MerchantRewardLedger,
  MerchantRewardLedgerSchema,
} from '../schemas/merchant-reward-ledger.schema'
import { Sale, SaleSchema } from '../schemas/sale.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { MerchantReferralsController } from './merchant-referrals.controller'
import { MerchantReferralsService } from './merchant-referrals.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: MerchantReferral.name, schema: MerchantReferralSchema },
      {
        name: MerchantRewardLedger.name,
        schema: MerchantRewardLedgerSchema,
      },
    ]),
  ],
  controllers: [MerchantReferralsController],
  providers: [MerchantReferralsService],
  exports: [MerchantReferralsService],
})
export class MerchantReferralsModule {}
