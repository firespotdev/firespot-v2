import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IDApi, Signature, WebApi, JOB_TYPE } from 'smile-identity-core'
import type { KycCheck, KycStepDef } from '../../merchant-plans/constants/plans'

/** Firespot is Nigeria-only. */
export const SUPPORTED_COUNTRY = 'NG'

/**
 * Hosted Web SDK config for a step. Product and ID type come straight from the
 * step definition, so tier requirements live in one place (plans.ts).
 *
 * `id_selection` pins country + ID type so SmileID renders no pickers — the
 * user lands directly on the consent / ID entry screen.
 */
export function buildWebCheckConfig(step: KycStepDef): {
  product: string
  idSelection: Record<string, string[]>
  consentRequired: Record<string, string[]>
} {
  const selection = { [SUPPORTED_COUNTRY]: [step.idType] }
  return {
    product: step.product,
    idSelection: selection,
    // Nigerian ID lookups require SmileID's consent screen. It can't be
    // skipped, but declaring it keeps the flow on this ID rather than
    // prompting for a selection first.
    consentRequired: selection,
  }
}

@Injectable()
export class SmileIdService {
  private readonly logger = new Logger(SmileIdService.name)
  private readonly partnerId: string
  private readonly apiKey: string
  private readonly sidServer: number
  private readonly callbackUrl: string

  constructor(private configService: ConfigService) {
    this.partnerId = this.configService.get<string>('SMILEID_PARTNER_ID') || ''
    this.apiKey = this.configService.get<string>('SMILEID_API_KEY') || ''
    // 0 = sandbox, 1 = production
    this.sidServer =
      this.configService.get<string>('SMILEID_ENV') === 'production' ? 1 : 0
    this.callbackUrl =
      this.configService.get<string>('SMILEID_CALLBACK_URL') || ''
  }

  private get isConfigured(): boolean {
    return Boolean(this.partnerId && this.apiKey)
  }

  /** Non-secret details the Web SDK needs on the client. */
  getPartnerDetails() {
    return {
      partnerId: this.partnerId,
      environment: this.sidServer === 1 ? 'live' : 'sandbox',
      callbackUrl: this.callbackUrl,
      logoUrl: this.configService.get<string>('SMILEID_LOGO_URL') || '',
      privacyUrl: this.configService.get<string>('SMILEID_PRIVACY_URL') || '',
      redirectUrl: this.configService.get<string>('SMILEID_REDIRECT_URL') || '',
    }
  }

  private webApi(): WebApi {
    return new WebApi(
      this.partnerId,
      this.callbackUrl,
      this.apiKey,
      this.sidServer,
    )
  }

  private idApi(): IDApi {
    return new IDApi(this.partnerId, this.apiKey, this.sidServer)
  }

  /**
   * SmileID treats user_id as an *enrollment* identity: once a user_id has been
   * enrolled by a biometric/selfie job, submitting another enrolling job for it
   * fails with 2209 "This user is already enrolled".
   *
   * Our checks are independent verifications (we never use SmartSelfie
   * Authentication against a stored face), so each check gets its own SmileID
   * user. The merchant id stays the first segment so callbacks can attribute
   * the result — Mongo ObjectIds contain no hyphens, so splitting is safe.
   */
  buildUserId(
    merchantId: string,
    check: KycCheck,
    product: string,
    generation = 0,
  ): string {
    // Namespaced by product because the same check runs under different
    // products across tiers (LITE proves BVN with enhanced_kyc, PRO with
    // biometric_kyc). Sharing one id lets a biometric enrollment poison the
    // later enhanced job with 2209 "already enrolled".
    //
    // Deterministic on purpose: retries reuse the identity rather than
    // enrolling a new SmileID user each time, which keeps SmartSelfie
    // Authentication available to us later. `generation` is the escape hatch —
    // only the local reset script bumps it, so a wiped merchant gets a clean
    // identity in development while production ids never move.
    const base = `${merchantId}-${check}-${product}`
    return generation > 0 ? `${base}-g${generation}` : base
  }

  /** Recovers our merchant id from a SmileID user_id. */
  static parseMerchantId(userId: string): string {
    return String(userId || '').split('-')[0]
  }

  /**
   * Unique per attempt. The random suffix matters: two calls landing in the
   * same millisecond (double-submit, React strict-mode remount) would otherwise
   * collide on job_id and SmileID rejects the duplicate.
   */
  buildJobId(merchantId: string, check: KycCheck): string {
    const suffix = Math.random().toString(36).slice(2, 8)
    return `${check}-${merchantId}-${Date.now()}${suffix}`
  }

  /** Surfaces SmileID's actual error body instead of a bare axios failure. */
  private describeError(context: string, error: any): Error {
    const status = error?.response?.status
    const body = error?.response?.data
    const detail = body
      ? typeof body === 'string'
        ? body
        : JSON.stringify(body)
      : error?.message
    this.logger.error(`SmileID ${context} failed (status ${status}): ${detail}`)
    return new Error(`SmileID ${context} failed: ${detail}`)
  }

  /**
   * Mints a token for the hosted Web SDK. Used for the checks that must run
   * client-side (BVN consent screen, selfie capture).
   */
  async getWebToken(params: {
    userId: string
    jobId: string
    product: string
  }): Promise<{ token: string }> {
    if (!this.isConfigured) {
      throw new Error('SmileID is not configured')
    }
    try {
      return await this.webApi().get_web_token({
        user_id: params.userId,
        job_id: params.jobId,
        product: params.product,
        callback_url: this.callbackUrl,
      })
    } catch (error) {
      throw this.describeError(
        `web token (product=${params.product}, job=${params.jobId})`,
        error,
      )
    }
  }

  /**
   * CAC / business registration lookup (KYB). Submitted async so the result
   * arrives on the callback like the client-side checks.
   */
  async verifyBusinessCac(params: {
    userId: string
    jobId: string
    rcNumber: string
    businessType?: string
  }): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('SmileID is not configured')
    }
    try {
      return await this.idApi().submitAsyncjob(
        {
          user_id: params.userId,
          job_id: params.jobId,
          job_type: JOB_TYPE.BUSINESS_VERIFICATION,
        },
        {
          country: SUPPORTED_COUNTRY,
          id_type: 'BUSINESS_REGISTRATION',
          id_number: params.rcNumber,
          business_type: params.businessType || 'co',
        },
        this.callbackUrl,
      )
    } catch (error) {
      throw this.describeError('business verification', error)
    }
  }

  /**
   * Reconciles a check when the callback never arrived — polls SmileID for the
   * job's current status.
   */
  async getJobStatus(userId: string, jobId: string): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('SmileID is not configured')
    }
    try {
      return await this.webApi().get_job_status(
        { user_id: userId, job_id: jobId, job_type: JOB_TYPE.ENHANCED_KYC },
        { return_history: false, return_images: false },
      )
    } catch (error: any) {
      // 2304 "Job not found" is expected: we record a job id when the session
      // is created, but SmileID only has a job once the user completes the
      // flow. Treat it as "not submitted yet" rather than a failure.
      if (error?.response?.data?.code === '2304') {
        this.logger.debug(`SmileID job ${jobId} not submitted yet`)
        return null
      }
      throw this.describeError(`job status (job=${jobId})`, error)
    }
  }

  /**
   * Human-readable reason for a failed job, so the merchant can fix it rather
   * than seeing a bare "failed". Covers the v3 `reason` codes and the v2
   * ResultCodes / Actions verdicts.
   */
  describeResult(payload: any): string | undefined {
    if (!payload) return undefined

    // ---- v3 (enhanced_kyc / biometric_kyc): machine-readable reason ----
    switch (payload.reason) {
      case 'identifier_not_found':
        return 'That ID number was not found at the issuing authority. Check it and try again.'
      case 'face_verification_failed':
        return 'Your selfie did not match the photo on file for this ID.'
      case 'spoof_detected':
        return 'The selfie could not be accepted. Take a live photo rather than a picture of a screen or printout.'
      case 'high_risk':
        return 'This verification was declined. Please contact support.'
      case 'account_locked_fraud':
        return 'This account is blocked from verification. Please contact support.'
      case 'age_requirement_not_met':
        return 'You must be at least 18 years old to verify a business.'
      case 'image_unavailable_or_invalid':
        return 'Your photos could not be processed. Try again with clear, well-lit images.'
      case 'service_unavailable':
        return 'The ID authority is temporarily unavailable. Please try again shortly.'
      case 'internal_error':
        return 'Something went wrong during verification. Please try again.'
      case 'content_policy_violated':
        return 'The submitted image could not be processed. Please try again.'
    }

    // ---- v2 (job_type 5): ResultCode / Actions ----
    const code = String(payload.ResultCode || payload.result?.ResultCode || '')
    const actions = payload.Actions || payload.result?.Actions
    const resultText = payload.ResultText || payload.result?.ResultText

    if (code === '1022') {
      return 'The details you entered do not match the record for this ID. Enter them exactly as they appear on your official ID.'
    }
    if (code === '1013') {
      return 'That ID was not found at the issuing authority. Check the number and try again.'
    }
    if (code === '1014') {
      return 'That ID number format is not valid. Check it and try again.'
    }
    if (code === '1015') {
      return 'The ID authority is temporarily unavailable. Please try again shortly.'
    }
    if (code === '1016') {
      return 'This verification type is not enabled on the Firespot account. Please contact support.'
    }
    if (actions?.Liveness_Check && /fail/i.test(actions.Liveness_Check)) {
      return 'The selfie check did not pass. Try again in good lighting.'
    }
    if (/not enabled/i.test(String(resultText || ''))) {
      return 'This verification type is not enabled on the Firespot account. Please contact support.'
    }

    return payload.message || (resultText ? String(resultText) : undefined)
  }

  /** Verifies the signature on an inbound SmileID callback. */
  confirmSignature(timestamp: string | number, signature: string): boolean {
    if (!this.isConfigured) return false
    try {
      return new Signature(this.partnerId, this.apiKey).confirm_signature(
        timestamp,
        signature,
      )
    } catch (err) {
      this.logger.warn(`SmileID signature check failed: ${err}`)
      return false
    }
  }

  /**
   * Determines whether a job passed. Must handle every shape we can receive,
   * because misreading a rejection as a pass would grant an unearned badge:
   *  - v3 products      → status: clear | block | error
   *  - v2 (job_type 5)  → ResultCode / ResultText / Actions
   *  - job-status polls → job_success / job_complete
   */
  isSuccessfulResult(payload: any): boolean {
    if (!payload) return false

    // ---- v3: explicit disposition wins over everything else ----
    if (payload.status === 'clear') return true
    if (payload.status === 'block' || payload.status === 'error') return false

    // ---- A true success flag is a RELIABLE POSITIVE and is checked early.
    // The inverse is NOT reliable: Enhanced KYC returns job_success:false on
    // jobs that plainly passed (1012), so we never *fail* on this flag. ----
    if (payload.job_success === true) return true

    // ---- ResultCode: documented approved / rejected codes across products.
    // Approved: 0810 Enroll User (biometric), 1012 ID Number Validated
    // (enhanced), 1020 Exact / 1021 Partial Match (basic).
    // Rejected: 1013 invalid, 1014 bad format, 1015 authority down,
    // 1016 not enabled, 1022 no match. ----
    const code = String(payload.ResultCode || payload.result?.ResultCode || '')
    if (['0810', '1012', '1020', '1021'].includes(code)) return true
    if (['1013', '1014', '1015', '1016', '1022'].includes(code)) return false

    // ---- Fall back to the granular Actions verdicts ----
    const actions = payload.Actions || payload.result?.Actions
    if (actions) {
      const verdicts = [
        actions.Verify_ID_Number,
        actions.Return_Personal_Info,
        actions.Human_Review_Compare,
        actions.Selfie_To_ID_Card_Compare,
        actions.Selfie_To_ID_Authority_Compare,
        actions.Liveness_Check,
        actions.Selfie_Check,
      ].filter(Boolean)

      // "Not Applicable" / "Not Done" / "Not Provided" are NEUTRAL, not
      // failures, so they must be excluded before the negative test below —
      // otherwise "Not Applicable" (present on successful biometric jobs)
      // reads as a failure.
      const isNeutral = (v: string) =>
        /^\s*not\s+(applicable|done|provided|available)/i.test(v)

      // Negative verdicts must be checked FIRST: SmileID returns strings like
      // "Not Verified" and "No Match", which naively substring-match the
      // positive words ("Not Verified" contains "Verified") and would
      // otherwise be read as a pass.
      const isNegative = (v: string) =>
        !isNeutral(v) &&
        /^\s*(not|no)\b|unverified|failed|rejected|mismatch/i.test(v)

      if (verdicts.some(isNegative)) return false

      return verdicts.some((v: string) =>
        /verified|approved|exact match|partial match|passed|provisional|completed/i.test(
          v,
        ),
      )
    }

    return false
  }
}
