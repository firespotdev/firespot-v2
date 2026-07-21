import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'
import { SmileIdService, WEB_PRODUCT_BY_CHECK } from '../services/smileid/smileid.service'
import {
  KycCheck,
  PLANS,
  PlanTier,
  getNextCheck,
} from '../merchant-plans/constants/plans'

/** Checks that must run in the browser (BVN consent screen / selfie capture). */
const CLIENT_SIDE_CHECKS: KycCheck[] = ['bvn', 'liveness']

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private smileIdService: SmileIdService,
  ) {}

  private async getMerchant(merchantId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  private assertPaid(user: UserDocument): PlanTier {
    if (!user.planTier) {
      throw new BadRequestException('No plan purchased')
    }
    if (user.planStatus === 'none') {
      throw new BadRequestException('Plan payment not completed')
    }
    return user.planTier as PlanTier
  }

  /**
   * Current verification state plus `nextCheck` — the first required check that
   * hasn't passed. This is what makes verification resumable: all state lives
   * server-side, so a merchant can drop off and pick up on any device.
   */
  async getStatus(merchantId: string) {
    const user = await this.getMerchant(merchantId)
    const tier = user.planTier as PlanTier | undefined
    const kyc = (user.kyc || {}) as Record<string, { status?: string }>

    const requiredChecks = tier ? PLANS[tier].requiredChecks : []
    const nextCheck = tier ? getNextCheck(tier, kyc) : null

    return {
      planTier: user.planTier || null,
      planStatus: user.planStatus || 'none',
      verificationLevel: user.verificationLevel || null,
      requiredChecks,
      checks: requiredChecks.reduce(
        (acc, check) => ({
          ...acc,
          [check]: {
            status: kyc[check]?.status || 'pending',
            checkedAt: (kyc[check] as any)?.checkedAt || null,
          },
        }),
        {} as Record<string, { status: string; checkedAt: Date | null }>,
      ),
      nextCheck,
      isComplete: Boolean(tier) && nextCheck === null,
      // Tells the client whether to open the Web SDK or call a server check
      nextCheckMode: nextCheck
        ? CLIENT_SIDE_CHECKS.includes(nextCheck)
          ? 'web_sdk'
          : 'server'
        : null,
    }
  }

  /**
   * Mints a SmileID Web SDK session for the merchant's next client-side check.
   * Scoped to `nextCheck` only, so a resumed flow never redoes passed steps.
   */
  async createSession(merchantId: string) {
    const user = await this.getMerchant(merchantId)
    const tier = this.assertPaid(user)

    const nextCheck = getNextCheck(tier, (user.kyc || {}) as any)
    if (!nextCheck) {
      throw new BadRequestException('Verification already complete')
    }
    if (!CLIENT_SIDE_CHECKS.includes(nextCheck)) {
      throw new BadRequestException(
        `Check "${nextCheck}" runs server-side; call its endpoint instead`,
      )
    }

    const jobId = this.smileIdService.buildJobId(merchantId, nextCheck)
    const product = WEB_PRODUCT_BY_CHECK[nextCheck] || 'ekyc_smartselfie'

    const { token } = await this.smileIdService.getWebToken({
      userId: merchantId,
      jobId,
      product,
    })

    await this.recordCheck(merchantId, nextCheck, 'pending', jobId)

    return {
      token,
      jobId,
      check: nextCheck,
      product,
      userId: merchantId,
      ...this.smileIdService.getPartnerDetails(),
    }
  }

  /** Server-side NIN verification (Enhanced KYC). */
  async verifyNin(
    merchantId: string,
    dto: { idNumber: string; firstName?: string; lastName?: string; dob?: string },
  ) {
    const user = await this.getMerchant(merchantId)
    const tier = this.assertPaid(user)
    if (!PLANS[tier].requiredChecks.includes('nin')) {
      throw new BadRequestException('NIN is not required for this plan')
    }

    const jobId = this.smileIdService.buildJobId(merchantId, 'nin')
    try {
      const result = await this.smileIdService.verifyNin({
        userId: merchantId,
        jobId,
        ...dto,
      })
      const passed = this.smileIdService.isSuccessfulResult(result)
      await this.recordCheck(merchantId, 'nin', passed ? 'passed' : 'failed', jobId)
      if (passed) await this.finalizeIfComplete(merchantId)
      return { check: 'nin', passed }
    } catch (error) {
      this.logger.error(`NIN verification failed: ${error}`)
      await this.recordCheck(merchantId, 'nin', 'failed', jobId)
      throw new BadRequestException('Could not verify NIN')
    }
  }

  /** Server-side CAC / business verification (KYB, async → callback). */
  async verifyCac(
    merchantId: string,
    dto: { rcNumber: string; businessType?: string },
  ) {
    const user = await this.getMerchant(merchantId)
    const tier = this.assertPaid(user)
    if (!PLANS[tier].requiredChecks.includes('cac')) {
      throw new BadRequestException('CAC is not required for this plan')
    }

    const jobId = this.smileIdService.buildJobId(merchantId, 'cac')
    try {
      await this.smileIdService.verifyBusinessCac({
        userId: merchantId,
        jobId,
        ...dto,
      })
      await this.recordCheck(merchantId, 'cac', 'pending', jobId)
      return { check: 'cac', status: 'pending' }
    } catch (error) {
      this.logger.error(`CAC verification failed: ${error}`)
      await this.recordCheck(merchantId, 'cac', 'failed', jobId)
      throw new BadRequestException('Could not verify CAC registration')
    }
  }

  /**
   * Inbound SmileID callback. The job id encodes which check it belongs to and
   * the user id is our merchant id, so we can attribute the result.
   */
  async handleCallback(payload: any) {
    const partnerParams = payload?.PartnerParams || payload?.partner_params || {}
    const merchantId = String(partnerParams.user_id || '')
    const jobId = String(partnerParams.job_id || '')

    if (!merchantId || !jobId) {
      this.logger.warn('SmileID callback missing partner params')
      return { received: true }
    }

    const check = jobId.split('-')[0] as KycCheck
    if (!['bvn', 'nin', 'liveness', 'cac'].includes(check)) {
      this.logger.warn(`SmileID callback with unknown check: ${jobId}`)
      return { received: true }
    }

    const passed = this.smileIdService.isSuccessfulResult(payload)
    await this.recordCheck(merchantId, check, passed ? 'passed' : 'failed', jobId)

    // A successful BVN job via the SmartSelfie product also satisfies liveness.
    if (passed && check === 'bvn' && payload?.Actions?.Liveness_Check) {
      if (/passed|provisional/i.test(payload.Actions.Liveness_Check)) {
        await this.recordCheck(merchantId, 'liveness', 'passed', jobId)
      }
    }

    if (passed) await this.finalizeIfComplete(merchantId)

    return { received: true }
  }

  /** Persists a single check's outcome. */
  private async recordCheck(
    merchantId: string,
    check: KycCheck,
    status: 'pending' | 'passed' | 'failed',
    jobId?: string,
  ) {
    const set: Record<string, unknown> = {
      [`kyc.${check}.status`]: status,
      [`kyc.${check}.checkedAt`]: new Date(),
    }
    if (jobId) set[`kyc.${check}.jobId`] = jobId

    await this.userModel
      .updateOne(
        { _id: merchantId },
        { $set: set, $inc: { [`kyc.${check}.attempts`]: 1 } },
      )
      .exec()

    if (status === 'pending') return

    // Reflect in-progress verification on the plan status.
    await this.userModel
      .updateOne(
        { _id: merchantId, planStatus: { $in: ['paid', 'failed'] } },
        { $set: { planStatus: 'verifying' } },
      )
      .exec()
  }

  /**
   * When every required check for the paid tier has passed, grant the badge.
   * LITE has no badge, so verificationLevel stays null there.
   */
  private async finalizeIfComplete(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user?.planTier) return

    const tier = user.planTier as PlanTier
    const nextCheck = getNextCheck(tier, (user.kyc || {}) as any)
    if (nextCheck !== null) return

    user.planStatus = 'verified'
    const badge = PLANS[tier].badge
    if (badge) user.verificationLevel = badge
    await user.save()

    this.logger.log(`Merchant ${merchantId} fully verified on ${tier}`)
  }

  /**
   * Reconciliation fallback for a missed callback: re-poll SmileID for a
   * check that is still pending and apply the result.
   */
  async reconcile(merchantId: string, check: KycCheck) {
    const user = await this.getMerchant(merchantId)
    const jobId = (user.kyc as any)?.[check]?.jobId
    if (!jobId) throw new BadRequestException('No job to reconcile')

    const status = await this.smileIdService.getJobStatus(merchantId, jobId)
    const passed = this.smileIdService.isSuccessfulResult(status)
    await this.recordCheck(merchantId, check, passed ? 'passed' : 'failed', jobId)
    if (passed) await this.finalizeIfComplete(merchantId)
    return { check, passed }
  }
}
