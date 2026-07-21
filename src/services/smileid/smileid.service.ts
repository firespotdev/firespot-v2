import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IDApi, Signature, WebApi, JOB_TYPE } from 'smile-identity-core'
import type { KycCheck } from '../../merchant-plans/constants/plans'

/**
 * SmileID products used per check:
 *  - nin      → Enhanced KYC (server-to-server ID lookup)
 *  - bvn      → Web SDK (BVN requires SmileID's user-consent screen)
 *  - liveness → Biometric KYC via Web SDK (SmartSelfie + face match)
 *  - cac      → Business Verification (KYB, server-to-server RC lookup)
 *
 * "product" strings below are what the hosted Web SDK expects when we mint a
 * web token for the client.
 */
export const WEB_PRODUCT_BY_CHECK: Partial<Record<KycCheck, string>> = {
  bvn: 'ekyc_smartselfie',
  liveness: 'biometric_kyc',
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

  /** Deterministic job id so retries of the same check are traceable. */
  buildJobId(merchantId: string, check: KycCheck): string {
    return `${check}-${merchantId}-${Date.now()}`
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
    return this.webApi().get_web_token({
      user_id: params.userId,
      job_id: params.jobId,
      product: params.product,
      callback_url: this.callbackUrl,
    })
  }

  /**
   * Server-to-server NIN lookup (Enhanced KYC). Returns the raw SmileID
   * response; the caller decides pass/fail from ResultCode/Actions.
   */
  async verifyNin(params: {
    userId: string
    jobId: string
    idNumber: string
    firstName?: string
    lastName?: string
    dob?: string
  }): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('SmileID is not configured')
    }
    return this.idApi().submit_job(
      {
        user_id: params.userId,
        job_id: params.jobId,
        job_type: JOB_TYPE.ENHANCED_KYC,
      },
      {
        country: 'NG',
        id_type: 'NIN',
        id_number: params.idNumber,
        first_name: params.firstName,
        last_name: params.lastName,
        dob: params.dob,
        entered: true,
      },
    )
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
    return this.idApi().submitAsyncjob(
      {
        user_id: params.userId,
        job_id: params.jobId,
        job_type: JOB_TYPE.BUSINESS_VERIFICATION,
      },
      {
        country: 'NG',
        id_type: 'BUSINESS_REGISTRATION',
        id_number: params.rcNumber,
        business_type: params.businessType || 'co',
      },
      this.callbackUrl,
    )
  }

  /**
   * Reconciles a check when the callback never arrived — polls SmileID for the
   * job's current status.
   */
  async getJobStatus(userId: string, jobId: string): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('SmileID is not configured')
    }
    return this.webApi().get_job_status(
      { user_id: userId, job_id: jobId, job_type: JOB_TYPE.ENHANCED_KYC },
      { return_history: false, return_images: false },
    )
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
   * SmileID signals success with ResultCode 1012/1020/etc. and a "Verified"
   * Actions block. Treat an explicit verified/approved result as a pass.
   */
  isSuccessfulResult(payload: any): boolean {
    const actions = payload?.Actions || payload?.result?.Actions
    if (actions) {
      const verified = [
        actions.Verify_ID_Number,
        actions.Return_Personal_Info,
        actions.Human_Review_Compare,
        actions.Selfie_To_ID_Card_Compare,
      ].filter(Boolean)
      if (verified.some((v: string) => /verified|approved|exact match/i.test(v))) {
        return true
      }
    }
    const code = String(
      payload?.ResultCode || payload?.result?.ResultCode || '',
    )
    return ['1012', '1020', '0810', '1020'].includes(code)
  }
}
