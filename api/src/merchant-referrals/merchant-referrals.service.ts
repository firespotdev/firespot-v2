import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { randomInt } from 'crypto'
import { Model, Types } from 'mongoose'
import { Agent, AgentDocument } from '../admin/schemas/agent.schema'
import { PLANS, PlanTier, isLapsed } from '../merchant-plans/constants/plans'
import {
  MerchantReferral,
  MerchantReferralDocument,
} from '../schemas/merchant-referral.schema'
import {
  MerchantRewardLedger,
  MerchantRewardLedgerDocument,
} from '../schemas/merchant-reward-ledger.schema'
import { Sale, SaleDocument } from '../schemas/sale.schema'
import { User, UserDocument } from '../schemas/user.schema'

const REFERRAL_THRESHOLD_NAIRA = 50_000
const REFERRAL_POLICY_KEY = 'merchant-referral-v1-50k'
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCodeSuffix(): string {
  let suffix = ''
  for (let index = 0; index < 6; index += 1) {
    suffix += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)]
  }
  return suffix
}

export type ReferralEligibilityReason =
  'not_a_merchant' | 'no_active_plan' | 'not_verified' | 'plan_lapsed' | null

@Injectable()
export class MerchantReferralsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(MerchantReferral.name)
    private referralModel: Model<MerchantReferralDocument>,
    @InjectModel(MerchantRewardLedger.name)
    private ledgerModel: Model<MerchantRewardLedgerDocument>,
    private configService: ConfigService,
  ) {}

  private rewardAmount(): number {
    const configured = Number(
      this.configService.get('MERCHANT_REFERRAL_REWARD_NAIRA', 0),
    )
    return Number.isFinite(configured) && configured >= 0 ? configured : 0
  }

  private eligibility(user?: UserDocument | null): {
    eligible: boolean
    reason: ReferralEligibilityReason
  } {
    if (!user || user.role !== 'merchant') {
      return { eligible: false, reason: 'not_a_merchant' }
    }
    if (!user.planTier || !PLANS[user.planTier as PlanTier]) {
      return { eligible: false, reason: 'no_active_plan' }
    }
    if (user.planStatus !== 'verified') {
      return { eligible: false, reason: 'not_verified' }
    }
    if (isLapsed(user)) {
      return { eligible: false, reason: 'plan_lapsed' }
    }

    const plan = PLANS[user.planTier as PlanTier]
    if (plan.billingType === 'monthly') {
      const periodEnd = user.planCurrentPeriodEnd
        ? new Date(user.planCurrentPeriodEnd).getTime()
        : 0
      if (!periodEnd || periodEnd <= Date.now()) {
        return { eligible: false, reason: 'no_active_plan' }
      }
    }

    return { eligible: true, reason: null }
  }

  async ensureMerchantCode(
    merchantId: string | Types.ObjectId,
  ): Promise<string> {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) throw new NotFoundException('User not found')
    if (user.merchantReferralCode) return user.merchantReferralCode
    if (user.role !== 'merchant') {
      throw new BadRequestException('Only merchants have referral codes')
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = `FSM-${generateCodeSuffix()}`
      let claimed: UserDocument | null = null
      try {
        claimed = await this.userModel
          .findOneAndUpdate(
            {
              _id: user._id,
              $or: [
                { merchantReferralCode: { $exists: false } },
                { merchantReferralCode: null },
                { merchantReferralCode: '' },
              ],
            },
            { $set: { merchantReferralCode: code } },
            { new: true },
          )
          .exec()
      } catch (error: any) {
        // Another merchant claimed the generated code between generation and
        // persistence. The unique index is authoritative; generate again.
        if (error?.code === 11000) continue
        throw error
      }
      if (claimed?.merchantReferralCode) return claimed.merchantReferralCode

      const current = await this.userModel.findById(user._id).exec()
      if (current?.merchantReferralCode) return current.merchantReferralCode
    }

    throw new BadRequestException('Could not generate a referral code')
  }

  /**
   * Resolves both referral channels during merchant onboarding.
   *
   * The legacy referralCode remains the agent-code input. An FSM-prefixed
   * value is treated as a merchant code. When both a valid agent code and an
   * mref link are present, the agent always wins.
   */
  async validateOnboardingAttribution(
    input: {
      referralCode?: string
      merchantReferralCode?: string
    },
    referredMerchantId?: string | Types.ObjectId,
  ): Promise<
    | { source: 'agent'; agent: AgentDocument }
    | {
        source: 'merchant'
        referrer: UserDocument
        merchantCode: string
      }
    | { source: 'none' }
  > {
    const enteredCode = input.referralCode?.trim().toUpperCase()
    const enteredMerchantCode = enteredCode?.startsWith('FSM-')
      ? enteredCode
      : undefined
    const agentCode =
      enteredCode && !enteredCode.startsWith('FSM-') ? enteredCode : undefined
    const merchantCode =
      enteredMerchantCode || input.merchantReferralCode?.trim().toUpperCase()

    if (agentCode) {
      const agent = await this.agentModel
        .findOne({ referralCode: agentCode, status: 'active' })
        .exec()
      if (!agent) throw new BadRequestException('Invalid referral code')
      return { source: 'agent', agent }
    }

    if (!merchantCode) return { source: 'none' }

    const referrer = await this.userModel
      .findOne({
        merchantReferralCode: merchantCode,
        role: 'merchant',
      })
      .exec()
    if (!referrer) {
      throw new BadRequestException('Invalid merchant referral code')
    }
    if (
      referredMerchantId &&
      referrer._id.toString() === referredMerchantId.toString()
    ) {
      throw new BadRequestException('You cannot refer yourself')
    }
    return { source: 'merchant', referrer, merchantCode }
  }

  async applyOnboardingAttribution(
    referredMerchantId: string | Types.ObjectId,
    input: {
      referralCode?: string
      merchantReferralCode?: string
    },
  ) {
    const referred = await this.userModel.findById(referredMerchantId).exec()
    if (!referred) throw new NotFoundException('User not found')
    const attribution = await this.validateOnboardingAttribution(
      input,
      referred._id as Types.ObjectId,
    )

    if (attribution.source === 'agent') {
      referred.referredByAgent = attribution.agent._id as Types.ObjectId
      referred.referredByMerchant = undefined
      referred.referralSource = 'agent'
      await referred.save()
      await this.ensureMerchantCode(referred._id as Types.ObjectId)
      return { source: 'agent' as const }
    }

    if (attribution.source === 'none') {
      await this.ensureMerchantCode(referred._id as Types.ObjectId)
      return { source: null }
    }

    const { referrer, merchantCode } = attribution

    referred.referredByMerchant = referrer._id as Types.ObjectId
    referred.referredByAgent = undefined
    referred.referralSource = 'merchant'
    await referred.save()

    await this.referralModel
      .findOneAndUpdate(
        { referredMerchantId: referred._id },
        {
          $setOnInsert: {
            referrerMerchantId: referrer._id,
            referredMerchantId: referred._id,
            referralCode: merchantCode,
            status: 'ATTRIBUTED',
            qualifiedVolume: 0,
            thresholdAmount: REFERRAL_THRESHOLD_NAIRA,
            attributedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec()

    await this.ensureMerchantCode(referred._id as Types.ObjectId)
    return { source: 'merchant' as const }
  }

  private async collectedVolume(merchantId: Types.ObjectId): Promise<number> {
    const [summary] = await this.saleModel
      .aggregate([
        {
          $match: {
            merchantId,
            isCollection: true,
            status: { $in: ['CONFIRMED', 'OUTSTANDING'] },
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: {
                $let: {
                  vars: {
                    repaymentTotal: {
                      $sum: { $ifNull: ['$repayments.amount', []] },
                    },
                  },
                  in: {
                    // Repayment rows are the immutable payment events. Prefer
                    // them so editing a sale's display amount cannot create
                    // referral volume. The fallback covers legacy sales.
                    $cond: [
                      { $gt: ['$$repaymentTotal', 0] },
                      '$$repaymentTotal',
                      {
                        $cond: [
                          { $eq: ['$status', 'OUTSTANDING'] },
                          { $ifNull: ['$amountPaid', 0] },
                          {
                            $ifNull: [
                              '$amountPaid',
                              { $ifNull: ['$amount', 0] },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ])
      .exec()

    return Math.max(0, Number(summary?.amount || 0))
  }

  private async createLedgerEntry(
    referral: MerchantReferralDocument,
    referrer: UserDocument,
  ) {
    const eligibility = this.eligibility(referrer)
    if (!eligibility.eligible) {
      await this.referralModel
        .updateOne(
          { _id: referral._id, status: { $ne: 'LEDGERED' } },
          { $set: { status: 'ELIGIBILITY_PENDING' } },
        )
        .exec()
      return null
    }

    let ledger: MerchantRewardLedgerDocument | null = null
    try {
      ledger = await this.ledgerModel
        .findOneAndUpdate(
          { referralId: referral._id },
          {
            $setOnInsert: {
              merchantId: referrer._id,
              referralId: referral._id,
              type: 'MERCHANT_REFERRAL',
              amount: this.rewardAmount(),
              currency: 'NGN',
              status: 'EARNED',
              policyKey: REFERRAL_POLICY_KEY,
              description: `Merchant referral reached NGN ${REFERRAL_THRESHOLD_NAIRA.toLocaleString()} in confirmed collections`,
              earnedAt: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec()
    } catch (error: any) {
      // Concurrent qualifying payments can race the upsert. The unique
      // referralId is the idempotency key, so reuse the row that won.
      if (error?.code !== 11000) throw error
      ledger = await this.ledgerModel
        .findOne({ referralId: referral._id })
        .exec()
    }
    if (!ledger) return null

    await this.referralModel
      .updateOne(
        { _id: referral._id },
        {
          $set: {
            status: 'LEDGERED',
            rewardEligibleAt: ledger.earnedAt,
            ledgerEntryId: ledger._id,
          },
        },
      )
      .exec()

    return ledger
  }

  async evaluateReferredMerchant(referredMerchantId: string | Types.ObjectId) {
    const referredObjectId = new Types.ObjectId(referredMerchantId.toString())
    const referral = await this.referralModel
      .findOne({ referredMerchantId: referredObjectId })
      .exec()
    if (!referral || referral.status === 'LEDGERED') return null

    const volume = await this.collectedVolume(referredObjectId)
    const qualified = volume >= referral.thresholdAmount
    await this.referralModel
      .updateOne(
        { _id: referral._id },
        {
          $set: {
            qualifiedVolume: volume,
            ...(qualified && !referral.volumeQualifiedAt
              ? {
                  status: 'VOLUME_QUALIFIED',
                  volumeQualifiedAt: new Date(),
                }
              : {}),
          },
        },
      )
      .exec()

    if (!qualified) return { qualified: false, volume }

    const refreshed = await this.referralModel.findById(referral._id).exec()
    const referrer = await this.userModel
      .findById(referral.referrerMerchantId)
      .exec()
    if (!refreshed || !referrer) return null

    const ledger = await this.createLedgerEntry(refreshed, referrer)
    return { qualified: true, volume, ledgered: Boolean(ledger) }
  }

  async reevaluateReferrer(
    referrerMerchantId: string | Types.ObjectId,
  ): Promise<number> {
    const referrer = await this.userModel.findById(referrerMerchantId).exec()
    if (!this.eligibility(referrer).eligible || !referrer) return 0

    const referrals = await this.referralModel
      .find({
        referrerMerchantId: referrer._id,
        status: { $ne: 'LEDGERED' },
      })
      .exec()

    let ledgered = 0
    for (const referral of referrals) {
      const result = await this.evaluateReferredMerchant(
        referral.referredMerchantId,
      )
      if (result?.ledgered) ledgered += 1
    }
    return ledgered
  }

  async getSummary(merchantId: string) {
    const code = await this.ensureMerchantCode(merchantId)
    await this.reevaluateReferrer(merchantId)

    const merchant = await this.userModel.findById(merchantId).exec()
    if (!merchant) throw new NotFoundException('User not found')
    const eligibility = this.eligibility(merchant)

    const [statusCounts, ledgerEntries] = await Promise.all([
      this.referralModel
        .aggregate([
          { $match: { referrerMerchantId: merchant._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.ledgerModel
        .find({ merchantId: merchant._id })
        .sort({ earnedAt: -1 })
        .lean()
        .exec(),
    ])

    const referrals = Object.fromEntries(
      statusCounts.map((item) => [item._id, item.count]),
    )
    return {
      referralCode: code,
      eligible: eligibility.eligible,
      eligibilityReason: eligibility.reason,
      thresholdAmount: REFERRAL_THRESHOLD_NAIRA,
      rewardAmount: this.rewardAmount(),
      referralCounts: {
        attributed: referrals.ATTRIBUTED || 0,
        volumeQualified: referrals.VOLUME_QUALIFIED || 0,
        eligibilityPending: referrals.ELIGIBILITY_PENDING || 0,
        ledgered: referrals.LEDGERED || 0,
        disqualified: referrals.DISQUALIFIED || 0,
      },
      totalEarned: ledgerEntries.reduce(
        (total, entry) => total + Number(entry.amount || 0),
        0,
      ),
      ledger: ledgerEntries,
    }
  }
}
