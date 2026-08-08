import {
  BadRequestException,
  HttpException,
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
  isDowngrade,
  GRACE_PERIOD_DAYS,
  getEffectiveTier,
  isLapsed,
  isInGracePeriod,
  getCollectEligibility,
  hasPendingPlanChange,
  isPlanChangeDue,
  calculateProration,
  classifyPlanChange,
  resolvePeriodWindow,
  MIN_CHARGE_NAIRA,
  type PlanPaymentMethod,
} from './constants/plans'
import { MerchantReferralsService } from '../merchant-referrals/merchant-referrals.service'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Paystack transaction statuses that mean "still settling", not "failed".
 * Everything outside this set and 'success' is terminal (abandoned, failed,
 * reversed). See docs/paystack_llm.md §6.
 */
const IN_FLIGHT_TRANSACTION_STATUSES = [
  'pending',
  'ongoing',
  'processing',
  'queued',
]

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
    private merchantReferralsService: MerchantReferralsService,
  ) {}

  private reevaluateReferralEligibility(merchantId: string | Types.ObjectId) {
    void this.merchantReferralsService
      .reevaluateReferrer(merchantId)
      .catch((error) =>
        this.logger.error(
          `Could not re-evaluate referral rewards for ${merchantId}`,
          error,
        ),
      )
  }

  /**
   * Persists a scheduled downgrade once its date has passed. getEffectiveTier
   * already resolves it lazily, so this only converges the stored record —
   * called on read paths rather than needing a cron.
   */
  async materializePendingChange(user: UserDocument): Promise<boolean> {
    if (!isPlanChangeDue(user)) return false

    const change = user.pendingPlanChange!
    user.planTier = change.tier
    // Carry the cadence across too, or currentInterval() would keep reporting
    // the pre-change value until the next payment lands.
    if (change.interval) {
      user.planInterval = change.interval
    }
    user.pendingPlanChange = undefined
    // Badge must follow the tier down (Verified Business → Verified User).
    this.applyBadgeForTier(user, change.tier)
    await user.save()

    this.logger.log(
      `Applied scheduled change for ${user._id}: now on ${change.tier}`,
    )
    return true
  }

  /** Catalog plus the merchant's current plan/verification state. */
  async getCatalog(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    if (user) await this.materializePendingChange(user)
    const tier = user?.planTier as PlanTier | undefined
    const planIsLapsed = user ? isLapsed(user) : false
    const planIsInGracePeriod = user ? isInGracePeriod(user) : false

    if (user && (planIsLapsed || planIsInGracePeriod)) {
      this.logger.warn(
        JSON.stringify({
          event: 'merchant_plan_warning',
          merchantId: String(user._id),
          warningType: planIsLapsed ? 'lapsed' : 'grace_period',
          planTier: user.planTier || null,
          effectiveTier: getEffectiveTier(user) || null,
          planStatus: user.planStatus || 'none',
          planGraceUntil: user.planGraceUntil?.toISOString?.() || null,
        }),
      )
    }

    // Drives PRO MAX's per-store total on the checkout (at least one).
    const activeStoreCount = Math.max(
      1,
      await this.storesService.countActive(merchantId),
    )

    // Billing cycle the merchant is currently on, so the UI can offer a
    // switch (monthly ↔ yearly) rather than showing "your current plan".
    const currentInterval = user
      ? await this.lastPaidInterval(user._id as Types.ObjectId)
      : null

    return {
      plans: PLAN_TIERS.map((t) => PLANS[t]),
      current: {
        planTier: user?.planTier || null,
        planStatus: user?.planStatus || 'none',
        verificationLevel: user?.verificationLevel || null,
        planCurrentPeriodEnd: user?.planCurrentPeriodEnd || null,
        planGraceUntil: user?.planGraceUntil || null,
        cancelAtPeriodEnd: user?.cancelAtPeriodEnd === true,
        currentInterval,
        // A downgrade waiting for the period to end, so the UI can show
        // "PRO starts 12 Aug" and block further changes until it lands.
        pendingPlanChange: user?.pendingPlanChange
          ? {
              tier: user.pendingPlanChange.tier,
              interval: user.pendingPlanChange.interval || null,
              effectiveAt: user.pendingPlanChange.effectiveAt,
            }
          : null,
        // What the merchant can actually use now (LITE once a lapse is final)
        effectiveTier: user ? getEffectiveTier(user) || null : null,
        isLapsed: planIsLapsed,
        isInGracePeriod: planIsInGracePeriod,
        // Collecting requires a plan AND completed KYC; recording never does.
        ...(user
          ? (() => {
              const { canCollect, reason } = getCollectEligibility(user)
              return { canCollect, collectBlockedReason: reason }
            })()
          : { canCollect: false, collectBlockedReason: 'no_plan' as const }),
        activeStoreCount,
        nextStep: tier
          ? (getNextStep(tier, user?.kyc as any)?.key ?? null)
          : null,
      },
    }
  }

  async getPaymentMethods(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const saved = this.hasReusableAuthorization(user)
      ? {
          id: 'SAVED_AUTHORIZATION' as const,
          label: this.savedMethodLabel(user),
          description: 'Use without opening Paystack Checkout',
        }
      : null

    return {
      methods: [
        ...(saved ? [saved] : []),
        {
          id: 'PAYSTACK_CHECKOUT' as const,
          label: 'Paystack checkout',
          description: 'Complete payment securely with Paystack',
        },
      ],
      defaultMethod: saved?.id || ('PAYSTACK_CHECKOUT' as const),
    }
  }

  private savedMethodLabel(user: UserDocument) {
    const details = user.paystackAuthorizationDetails
    const brand = details?.brand || details?.cardType
    if (brand && details?.last4) {
      return `${brand} •••• ${details.last4}`
    }
    if (details?.last4) {
      return `Card •••• ${details.last4}`
    }
    return 'Saved payment method'
  }

  private hasReusableAuthorization(user: UserDocument) {
    return Boolean(
      user.paystackAuthorizationCode &&
        user.paystackAuthorizationDetails?.reusable !== false,
    )
  }

  private planCodeFor(
    tier: PlanTier,
    interval: 'monthly' | 'annually',
  ): string | undefined {
    const annual = interval === 'annually'
    if (tier === 'PRO') {
      return this.configService.get<string>(
        annual ? 'PAYSTACK_PLAN_CODE_PRO_ANNUAL' : 'PAYSTACK_PLAN_CODE_PRO',
      )
    }
    if (tier === 'PROMAX') {
      return this.configService.get<string>(
        annual
          ? 'PAYSTACK_PLAN_CODE_PROMAX_ANNUAL'
          : 'PAYSTACK_PLAN_CODE_PROMAX',
      )
    }
    return undefined
  }

  /**
   * What a plan change would cost, without committing to it.
   *
   * Deliberately runs the same classifier and the same proration maths as
   * `purchase()` — if the quote and the charge were computed separately they
   * would eventually drift, and the merchant would be billed something other
   * than the figure they agreed to.
   */
  async previewChange(
    merchantId: string,
    tier: string,
    interval: 'monthly' | 'annually' = 'monthly',
  ) {
    const plan = getPlan(tier)
    if (!plan) throw new BadRequestException('Unknown plan tier')

    const user = await this.userModel.findById(merchantId).exec()
    if (!user) throw new NotFoundException('User not found')

    const effectiveInterval =
      plan.billingType === 'monthly' ? interval : 'monthly'
    const periods = effectiveInterval === 'annually' ? 12 : 1
    const storeCount = plan.perStore
      ? Math.max(1, await this.storesService.countActive(merchantId))
      : 1
    const fullAmount = plan.price * storeCount * periods

    const periodEnd = user.planCurrentPeriodEnd
    const hasLiveSubscription = Boolean(
      periodEnd && new Date(periodEnd).getTime() > Date.now(),
    )

    const kind = classifyPlanChange({
      currentTier: user.planTier,
      currentInterval: await this.currentInterval(user),
      targetTier: plan.tier,
      targetInterval: effectiveInterval,
      hasLiveSubscription,
    })

    const base = {
      kind,
      tier: plan.tier,
      interval: effectiveInterval,
      fullAmount,
      storeCount,
    }

    if (kind === 'blocked_cadence') {
      return {
        ...base,
        blocked: true,
        amountDue: 0,
        reason:
          'Your yearly plan can only be changed on a yearly cadence. To bill monthly, cancel and resubscribe once your current year ends.',
      }
    }

    if (kind === 'noop') {
      return { ...base, blocked: true, amountDue: 0, reason: 'You are already on this plan.' }
    }

    // Free, deferred outcomes.
    if (kind === 'scheduled_downgrade' || kind === 'cancellation') {
      return {
        ...base,
        blocked: false,
        amountDue: 0,
        effectiveAt: periodEnd || null,
        deferred: true,
      }
    }

    if (kind === 'purchase') {
      return { ...base, blocked: false, amountDue: fullAmount, deferred: false }
    }

    // Prorated now: same-cadence upgrade, or a cadence extension.
    const resetsPeriod = kind === 'cadence_extension'
    const currentPlan = getPlan(user.planTier || '')
    const currentIv = await this.currentInterval(user)
    const currentAmount =
      (currentPlan?.price || 0) *
      (currentPlan?.perStore ? storeCount : 1) *
      (currentIv === 'annually' ? 12 : 1)

    // Same derivation as the charge path, so quote and charge cannot diverge.
    const window = resolvePeriodWindow({
      periodStart: user.planCurrentPeriodStart,
      periodEnd: user.planCurrentPeriodEnd,
      interval: currentIv,
    })

    const { amountDue, subtotal, credit, daysLeft } = calculateProration({
      currentAmount,
      newAmount: fullAmount,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      resetsPeriod,
    })

    return {
      ...base,
      blocked: false,
      deferred: false,
      amountDue,
      // subtotal − credit === amountDue, so the checkout figures reconcile.
      subtotal,
      credit,
      resetsPeriod,
      daysLeft,
    }
  }

  /**
   * Starts a plan purchase. Mirrors QROrdersService.createOrder: create a
   * PENDING order, initialize Paystack, hand back the authorization URL.
   * Recurring tiers pass a plan code so paying creates a subscription.
   */
  async purchase(
    merchantId: string,
    tier: string,
    interval: 'monthly' | 'annually' = 'monthly',
    paymentMethod?: PlanPaymentMethod,
  ) {
    const plan = getPlan(tier)
    if (!plan) {
      throw new BadRequestException('Unknown plan tier')
    }

    const user = await this.userModel.findById(merchantId).exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // One change at a time — a queued downgrade must land before another.
    if (hasPendingPlanChange(user)) {
      throw new BadRequestException(
        'You already have a plan change scheduled. It applies at the end of your current period.',
      )
    }

    // One-time tiers ignore interval; subscriptions honour month vs year.
    const effectiveInterval =
      plan.billingType === 'monthly' ? interval : 'monthly'
    const periods = effectiveInterval === 'annually' ? 12 : 1

    // PRO MAX bills per active store (at least one).
    const storeCount = plan.perStore
      ? Math.max(1, await this.storesService.countActive(merchantId))
      : 1
    const amount = plan.price * storeCount * periods

    // A live subscription means this is a change, not a fresh purchase.
    const periodEnd = user.planCurrentPeriodEnd
    const hasLiveSubscription = Boolean(
      periodEnd && new Date(periodEnd).getTime() > Date.now(),
    )

    // Cadence dominates tier: scaling a yearly price by the fraction left of
    // a monthly period is meaningless, so classification decides everything.
    const kind = classifyPlanChange({
      currentTier: user.planTier,
      currentInterval: await this.currentInterval(user),
      targetTier: plan.tier,
      targetInterval: effectiveInterval,
      hasLiveSubscription,
    })

    switch (kind) {
      case 'noop':
        throw new BadRequestException('You are already on this plan.')

      case 'blocked_cadence':
        throw new BadRequestException(
          'Your yearly plan can only be changed on a yearly cadence. To bill monthly, cancel and resubscribe once your current year ends.',
        )

      case 'cancellation':
        return this.cancelSubscription(merchantId)

      case 'scheduled_downgrade':
        // Free and deferred: they keep what they paid for until it expires.
        return this.scheduleDowngrade(user, plan.tier, effectiveInterval)

      case 'prorated_upgrade':
        // Same cadence — charge only the difference, keep the renewal date.
        return this.upgradeWithProration(user, {
          tier: plan.tier,
          interval: effectiveInterval,
          newAmount: amount,
          storeCount,
          paymentMethod,
        })

      case 'cadence_extension':
        // Monthly → yearly buys a whole new period at full price, less the
        // unused credit, and the renewal date moves out accordingly.
        return this.upgradeWithProration(user, {
          tier: plan.tier,
          interval: effectiveInterval,
          newAmount: amount,
          storeCount,
          resetsPeriod: true,
          paymentMethod,
        })

      // 'purchase' → falls through to the normal full-price checkout below.
    }

    const order = new this.planOrderModel({
      merchantId: new Types.ObjectId(merchantId),
      tier: plan.tier,
      amount,
      storeCount,
      billingType: plan.billingType,
      interval: effectiveInterval,
      paymentStatus: 'PENDING',
    })
    await order.save()

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'

    try {
      if (paymentMethod === 'SAVED_AUTHORIZATION') {
        if (!this.hasReusableAuthorization(user)) {
          throw new BadRequestException({
            code: 'SAVED_PAYMENT_METHOD_UNAVAILABLE',
            message: 'Your saved payment method is no longer available.',
          })
        }

        const reference = `${PLAN_REFERENCE_PREFIX}${order._id}-${Date.now()}`
        const charge = await this.paystackService.chargeAuthorization({
          email,
          amount: amount * 100,
          authorizationCode: user.paystackAuthorizationCode,
          reference,
          metadata: {
            merchantId,
            tier: plan.tier,
            planOrderId: order._id.toString(),
            type: 'PLAN',
          },
        })

        if (!charge.success) {
          throw new BadRequestException({
            code: 'SAVED_PAYMENT_METHOD_FAILED',
            message:
              charge.message ||
              'Your saved payment method could not be charged. Choose another card.',
          })
        }

        order.paymentStatus = 'SUCCESSFUL'
        order.paystackReference = charge.reference || reference
        order.paidAt = new Date()
        await order.save()
        user.planGraceUntil = undefined
        user.cancelAtPeriodEnd = false
        await this.applyUpgrade(user, plan.tier, effectiveInterval, {
          resetsPeriod: plan.billingType === 'monthly',
        })

        return {
          type: 'purchased' as const,
          authorizationUrl: null,
          tier: plan.tier,
          amountCharged: amount,
          nextStep: this.outstandingStep(user, plan.tier),
        }
      }

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
        plan: this.planCodeFor(plan.tier, effectiveInterval),
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
      if (error instanceof HttpException) throw error
      this.logger.error(`Failed to initialize plan payment: ${error}`)
      throw new BadRequestException('Could not initialize payment for plan')
    }
  }

  /**
   * Schedules a downgrade for the end of the current period. No charge and no
   * refund: the merchant keeps the tier they paid for until it expires, then
   * drops to the lower one.
   */
  private async scheduleDowngrade(
    user: UserDocument,
    tier: string,
    interval: 'monthly' | 'annually',
  ) {
    const effectiveAt = user.planCurrentPeriodEnd as Date

    user.pendingPlanChange = { tier, interval, effectiveAt }
    await user.save()

    this.logger.log(
      `Scheduled downgrade for ${user._id}: ${user.planTier} → ${tier} at ${effectiveAt.toISOString()}`,
    )

    return {
      type: 'scheduled_downgrade' as const,
      tier,
      interval,
      effectiveAt,
      // No redirect — nothing to pay.
      authorizationUrl: null,
    }
  }

  /**
   * Upgrades immediately, charging only the prorated difference.
   *
   * Paystack has no proration, so we compute it, charge the difference (silent
   * if a card is stored, else via checkout), keep the existing renewal date,
   * and start the new subscription's recurring billing on that same date.
   */
  private async upgradeWithProration(
    user: UserDocument,
    params: {
      tier: string
      interval: 'monthly' | 'annually'
      newAmount: number
      storeCount: number
      /** monthly → yearly: buys a fresh period instead of riding out this one */
      resetsPeriod?: boolean
      paymentMethod?: PlanPaymentMethod
    },
  ) {
    const currentPlan = getPlan(user.planTier || '')
    const currentInterval = await this.currentInterval(user)
    const currentPeriods = currentInterval === 'annually' ? 12 : 1
    const currentStores = currentPlan?.perStore
      ? Math.max(1, await this.storesService.countActive(user._id.toString()))
      : 1
    const currentAmount =
      (currentPlan?.price || 0) * currentStores * currentPeriods

    // Derive the window: plans predating planCurrentPeriodStart have only an
    // end date, and a missing start would zero the proration.
    const window = resolvePeriodWindow({
      periodStart: user.planCurrentPeriodStart,
      periodEnd: user.planCurrentPeriodEnd,
      interval: currentInterval,
    })

    const { amountDue, daysLeft } = calculateProration({
      currentAmount,
      newAmount: params.newAmount,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      resetsPeriod: params.resetsPeriod,
    })

    const order = new this.planOrderModel({
      merchantId: user._id,
      tier: params.tier,
      amount: amountDue,
      storeCount: params.storeCount,
      billingType: 'monthly',
      interval: params.interval,
      paymentStatus: 'PENDING',
      isProration: true,
    })
    await order.save()

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`
    const reference = `${PLAN_REFERENCE_PREFIX}${order._id}-${Date.now()}`

    // Below Paystack's minimum charge (or fully covered by credit): just
    // switch rather than failing on a trivial amount.
    if (amountDue < MIN_CHARGE_NAIRA) {
      order.paymentStatus = 'SUCCESSFUL'
      order.paidAt = new Date()
      await order.save()
      await this.applyUpgrade(user, params.tier, params.interval, {
        resetsPeriod: params.resetsPeriod,
      })
      return {
        type: 'upgraded' as const,
        tier: params.tier,
        amountCharged: 0,
        daysLeft,
        authorizationUrl: null,
        // There is no Paystack round-trip on this path, so the client has
        // nowhere else to learn that the new tier needs more verification.
        nextStep: this.outstandingStep(user, params.tier),
      }
    }

    // Preferred path: charge the saved card in place, no redirect.
    if (
      params.paymentMethod !== 'PAYSTACK_CHECKOUT' &&
      this.hasReusableAuthorization(user)
    ) {
      const charge = await this.paystackService.chargeAuthorization({
        email,
        amount: amountDue * 100,
        authorizationCode: user.paystackAuthorizationCode,
        reference,
        metadata: {
          merchantId: user._id.toString(),
          tier: params.tier,
          planOrderId: order._id.toString(),
          type: 'PLAN_PRORATION',
        },
      })

      if (charge.success) {
        order.paymentStatus = 'SUCCESSFUL'
        order.paystackReference = charge.reference || reference
        order.paidAt = new Date()
        await order.save()
        await this.applyUpgrade(user, params.tier, params.interval, {
          resetsPeriod: params.resetsPeriod,
        })
        return {
          type: 'upgraded' as const,
          tier: params.tier,
          amountCharged: amountDue,
          daysLeft,
          authorizationUrl: null,
          nextStep: this.outstandingStep(user, params.tier),
        }
      }
      if (params.paymentMethod === 'SAVED_AUTHORIZATION') {
        throw new BadRequestException({
          code: 'SAVED_PAYMENT_METHOD_FAILED',
          message:
            charge.message ||
            'Your saved payment method could not be charged. Choose another card.',
        })
      }
      // Legacy clients did not make an explicit choice, so retain their
      // existing checkout fallback when a saved charge is declined.
      this.logger.warn(
        `Saved-card proration failed for ${user._id}: ${charge.message}`,
      )
    }

    // Fallback: checkout for the prorated difference (never full price).
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    const payment = await this.paystackService.initializeTransaction({
      email,
      amount: amountDue * 100,
      reference,
      callbackUrl: `${frontendUrl}/plan-status`,
      metadata: {
        merchantId: user._id.toString(),
        tier: params.tier,
        planOrderId: order._id.toString(),
        type: 'PLAN_PRORATION',
      },
    })

    order.paystackReference = payment.reference
    order.paystackAccessCode = payment.accessCode
    await order.save()

    return {
      type: 'checkout' as const,
      authorizationUrl: payment.authorizationUrl,
      reference: payment.reference,
      planOrderId: order._id,
      tier: params.tier,
      amount: amountDue,
      daysLeft,
    }
  }

  /**
   * The first check still outstanding for a tier, or null when it is fully
   * verified. Keyed to the tier being applied rather than to whether the
   * merchant has *ever* verified: a PRO merchant moving to PRO MAX has
   * completed KYC, but not PRO MAX's KYC.
   */
  private outstandingStep(user: UserDocument, tier: string) {
    const plan = getPlan(tier)
    if (!plan) return null
    return getNextStep(tier as PlanTier, user.kyc as any)?.key ?? null
  }

  /**
   * Applies an upgrade in place: the tier changes now, the old subscription is
   * retired, and the new one starts recurring on the renewal date.
   *
   * Same-cadence upgrades **keep** the existing renewal date. A cadence
   * extension (monthly → yearly) **resets** the period, since the merchant has
   * just bought a fresh 12 months rather than topping up the current month.
   */
  private async applyUpgrade(
    user: UserDocument,
    tier: string,
    interval: 'monthly' | 'annually',
    opts?: { resetsPeriod?: boolean },
  ) {
    let periodEnd = user.planCurrentPeriodEnd

    if (opts?.resetsPeriod) {
      const start = new Date()
      const end = new Date()
      end.setMonth(end.getMonth() + (interval === 'annually' ? 12 : 1))
      user.planCurrentPeriodStart = start
      user.planCurrentPeriodEnd = end
      periodEnd = end
    }

    user.planTier = tier
    user.planInterval = interval
    // Verified against the NEW tier's requirements — a PRO merchant moving to
    // PRO MAX has not done CAC, so they are 'paid', not 'verified'.
    user.planStatus = this.outstandingStep(user, tier) === null
      ? 'verified'
      : 'paid'
    user.pendingPlanChange = undefined
    // A paid upgrade clears any lapse or pending cancellation, whichever path
    // reached here. Clearing this centrally matters twice over: the two
    // proration paths used to skip it, and a stale planGraceUntil makes the
    // NEXT genuine lapse demote instantly, because the window is only ever
    // opened when none is already recorded.
    user.planGraceUntil = undefined
    user.cancelAtPeriodEnd = false
    this.applyBadgeForTier(user, tier)
    await user.save()
    this.reevaluateReferralEligibility(user._id as Types.ObjectId)

    // Retire the old subscription and start the new one on the renewal date,
    // so billing stays aligned and nothing double-charges.
    const planCode = this.planCodeFor(tier as PlanTier, interval)
    if (user.paystackCustomerCode && planCode && periodEnd) {
      try {
        const created = await this.paystackService.createSubscription({
          customer: user.paystackCustomerCode,
          plan: planCode,
          authorization: user.paystackAuthorizationCode,
          startDate: periodEnd,
        })
        // Record the new subscription immediately rather than waiting for the
        // subscription.create webhook. The guard that stops the OLD one's
        // not_renew from looking like a lapse depends on a live subscription
        // already being known locally, and webhook ordering is not guaranteed.
        // This also captures the email_token, which subscription.create omits.
        await this.attachSubscriptionByCustomer(
          user.paystackCustomerCode,
          created.subscriptionCode,
          created.emailToken,
          { planCode, interval },
        )
        await this.supersedePreviousSubscriptions(
          user.paystackCustomerCode,
          created.subscriptionCode,
        )
      } catch (error) {
        this.logger.error(
          `Upgrade applied but subscription setup failed for ${user._id}: ${error}`,
        )
      }
    }
  }

  /**
   * Badge follows the tier, but only once the tier's own checks all pass.
   *
   * Gating on "has ever completed KYC" would hand a PRO merchant the Verified
   * Business badge the moment they paid for PRO MAX, before CAC ran. While a
   * tier is unverified the existing badge is left alone, so the merchant keeps
   * the one they actually earned.
   */
  private applyBadgeForTier(user: UserDocument, tier: string) {
    if (this.outstandingStep(user, tier) !== null) return
    const badge = getPlan(tier)?.badge
    user.verificationLevel = badge || undefined
  }

  /**
   * Verifies a plan payment and grants the tier. Idempotent — safe to call
   * from both the frontend callback and the Paystack webhook, which race by
   * design.
   */
  async verifyPayment(reference: string, callerId?: string) {
    // Every read and write is scoped to the caller when one is supplied, so an
    // authenticated merchant cannot settle or fail another merchant's order.
    // The Paystack webhook passes no caller — it is trusted once its signature
    // has been verified.
    const orderFilter: Record<string, unknown> = { paystackReference: reference }
    if (callerId && Types.ObjectId.isValid(callerId)) {
      orderFilter.merchantId = new Types.ObjectId(callerId)
    }

    const verification =
      await this.paystackService.verifyTransaction(reference)

    // Still settling. Bank transfer and USSD payments commonly return here
    // before the charge lands, and the merchant is redirected to /plan-status
    // immediately — marking the order FAILED would tell someone who is
    // mid-payment that it failed, only for charge.success to contradict it.
    if (IN_FLIGHT_TRANSACTION_STATUSES.includes(verification.status)) {
      return { success: false, status: 'PENDING' as const, pending: true }
    }

    if (verification.status !== 'success') {
      await this.planOrderModel
        .updateOne(orderFilter, { paymentStatus: 'FAILED' })
        .exec()
      return { success: false, status: 'FAILED' }
    }

    const order = await this.planOrderModel.findOne(orderFilter).exec()
    if (!order) {
      throw new NotFoundException('Plan order not found')
    }

    // Paystack is explicit: never deliver value when the amount paid does not
    // match what was ordered. `verification.amount` is kobo; order.amount is
    // naira. A missing amount is tolerated rather than blocking a legitimate
    // payment on a field Paystack should always send.
    const expectedKobo = Math.round(order.amount * 100)
    if (
      typeof verification.amount === 'number' &&
      verification.amount !== expectedKobo
    ) {
      this.logger.error(
        JSON.stringify({
          event: 'plan_payment_amount_mismatch',
          reference,
          merchantId: String(order.merchantId),
          tier: order.tier,
          expectedKobo,
          paidKobo: verification.amount,
        }),
      )
      await this.planOrderModel
        .updateOne(orderFilter, { paymentStatus: 'FAILED' })
        .exec()
      return {
        success: false,
        status: 'FAILED' as const,
        reason: 'amount_mismatch' as const,
      }
    }

    // Claim the order atomically. The callback and the webhook can arrive
    // together, and the grant below is not safely repeatable — applyUpgrade
    // creates a Paystack subscription, so running it twice bills the merchant
    // twice. Whoever loses the claim returns the same result without redoing
    // the side effects. Mirrors QROrdersService.verifyPayment.
    const claimed = await this.planOrderModel
      .findOneAndUpdate(
        { ...orderFilter, paymentStatus: { $ne: 'SUCCESSFUL' } },
        { paymentStatus: 'SUCCESSFUL', paidAt: new Date() },
        { new: true },
      )
      .exec()

    if (!claimed) {
      return {
        success: true,
        status: 'SUCCESSFUL',
        tier: order.tier,
        alreadyGranted: true,
      }
    }

    // Prorated upgrade paid via the checkout fallback: apply in place and
    // keep the existing renewal date rather than starting a new period.
    if (order.isProration) {
      const user = await this.userModel.findById(order.merchantId).exec()
      if (user) {
        if (verification.authorizationCode) {
          user.paystackAuthorizationCode = verification.authorizationCode
        }
        if (verification.authorizationDetails) {
          user.paystackAuthorizationDetails =
            verification.authorizationDetails
        }
        if (verification.customerCode) {
          user.paystackCustomerCode = verification.customerCode
        }
        await user.save()
        await this.applyUpgrade(
          user,
          order.tier,
          order.interval === 'annually' ? 'annually' : 'monthly',
        )
      }
      return {
        success: true,
        status: 'SUCCESSFUL',
        tier: order.tier,
        alreadyGranted: false,
        prorated: true,
      }
    }

    const plan = getPlan(order.tier)
    const update: Record<string, unknown> = {
      planTier: order.tier,
      // Payment unlocks KYC; verification is what ultimately grants the badge.
      planStatus: 'paid',
      // A fresh payment clears any lapse or pending cancellation.
      planGraceUntil: null,
      cancelAtPeriodEnd: false,
    }
    if (verification.customerCode) {
      update.paystackCustomerCode = verification.customerCode
    }
    // Store the card token so future upgrades can be charged in place
    // instead of sending the merchant through checkout again.
    if (verification.authorizationCode) {
      update.paystackAuthorizationCode = verification.authorizationCode
    }
    if (verification.authorizationDetails) {
      update.paystackAuthorizationDetails = verification.authorizationDetails
    }
    if (plan?.billingType === 'monthly') {
      const periodStart = new Date()
      const periodEnd = new Date()
      // Annual orders buy 12 months, not 1.
      periodEnd.setMonth(
        periodEnd.getMonth() + (order.interval === 'annually' ? 12 : 1),
      )
      // Period start is what makes proration exact rather than assuming 30d.
      update.planCurrentPeriodStart = periodStart
      update.planCurrentPeriodEnd = periodEnd
      // Authoritative cadence — order history goes stale after a deferred
      // change lands without a new order.
      update.planInterval = order.interval === 'annually' ? 'annually' : 'monthly'
    }

    await this.userModel.updateOne({ _id: order.merchantId }, { $set: update })

    return {
      success: true,
      status: 'SUCCESSFUL',
      tier: order.tier,
      alreadyGranted: false,
    }
  }

  /**
   * Records a subscription against the merchant. Webhook payloads identify the
   * merchant by Paystack customer code, not our user id.
   *
   * `emailToken` is an opaque Paystack token (not an email address) needed to
   * disable the subscription later, so we capture it on arrival.
   */
  async attachSubscriptionByCustomer(
    customerCode: string,
    subscriptionCode: string,
    emailToken?: string,
    extra?: { planCode?: string; interval?: string },
  ) {
    if (!customerCode || !subscriptionCode) return

    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user) return

    if (!user.subscriptions) user.subscriptions = []
    const existing = user.subscriptions.find((s) => s.code === subscriptionCode)

    if (existing) {
      if (emailToken) existing.emailToken = emailToken
      existing.status = 'active'
    } else {
      user.subscriptions.push({
        code: subscriptionCode,
        emailToken,
        planCode: extra?.planCode,
        interval: extra?.interval,
        status: 'active',
        createdAt: new Date(),
      })
    }

    // Keep the legacy array in sync for anything still reading it.
    if (!user.subscriptionCodes?.includes(subscriptionCode)) {
      user.subscriptionCodes = [
        ...(user.subscriptionCodes || []),
        subscriptionCode,
      ]
    }

    await user.save()
  }

  /**
   * Disables every subscription except the one just created, so a merchant
   * switching interval (monthly→yearly) or upgrading tier (PRO→PRO MAX) is
   * never billed twice.
   *
   * Called only AFTER the new subscription exists — cancelling first would
   * strand the merchant with no access if the new payment failed.
   */
  async supersedePreviousSubscriptions(
    customerCode: string,
    keepCode: string,
  ) {
    if (!customerCode || !keepCode) return

    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user?.subscriptions?.length) return

    let superseded = 0
    for (const sub of user.subscriptions) {
      if (this.isIntentionallyRetired(sub) || sub.code === keepCode) continue

      const token = await this.ensureEmailToken(sub)
      if (!token) {
        this.logger.error(
          `Cannot supersede ${sub.code} for ${user._id}: no email token`,
        )
        continue
      }

      // Record the intent BEFORE calling Paystack, and persist it immediately.
      // Disabling fires subscription.not_renew straight back at our webhook,
      // which would otherwise arrive before this write and be read as a lapse
      // — demoting a merchant who has just paid to upgrade.
      const previousStatus = sub.status
      sub.status = 'cancelling'
      await user.save()

      try {
        await this.paystackService.disableSubscription({
          code: sub.code,
          token,
        })
        sub.status = 'cancelled'
        superseded += 1
      } catch (error) {
        // Still live — restore the status so it is not wrongly ignored later.
        sub.status = previousStatus
        this.logger.error(`Failed to supersede ${sub.code}: ${error}`)
      }
      await user.save()
    }

    if (superseded > 0) {
      this.logger.log(
        `Superseded ${superseded} old subscription(s) for ${user._id}`,
      )
    }
  }

  /**
   * Ensures a stored subscription has its emailToken, fetching it from
   * Paystack when missing (subscriptions created before we captured it).
   * Returns the token, or null if it could not be recovered.
   */
  private async ensureEmailToken(sub: {
    code: string
    emailToken?: string
  }): Promise<string | null> {
    if (sub.emailToken) return sub.emailToken
    try {
      const remote = await this.paystackService.fetchSubscription(sub.code)
      const token = remote?.email_token
      if (token) {
        sub.emailToken = token
        return token
      }
      return null
    } catch (error) {
      this.logger.warn(`Could not fetch token for ${sub.code}: ${error}`)
      return null
    }
  }

  /**
   * Cancels every active subscription. Paystack stops future charges but the
   * current period is already paid, so access continues until
   * planCurrentPeriodEnd — after which getEffectiveTier demotes to LITE.
   */
  async cancelSubscription(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) throw new NotFoundException('User not found')

    // Migrate any legacy code-only entries so they can be cancelled too.
    if (!user.subscriptions) user.subscriptions = []
    for (const code of user.subscriptionCodes || []) {
      if (!user.subscriptions.some((s) => s.code === code)) {
        user.subscriptions.push({ code, status: 'active' })
      }
    }

    const active = user.subscriptions.filter(
      (s) => !this.isIntentionallyRetired(s),
    )
    if (active.length === 0) {
      throw new BadRequestException('No active subscription to cancel')
    }

    let cancelled = 0
    for (const sub of active) {
      const token = await this.ensureEmailToken(sub)
      if (!token) {
        this.logger.error(
          `Cannot cancel ${sub.code} for ${merchantId}: no email token`,
        )
        continue
      }

      // Persist the intent before Paystack can fire subscription.not_renew
      // back at us — otherwise the webhook races this write and the merchant
      // is recorded as a failed payer instead of a deliberate canceller.
      const previousStatus = sub.status
      sub.status = 'cancelling'
      await user.save()

      try {
        await this.paystackService.disableSubscription({
          code: sub.code,
          token,
        })
        sub.status = 'cancelled'
        cancelled += 1
      } catch (error) {
        sub.status = previousStatus
        this.logger.error(`Failed to disable ${sub.code}: ${error}`)
      }
      await user.save()
    }

    if (cancelled === 0) {
      throw new BadRequestException(
        'Could not cancel your subscription. Please contact support.',
      )
    }

    // Access continues to planCurrentPeriodEnd; getEffectiveTier drops to the
    // LITE floor only once that date passes.
    user.cancelAtPeriodEnd = true
    await user.save()

    return {
      success: true,
      cancelledCount: cancelled,
      // Access continues until this date; then the LITE floor applies.
      activeUntil: user.planCurrentPeriodEnd || null,
    }
  }

  /**
   * Loads the merchant behind a subscription webhook and resolves the local
   * record for the subscription named in the payload.
   *
   * `otherActive` is the guard that stops an upgrade from looking like a
   * cancellation: applyUpgrade creates the replacement subscription *before*
   * retiring the old one, so the old one's webhook arrives while a live
   * subscription already exists.
   */
  private async resolveSubscriptionContext(
    customerCode: string,
    subscriptionCode?: string,
  ) {
    if (!customerCode) return null
    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user) return null

    const sub = subscriptionCode
      ? user.subscriptions?.find((s) => s.code === subscriptionCode)
      : undefined
    const otherActive = Boolean(
      user.subscriptions?.some(
        (s) => s.code !== subscriptionCode && s.status === 'active',
      ),
    )
    return { user, sub, otherActive }
  }

  /** True for a subscription this service retired deliberately. */
  private isIntentionallyRetired(sub?: { status?: string }): boolean {
    return sub?.status === 'cancelling' || sub?.status === 'cancelled'
  }

  /**
   * A subscription renewal charge failed (`invoice.payment_failed`). This is
   * the ONLY event that may demote a merchant: the other two subscription
   * events fire when we disable a subscription ourselves.
   *
   * The merchant keeps full access until the grace window closes, after which
   * getEffectiveTier demotes them to the LITE floor.
   */
  async handleSubscriptionLapse(
    customerCode: string,
    subscriptionCode?: string,
  ) {
    const ctx = await this.resolveSubscriptionContext(
      customerCode,
      subscriptionCode,
    )
    if (!ctx) return
    const { user, sub, otherActive } = ctx

    // A subscription we retired ourselves is not a lapse. Both the supersede
    // and cancel paths mark it before calling Paystack precisely so the
    // resulting webhook can be recognised here.
    if (this.isIntentionallyRetired(sub)) {
      this.logger.log(
        `Ignoring lapse for retired subscription ${subscriptionCode} (${user._id})`,
      )
      return
    }
    if (otherActive) {
      this.logger.log(
        `Ignoring lapse for ${subscriptionCode}: ${user._id} still has an active subscription`,
      )
      return
    }

    user.planStatus = 'failed'
    // Only open the window once — repeated failure webhooks must not keep
    // extending a merchant's free access. Paystack retries an unacknowledged
    // webhook for 72 hours, so repeats are expected.
    if (!user.planGraceUntil) {
      const graceUntil = new Date()
      graceUntil.setDate(graceUntil.getDate() + GRACE_PERIOD_DAYS)
      user.planGraceUntil = graceUntil
    }
    await user.save()

    this.logger.warn(
      `Subscription lapsed for ${user._id}; grace until ${user.planGraceUntil?.toISOString()}`,
    )
  }

  /**
   * Paystack `subscription.not_renew`: the subscription moved to
   * `non-renewing`. It will not be charged again, but the period already paid
   * for runs to its end — so this is a cancellation, **not** a lapse, and must
   * never touch planStatus. See docs/paystack_llm.md §4.
   *
   * Fires immediately when a subscription is disabled; the matching
   * `subscription.disable` arrives later, at the next payment date.
   */
  async markSubscriptionNonRenewing(
    customerCode: string,
    subscriptionCode?: string,
    emailToken?: string,
  ) {
    const ctx = await this.resolveSubscriptionContext(
      customerCode,
      subscriptionCode,
    )
    if (!ctx) return
    const { user, sub, otherActive } = ctx

    if (sub) {
      // not_renew is one of the few events carrying the token needed to
      // disable a subscription later — subscription.create does not.
      if (emailToken && !sub.emailToken) sub.emailToken = emailToken
      if (!this.isIntentionallyRetired(sub)) sub.status = 'non-renewing'
    }

    // Only treat this as the merchant cancelling when nothing else is live;
    // otherwise it is just an upgrade retiring the subscription it replaced.
    if (!otherActive) {
      user.cancelAtPeriodEnd = true
      this.logger.log(
        `Subscription ${subscriptionCode} non-renewing for ${user._id}; access runs to ${user.planCurrentPeriodEnd?.toISOString?.() ?? 'unknown'}`,
      )
    }

    await user.save()
  }

  /**
   * Paystack `subscription.disable`: the subscription is over. Arrives at the
   * next payment date after a cancellation, or with status `complete` once all
   * billing cycles have run.
   *
   * Deliberately does not set planStatus — entitlement is resolved from
   * cancelAtPeriodEnd plus planCurrentPeriodEnd, so a merchant whose period is
   * still running keeps what they paid for.
   */
  async markSubscriptionEnded(
    customerCode: string,
    subscriptionCode?: string,
    status?: string,
  ) {
    const ctx = await this.resolveSubscriptionContext(
      customerCode,
      subscriptionCode,
    )
    if (!ctx) return
    const { user, sub, otherActive } = ctx

    if (sub) {
      sub.status = status === 'complete' ? 'complete' : 'cancelled'
    }

    if (!otherActive) {
      user.cancelAtPeriodEnd = true
    }

    await user.save()
  }

  /**
   * The cadence currently in force. `planInterval` is authoritative because a
   * deferred change can land without creating a PlanOrder; order history is
   * only a fallback for rows written before that field existed.
   */
  private async currentInterval(
    user: UserDocument,
  ): Promise<'monthly' | 'annually'> {
    if (user.planInterval === 'annually') return 'annually'
    if (user.planInterval === 'monthly') return 'monthly'
    return this.lastPaidInterval(user._id as Types.ObjectId)
  }

  /** The billing cycle the merchant last paid for (legacy fallback). */
  private async lastPaidInterval(
    merchantId: Types.ObjectId,
  ): Promise<'monthly' | 'annually'> {
    const order = await this.planOrderModel
      .findOne({ merchantId, paymentStatus: 'SUCCESSFUL' })
      .sort({ createdAt: -1 })
      .select('interval')
      .exec()
    return order?.interval === 'annually' ? 'annually' : 'monthly'
  }

  /**
   * The window a renewal buys.
   *
   * Anchored to the end of the period being renewed, not to when the webhook
   * arrived: a delayed or retried invoice would otherwise push the whole
   * schedule later and hand the merchant free days on every renewal.
   */
  private nextRenewalWindow(
    previousEnd: Date | null,
    months: number,
    now: Date,
  ): { periodStart: Date; periodEnd: Date } {
    const addMonths = (from: Date) => {
      const to = new Date(from)
      to.setMonth(to.getMonth() + months)
      return to
    }

    const periodStart = previousEnd ?? now
    const periodEnd = addMonths(periodStart)

    // A long lapse can leave the old end far enough back that renewing from
    // it still lands in the past. Anchor to now so the merchant actually gets
    // the period they just paid for.
    if (periodEnd.getTime() <= now.getTime()) {
      return { periodStart: now, periodEnd: addMonths(now) }
    }
    return { periodStart, periodEnd }
  }

  /**
   * A renewal invoice succeeded: extend the paid period and clear any lapse.
   *
   * Idempotent by invoice reference. Paystack retries an unacknowledged
   * webhook every 3 minutes for four tries and then hourly for 72 hours, and
   * since the window is anchored to the previous period end, extending per
   * delivery would grant a full free period each time.
   */
  /**
   * Paystack's own `next_payment_date`, when it is usable.
   *
   * Preferred over local month arithmetic: recomputing the window is what
   * corrupted stored periods historically, and `pnpm plans:fix-periods` repairs
   * that damage by reconciling against this very field — so it is better read
   * at ingest than patched afterwards.
   *
   * Validated rather than trusted. Paystack's sibling `period_start`/
   * `period_end` fields are inverted in two of its three published samples, so
   * a value that fails to parse, lies in the past, or precedes the period being
   * renewed is discarded in favour of the local computation.
   */
  private resolveRenewalEnd(
    nextPaymentDate: string | Date | undefined | null,
    previousEnd: Date | null,
    now: Date,
  ): Date | null {
    if (!nextPaymentDate) return null
    const parsed = new Date(nextPaymentDate)
    if (Number.isNaN(parsed.getTime())) return null
    if (parsed.getTime() <= now.getTime()) return null
    if (previousEnd && parsed.getTime() <= previousEnd.getTime()) return null
    return parsed
  }

  async renewPeriod(
    customerCode: string,
    invoiceReference?: string,
    nextPaymentDate?: string | Date | null,
  ) {
    if (!customerCode) return

    const user = await this.userModel
      .findOne({ paystackCustomerCode: customerCode })
      .exec()
    if (!user) return

    const now = new Date()
    const previousEnd = user.planCurrentPeriodEnd
      ? new Date(user.planCurrentPeriodEnd)
      : null

    // Without a reference to dedupe on, fall back to the fact that a renewal
    // is only due once the paid period has actually run out — so a repeat
    // delivery still cannot stack periods.
    const alreadyRenewed = invoiceReference
      ? user.lastRenewalReference === invoiceReference
      : Boolean(previousEnd && previousEnd.getTime() - now.getTime() > DAY_MS)

    if (!alreadyRenewed) {
      // planInterval is authoritative; order history is only a legacy fallback.
      const interval = await this.currentInterval(user)
      const months = interval === 'annually' ? 12 : 1

      const remoteEnd = this.resolveRenewalEnd(nextPaymentDate, previousEnd, now)
      let periodStart: Date
      let periodEnd: Date

      if (remoteEnd) {
        periodEnd = remoteEnd
        // Derive the start from Paystack's end and the cadence — the same rule
        // plans:fix-periods uses to repair damage, and it keeps the window the
        // right length even when a lapse left the previous end far behind.
        periodStart = new Date(remoteEnd)
        periodStart.setMonth(periodStart.getMonth() - months)
      } else {
        ;({ periodStart, periodEnd } = this.nextRenewalWindow(
          previousEnd,
          months,
          now,
        ))
      }

      // The start must move with the end: it is the divisor for proration, so
      // leaving it pinned to the original purchase makes the billing period
      // look longer after every renewal and silently corrupts every quote.
      if (periodEnd.getTime() > (previousEnd?.getTime() ?? 0)) {
        user.planCurrentPeriodStart = periodStart
        user.planCurrentPeriodEnd = periodEnd
      }
      if (invoiceReference) user.lastRenewalReference = invoiceReference
    }

    // Payment is good again: close any grace window and restore status.
    user.planGraceUntil = undefined
    if (user.planStatus === 'failed') {
      // Restore from the tier's own checks, not the badge: a verified LITE
      // merchant has no badge and would otherwise be demoted to 'paid'.
      user.planStatus =
        this.outstandingStep(user, user.planTier || '') === null
          ? 'verified'
          : 'paid'
    }
    await user.save()
    this.reevaluateReferralEligibility(user._id as Types.ObjectId)
  }
}
