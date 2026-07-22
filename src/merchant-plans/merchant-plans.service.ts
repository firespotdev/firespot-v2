import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Model, Types } from 'mongoose'
import { PlanOrder, PlanOrderDocument } from '../schemas/plan-order.schema'
import { User, UserDocument } from '../schemas/user.schema'
import { PaystackService } from '../users/services/paystack.service'
import { StoresService } from '../stores/stores.service'
import {
  PLANS,
  PLAN_REFERENCE_PREFIX,
  PLAN_TIERS,
  PlanTier,
  getNextStep,
  getPlan,
} from './constants/plans'

@Injectable()
export class MerchantPlansService {
  private readonly logger = new Logger(MerchantPlansService.name)

  constructor(
    @InjectModel(PlanOrder.name)
    private planOrderModel: Model<PlanOrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
    private storesService: StoresService,
    private configService: ConfigService,
  ) {}

  /** Catalog plus the merchant's current plan/verification state. */
  async getCatalog(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    const tier = user?.planTier as PlanTier | undefined

    return {
      plans: PLAN_TIERS.map((t) => PLANS[t]),
      current: {
        planTier: user?.planTier || null,
        planStatus: user?.planStatus || 'none',
        verificationLevel: user?.verificationLevel || null,
        planCurrentPeriodEnd: user?.planCurrentPeriodEnd || null,
        nextStep: tier
          ? (getNextStep(tier, user?.kyc as any)?.key ?? null)
          : null,
      },
    }
  }

  private planCodeFor(tier: PlanTier): string | undefined {
    if (tier === 'PRO') {
      return this.configService.get<string>('PAYSTACK_PLAN_CODE_PRO')
    }
    if (tier === 'PROMAX') {
      return this.configService.get<string>('PAYSTACK_PLAN_CODE_PROMAX')
    }
    return undefined
  }

  /**
   * Starts a plan purchase. Mirrors QROrdersService.createOrder: create a
   * PENDING order, initialize Paystack, hand back the authorization URL.
   * Recurring tiers pass a plan code so paying creates a subscription.
   */
  async purchase(merchantId: string, tier: string) {
    const plan = getPlan(tier)
    if (!plan) {
      throw new BadRequestException('Unknown plan tier')
    }

    const user = await this.userModel
      .findById(merchantId)
      .select('fullPhoneNumber planTier')
      .exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // PRO MAX bills per active store (at least one).
    const storeCount = plan.perStore
      ? Math.max(1, await this.storesService.countActive(merchantId))
      : 1
    const amount = plan.price * storeCount

    const order = new this.planOrderModel({
      merchantId: new Types.ObjectId(merchantId),
      tier: plan.tier,
      amount,
      storeCount,
      billingType: plan.billingType,
      paymentStatus: 'PENDING',
    })
    await order.save()

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'

    try {
      const payment = await this.paystackService.initializeTransaction({
        email,
        amount: amount * 100, // kobo
        reference: `${PLAN_REFERENCE_PREFIX}${order._id}-${Date.now()}`,
        callbackUrl: `${frontendUrl}/plan-status`,
        metadata: {
          merchantId,
          tier: plan.tier,
          planOrderId: order._id.toString(),
          type: 'PLAN',
        },
        plan: this.planCodeFor(plan.tier),
      })

      order.paystackReference = payment.reference
      order.paystackAccessCode = payment.accessCode
      await order.save()

      return {
        authorizationUrl: payment.authorizationUrl,
        reference: payment.reference,
        planOrderId: order._id,
        tier: plan.tier,
        amount,
      }
    } catch (error) {
      this.logger.error(`Failed to initialize plan payment: ${error}`)
      throw new BadRequestException('Could not initialize payment for plan')
    }
  }

  /**
   * Verifies a plan payment and grants the tier. Idempotent — safe to call
   * from both the frontend callback and the Paystack webhook.
   */
  async verifyPayment(reference: string) {
    const verification =
      await this.paystackService.verifyTransaction(reference)

    if (verification.status !== 'success') {
      await this.planOrderModel
        .updateOne(
          { paystackReference: reference },
          { paymentStatus: 'FAILED' },
        )
        .exec()
      return { success: false, status: 'FAILED' }
    }

    const order = await this.planOrderModel
      .findOne({ paystackReference: reference })
      .exec()
    if (!order) {
      throw new NotFoundException('Plan order not found')
    }

    const alreadyGranted = order.paymentStatus === 'SUCCESSFUL'
    if (!alreadyGranted) {
      order.paymentStatus = 'SUCCESSFUL'
      order.paidAt = new Date()
      await order.save()
    }

    const plan = getPlan(order.tier)
    const update: Record<string, unknown> = {
      planTier: order.tier,
      // Payment unlocks KYC; verification is what ultimately grants the badge.
      planStatus: 'paid',
    }
    if (verification.customerCode) {
      update.paystackCustomerCode = verification.customerCode
    }
    if (plan?.billingType === 'monthly') {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      update.planCurrentPeriodEnd = periodEnd
    }

    await this.userModel.updateOne({ _id: order.merchantId }, { $set: update })

    return {
      success: true,
      status: 'SUCCESSFUL',
      tier: order.tier,
      alreadyGranted,
    }
  }

  /**
   * Records a subscription code against the merchant. Webhook payloads
   * identify the merchant by Paystack customer code, not our user id.
   */
  async attachSubscriptionByCustomer(
    customerCode: string,
    subscriptionCode: string,
  ) {
    if (!customerCode || !subscriptionCode) return
    await this.userModel
      .updateOne(
        { paystackCustomerCode: customerCode },
        { $addToSet: { subscriptionCodes: subscriptionCode } },
      )
      .exec()
  }

  /** Marks a subscription lapse. Keeps the tier but flags it for the UI. */
  async handleSubscriptionLapse(customerCode: string, disabled: boolean) {
    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user) return

    if (disabled) {
      user.planStatus = 'failed'
      await user.save()
    }
  }

  async renewPeriod(customerCode: string) {
    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user) return

    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    user.planCurrentPeriodEnd = periodEnd
    if (user.planStatus === 'failed') {
      user.planStatus = user.verificationLevel ? 'verified' : 'paid'
    }
    await user.save()
  }
}
