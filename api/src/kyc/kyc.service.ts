import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'
import {
  SmileIdService,
  buildWebCheckConfig,
} from '../services/smileid/smileid.service'
import {
  KycCheck,
  KycStepDef,
  PLANS,
  PlanTier,
  getNextStep,
  isStepSatisfied,
} from '../merchant-plans/constants/plans'
import { MerchantReferralsService } from '../merchant-referrals/merchant-referrals.service'

/**
 * Identity products run in the browser via SmileID's hosted flow: they need
 * the consent screen (and a camera for biometric), and routing them through
 * the widget means we never handle raw government ID numbers ourselves.
 * Only KYB (a public business-registry lookup) is server-side.
 */
function isClientSideStep(step: KycStepDef): boolean {
  return step.product !== 'kyb'
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private smileIdService: SmileIdService,
    private merchantReferralsService: MerchantReferralsService,
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
    let user = await this.getMerchant(merchantId)

    // Self-heal: SmileID's callback may never arrive (unreachable host in local
    // dev, transient failure in production), so poll any still-pending check
    // that has a submitted job before reporting status.
    if (await this.reconcilePendingChecks(user)) {
      user = await this.getMerchant(merchantId)
    }

    const tier = user.planTier as PlanTier | undefined
    const kyc = (user.kyc || {}) as Record<string, any>

    const requiredSteps = tier ? PLANS[tier].requiredSteps : []
    const nextStep = tier ? getNextStep(tier, kyc) : null

    // Display model: one row per step the merchant actually performs. A step
    // proven by a weaker product than this tier needs reads as pending, not
    // passed — so we never claim a check is done while still asking for it.
    const steps = requiredSteps.map((step) => {
      const state = kyc[step.key]
      const satisfied = isStepSatisfied(step, state)
      return {
        key: step.key,
        label: step.label,
        product: step.product,
        requiresSelfie: step.product === 'biometric_kyc',
        status: satisfied
          ? 'passed'
          : state?.status === 'failed'
            ? 'failed'
            : 'pending',
        // `pending` also describes an untouched requirement. Expose whether
        // this row has actually been submitted and is awaiting SmileID/CAC.
        isVerifying:
          !satisfied &&
          state?.status === 'pending' &&
          !!state?.jobId &&
          (!!state?.submittedAt || !isClientSideStep(step)),
        // A hosted session was created but never submitted. The merchant can
        // restart this one check without losing any checks that already passed.
        isResumable:
          !satisfied &&
          isClientSideStep(step) &&
          state?.status === 'pending' &&
          !!state?.jobId &&
          !state?.submittedAt,
        checkedAt: state?.checkedAt || null,
        reason: state?.reason || null,
      }
    })

    return {
      planTier: user.planTier || null,
      planStatus: user.planStatus || 'none',
      verificationLevel: user.verificationLevel || null,
      steps,
      nextStep: nextStep
        ? {
            key: nextStep.key,
            label: nextStep.label,
            product: nextStep.product,
            requiresSelfie: nextStep.product === 'biometric_kyc',
          }
        : null,
      isComplete: Boolean(tier) && nextStep === null,
      // Tells the client whether to open the Web SDK or use a server form
      nextStepMode: nextStep
        ? isClientSideStep(nextStep)
          ? 'web_sdk'
          : 'server'
        : null,
    }
  }

  /**
   * Polls SmileID for any required check that is still "pending" but already
   * has a submitted job, and applies the outcome.
   *
   * This is the fallback path when the callback doesn't reach us — which is the
   * normal case in local development, since SmileID cannot POST to localhost.
   * Returns true when at least one check changed.
   */
  private async reconcilePendingChecks(user: UserDocument): Promise<boolean> {
    const tier = user.planTier as PlanTier | undefined
    if (!tier) return false

    const kyc = (user.kyc || {}) as Record<string, any>
    const merchantId = user._id.toString()
    let changed = false

    for (const step of PLANS[tier].requiredSteps) {
      const check = step.key
      const state = kyc[check]
      if (!state?.jobId || state.status === 'passed') continue

      // Give the job a moment to land before polling it.
      const checkedAt = state.checkedAt
        ? new Date(state.checkedAt).getTime()
        : 0
      if (Date.now() - checkedAt < 5000) continue

      try {
        // Must poll under the exact SmileID user the job ran as. Records
        // written before ids were stored fall back to the old stable form.
        const result = await this.smileIdService.getJobStatus(
          state.smileUserId || `${merchantId}-${check}`,
          state.jobId,
        )
        // null → the user hasn't submitted the flow yet (no job exists). It is
        // intentionally left restartable rather than presented as processing.
        if (!result) continue

        // SmileID knows the job, so it was submitted even if the browser's
        // success notification never reached this API.
        if (result.job_complete === false) {
          if (!state.submittedAt) {
            await this.markSubmittedCheck(merchantId, check, state.jobId)
            changed = true
          }
          continue
        }

        // Human-review/provisional results are progress updates. SmileID sends
        // a later callback with the final verdict, so keep the loader visible.
        if (this.smileIdService.isPendingResult(result, step.product)) {
          if (!state.submittedAt) {
            await this.markSubmittedCheck(merchantId, check, state.jobId)
            changed = true
          }
          continue
        }

        const passed = this.smileIdService.isSuccessfulResult(
          result,
          step.product,
        )
        if (!passed && state.status === 'failed') continue

        const recorded = await this.recordCheck(
          merchantId,
          check,
          passed ? 'passed' : 'failed',
          state.jobId,
          passed ? undefined : this.smileIdService.describeResult(result),
          step.product,
          undefined,
          state.jobId,
        )
        if (recorded) changed = true
      } catch (err) {
        this.logger.warn(
          `Could not reconcile ${check} for ${merchantId}: ${err}`,
        )
      }
    }

    if (changed) await this.finalizeIfComplete(merchantId)
    return changed
  }

  /**
   * Mints a SmileID Web SDK session for the merchant's next step. Scoped to
   * that step only, so a resumed flow never redoes satisfied ones.
   */
  async createSession(merchantId: string) {
    const user = await this.getMerchant(merchantId)
    const tier = this.assertPaid(user)

    const step = getNextStep(tier, (user.kyc || {}) as any)
    if (!step) {
      throw new BadRequestException('Verification already complete')
    }
    if (!isClientSideStep(step)) {
      throw new BadRequestException(
        `Step "${step.key}" runs server-side; call its endpoint instead`,
      )
    }

    const currentState = ((user.kyc || {}) as Record<string, any>)[step.key]
    if (
      currentState?.status === 'pending' &&
      currentState?.jobId &&
      currentState?.submittedAt
    ) {
      throw new BadRequestException('Verification is still being processed')
    }

    const jobId = this.smileIdService.buildJobId(merchantId, step.key)
    const { product, idSelection, consentRequired } = buildWebCheckConfig(step)

    // Namespaced by product (and generation) so a biometric enrollment can
    // never collide with a later enhanced job for the same check. Stored below
    // so job polling uses this exact id.
    const smileUserId = this.smileIdService.buildUserId(
      merchantId,
      step.key,
      step.product,
      user.kycGeneration,
    )

    let token: string
    try {
      ;({ token } = await this.smileIdService.getWebToken({
        userId: smileUserId,
        jobId,
        product,
      }))
    } catch (error) {
      // Surface SmileID's actual complaint rather than a bare 500.
      this.logger.error(
        `Could not create ${step.key} session for ${merchantId}: ${error}`,
      )
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not start verification',
      )
    }

    await this.recordCheck(
      merchantId,
      step.key,
      'pending',
      jobId,
      undefined,
      step.product,
      smileUserId,
    )

    return {
      token,
      jobId,
      check: step.key,
      label: step.label,
      product,
      requiresSelfie: step.product === 'biometric_kyc',
      userId: smileUserId,
      // Country + ID type are pinned, so SmileID shows no pickers — the user
      // lands straight on the consent/entry screen for this ID.
      idSelection,
      consentRequired,
      ...this.smileIdService.getPartnerDetails(),
    }
  }

  /**
   * The Web SDK has accepted the hosted flow. Only now does the check become
   * "verifying"; minting a token alone is not evidence of a submitted job.
   */
  async markSessionSubmitted(merchantId: string, jobId: string) {
    const user = await this.getMerchant(merchantId)
    const kyc = (user.kyc || {}) as Record<string, any>
    const check = (['bvn', 'nin'] as KycCheck[]).find(
      (key) => kyc[key]?.jobId === jobId,
    )

    if (!check) {
      throw new BadRequestException('Verification session is no longer active')
    }

    if (kyc[check]?.status !== 'pending') {
      return { check, status: kyc[check]?.status }
    }

    const marked = await this.markSubmittedCheck(merchantId, check, jobId)
    if (!marked) {
      throw new BadRequestException('Verification session is no longer active')
    }

    return { check, status: 'pending' as const }
  }

  private async markSubmittedCheck(
    merchantId: string,
    check: KycCheck,
    jobId: string,
  ): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          _id: merchantId,
          [`kyc.${check}.jobId`]: jobId,
          [`kyc.${check}.status`]: { $in: ['pending', 'failed'] },
        },
        {
          $set: {
            [`kyc.${check}.status`]: 'pending',
            [`kyc.${check}.submittedAt`]: new Date(),
            [`kyc.${check}.reason`]: null,
          },
        },
      )
      .exec()

    if (result.matchedCount > 0) {
      await this.userModel
        .updateOne(
          { _id: merchantId, planStatus: 'paid' },
          { $set: { planStatus: 'verifying' } },
        )
        .exec()
    }

    return result.matchedCount > 0
  }

  /** Server-side CAC / business verification (KYB, async → callback). */
  async verifyCac(
    merchantId: string,
    dto: { rcNumber: string; businessType?: string },
  ) {
    const user = await this.getMerchant(merchantId)
    const tier = this.assertPaid(user)
    const cacStep = PLANS[tier].requiredSteps.find((s) => s.key === 'cac')
    if (!cacStep) {
      throw new BadRequestException('CAC is not required for this plan')
    }

    const jobId = this.smileIdService.buildJobId(merchantId, 'cac')
    const smileUserId = this.smileIdService.buildUserId(
      merchantId,
      'cac',
      cacStep.product,
      user.kycGeneration,
    )
    try {
      await this.smileIdService.verifyBusinessCac({
        userId: smileUserId,
        jobId,
        ...dto,
      })
      await this.recordCheck(
        merchantId,
        'cac',
        'pending',
        jobId,
        undefined,
        cacStep.product,
        smileUserId,
        undefined,
        true,
      )
      return { check: 'cac', status: 'pending' }
    } catch (error) {
      this.logger.error(`CAC verification failed: ${error}`)
      await this.recordCheck(
        merchantId,
        'cac',
        'failed',
        jobId,
        'Could not submit your business registration for verification.',
        cacStep.product,
      )
      throw new BadRequestException('Could not verify CAC registration')
    }
  }

  /**
   * Inbound SmileID callback. The job id encodes which check it belongs to and
   * the user id carries our merchant id as its first segment.
   */
  async handleCallback(payload: any) {
    const partnerParams =
      payload?.PartnerParams || payload?.partner_params || {}
    const merchantId = SmileIdService.parseMerchantId(partnerParams.user_id)
    const jobId = String(partnerParams.job_id || '')

    if (!merchantId || !jobId) {
      this.logger.warn('SmileID callback missing partner params')
      return { received: true }
    }

    const check = jobId.split('-')[0] as KycCheck
    if (!['bvn', 'nin', 'cac'].includes(check)) {
      this.logger.warn(`SmileID callback with unknown check: ${jobId}`)
      return { received: true }
    }

    // Attribute the result to the product this tier asked for, so a biometric
    // pass is recorded as biometric (and satisfies weaker tiers later).
    const user = await this.getMerchant(merchantId)
    const state = ((user.kyc || {}) as Record<string, any>)[check]

    // A merchant may restart an abandoned hosted session. A late result from
    // that superseded job must never overwrite the newer active attempt.
    if (!state?.jobId || state.jobId !== jobId) {
      this.logger.warn(`Ignoring stale SmileID callback for job ${jobId}`)
      return { received: true, stale: true }
    }

    const tier = user.planTier as PlanTier | undefined
    const product =
      state.product ||
      (tier
        ? PLANS[tier].requiredSteps.find((s) => s.key === check)?.product
        : undefined)

    if (this.smileIdService.isPendingResult(payload, product)) {
      await this.markSubmittedCheck(merchantId, check, jobId)
      return { received: true, pending: true }
    }

    const passed = this.smileIdService.isSuccessfulResult(payload, product)
    const recorded = await this.recordCheck(
      merchantId,
      check,
      passed ? 'passed' : 'failed',
      jobId,
      passed ? undefined : this.smileIdService.describeResult(payload),
      product,
      undefined,
      jobId,
    )

    if (recorded && passed) await this.finalizeIfComplete(merchantId)

    return { received: true }
  }

  /** Persists a single check's outcome. */
  private async recordCheck(
    merchantId: string,
    check: KycCheck,
    status: 'pending' | 'passed' | 'failed',
    jobId?: string,
    reason?: string,
    product?: string,
    smileUserId?: string,
    expectedJobId?: string,
    submitted = false,
  ): Promise<boolean> {
    const set: Record<string, unknown> = {
      [`kyc.${check}.status`]: status,
      [`kyc.${check}.checkedAt`]: new Date(),
      // Clear any stale reason when a check passes or is retried.
      [`kyc.${check}.reason`]: status === 'failed' ? reason || null : null,
    }
    if (jobId) set[`kyc.${check}.jobId`] = jobId
    // The SmileID identity this job ran under — polling must reuse it.
    if (smileUserId) set[`kyc.${check}.smileUserId`] = smileUserId
    // Records which product proved this check, so a stronger tier can tell
    // that an older, weaker pass no longer satisfies its requirement.
    if (product) set[`kyc.${check}.product`] = product

    const filter: Record<string, unknown> = { _id: merchantId }
    if (expectedJobId) {
      filter[`kyc.${check}.jobId`] = expectedJobId
    }

    const update: Record<string, unknown> = {
      $set: set,
      $inc: { [`kyc.${check}.attempts`]: 1 },
    }
    if (status === 'pending') {
      if (submitted) {
        set[`kyc.${check}.submittedAt`] = new Date()
      } else {
        update.$unset = { [`kyc.${check}.submittedAt`]: 1 }
      }
    }

    const result = await this.userModel.updateOne(filter, update).exec()

    if (result.matchedCount === 0) return false
    if (status === 'pending') return true

    // Reflect in-progress verification on the plan status.
    await this.userModel
      .updateOne(
        { _id: merchantId, planStatus: { $in: ['paid', 'failed'] } },
        { $set: { planStatus: 'verifying' } },
      )
      .exec()

    return true
  }

  /**
   * When every required step for the paid tier is satisfied, grant the badge.
   * LITE has no badge, so verificationLevel stays null there.
   */
  private async finalizeIfComplete(merchantId: string) {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user?.planTier) return

    const tier = user.planTier as PlanTier
    const nextStep = getNextStep(tier, (user.kyc || {}) as any)
    if (nextStep !== null) return

    user.planStatus = 'verified'
    // Durable marker: survives a later lapse, and is what gates collecting.
    if (!user.kycCompletedAt) user.kycCompletedAt = new Date()
    const badge = PLANS[tier].badge
    if (badge) user.verificationLevel = badge
    await user.save()
    void this.merchantReferralsService
      .reevaluateReferrer(merchantId)
      .catch((error) =>
        this.logger.error(
          `Could not re-evaluate referral rewards for ${merchantId}`,
          error,
        ),
      )

    this.logger.log(`Merchant ${merchantId} fully verified on ${tier}`)
  }

  /**
   * Reconciliation fallback for a missed callback: re-poll SmileID for a
   * check that is still pending and apply the result.
   */
  async reconcile(merchantId: string, check: KycCheck) {
    const user = await this.getMerchant(merchantId)
    const state = (user.kyc as any)?.[check]
    const jobId = state?.jobId
    if (!jobId) throw new BadRequestException('No job to reconcile')

    // Poll under the id the job actually ran as (legacy records fall back).
    const status = await this.smileIdService.getJobStatus(
      state?.smileUserId || `${merchantId}-${check}`,
      jobId,
    )

    const tier = user.planTier as PlanTier | undefined
    const product =
      state?.product ||
      (tier
        ? PLANS[tier].requiredSteps.find((s) => s.key === check)?.product
        : undefined)

    // No job on SmileID's side yet — the hosted flow was abandoned before
    // submission. It remains restartable rather than becoming an endless load.
    if (!status) {
      return { check, passed: false, status: 'pending' as const }
    }

    if (status.job_complete === false) {
      await this.markSubmittedCheck(merchantId, check, jobId)
      return { check, passed: false, status: 'pending' as const }
    }

    if (this.smileIdService.isPendingResult(status, product)) {
      await this.markSubmittedCheck(merchantId, check, jobId)
      return { check, passed: false, status: 'pending' as const }
    }

    const passed = this.smileIdService.isSuccessfulResult(status, product)
    const reason = passed
      ? undefined
      : this.smileIdService.describeResult(status)

    const recorded = await this.recordCheck(
      merchantId,
      check,
      passed ? 'passed' : 'failed',
      jobId,
      reason,
      product,
      undefined,
      jobId,
    )
    if (recorded && passed) await this.finalizeIfComplete(merchantId)
    return { check, passed, status: passed ? 'passed' : 'failed', reason }
  }
}
