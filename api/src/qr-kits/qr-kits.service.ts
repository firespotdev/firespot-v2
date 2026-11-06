import { createHmac } from 'crypto'
import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Model, Types } from 'mongoose'
import { nanoid } from 'nanoid'
import { generateReference } from '../common/reference'
import { QRKit, QRKitDocument } from '../schemas/qrkit.schema'
import { User, UserDocument } from '../schemas/user.schema'
import { Agent, AgentDocument } from '../admin/schemas/agent.schema'
import { PaystackService } from '../users/services/paystack.service'
import { ScansService } from '../scans/scans.service'
import { SmsService } from '../services/sms/sms.service'
import {
  detectDeviceType,
  detectBrowserType,
} from '../scans/utils/device-detector'
import { QRCodeService } from '../services/qr-code.service'
import {
  getCollectEligibility,
  getEffectiveTier,
} from '../merchant-plans/constants/plans'
import { getMerchantPaystackChannels } from '../payments/paystack-collection-channels'
import { customAlphabet } from 'nanoid'
import { getQRKitPricing, nairaToKobo } from '../config/pricing.config'
import { grantKitLite } from '../merchant-plans/kit-lite'
import { PaystackSubaccountsService } from '../users/services/paystack-subaccounts.service'
import { validatePaystackPaidValue } from '../payments/payment-validation'

const generateDigitalSerial = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  8,
)

/** Agent's cut of a paid activation, in naira. */
const AGENT_COMMISSION_NAIRA = 500

@Injectable()
export class QRKitsService {
  constructor(
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private scansService: ScansService,
    private smsService: SmsService,
    private qrCodeService: QRCodeService,
    private paystackSubaccountsService: PaystackSubaccountsService,
  ) {}

  async checkSerialNumber(serialNumber: string) {
    const qrKit = await this.qrKitModel.findOne({
      serialNumber: serialNumber.toUpperCase(),
    })

    if (!qrKit) {
      return {
        status: 'not_found' as const,
        serialNumber: serialNumber.toUpperCase(),
      }
    }

    if (qrKit.activationStatus === 'activated') {
      return {
        status: 'already_bound' as const,
        serialNumber: qrKit.serialNumber,
      }
    }

    if (qrKit.merchantId) {
      return {
        status: 'already_bound' as const,
        serialNumber: qrKit.serialNumber,
      }
    }

    return {
      status: 'available' as const,
      serialNumber: qrKit.serialNumber,
      reservedForMerchantId: qrKit.reservedForMerchantId?.toString(),
    }
  }

  async getQRKitBySerial(
    serialNumber: string,
    ipAddress?: string,
    userAgent?: string,
    customerFingerprint?: string,
    revealAccounts = false,
  ) {
    const qrKit = await this.qrKitModel
      .findOne({ serialNumber: serialNumber.toUpperCase() })
      .populate(
        'merchantId',
        'businessName bankAccounts bankTransferEnabled businessImageUrl profilePhotoUrl merchantSlug paystackSubaccountCode savedCardsCheckoutEnabled paystackCollectionEnabled paystackCollectionChannels planTier planStatus planGraceUntil cancelAtPeriodEnd planCurrentPeriodEnd kycCompletedAt',
      )

    if (!qrKit) {
      throw new HttpException('QR kit not found', HttpStatus.NOT_FOUND)
    }

    if (qrKit.activationStatus !== 'activated') {
      throw new HttpException('QR kit is not activated', HttpStatus.BAD_REQUEST)
    }

    const merchant = qrKit.merchantId as any as UserDocument

    if (!merchant || !merchant.businessName) {
      throw new HttpException(
        'Merchant profile not found or incomplete',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Create scan record for this visit so that subsequent events
    // (like copying the account number) can be reliably linked to it.
    if (ipAddress && userAgent && merchant._id) {
      try {
        await this.scansService.createScan({
          qrKitId: qrKit._id.toString(),
          merchantId: merchant._id.toString(),
          ipAddress,
          userAgent,
          customerFingerprint,
          deviceType: detectDeviceType(userAgent),
          browserType: detectBrowserType(userAgent),
        })
      } catch (err) {
        console.error(
          `Failed to create scan record for QR kit ${qrKit.serialNumber}:`,
          err,
        )
      }
    }

    const bankAccounts =
      merchant.bankTransferEnabled !== false &&
      merchant.bankAccounts &&
      merchant.bankAccounts.length > 0
        ? merchant.bankAccounts
            .filter((acc) => acc.isEnabled !== false)
            .map((acc) => ({
              id: createHmac('sha256', this.configService.get<string>('JWT_SECRET')!).update(`${merchant._id}:${acc.bankCode}:${acc.accountNumber}`).digest('hex'),
              bankName: acc.bankName,
              bankCode: acc.bankCode,
              accountNumber: revealAccounts ? acc.accountNumber : '',
              accountName: acc.accountName,
              isPrimary: acc.isPrimary,
            }))
        : []

    const canCollect = getCollectEligibility(merchant).canCollect
    const hasPaystackCollection = Boolean(
      merchant.paystackSubaccountCode && canCollect,
    )
    const paystackCollectionChannels = hasPaystackCollection
      ? getMerchantPaystackChannels(merchant)
      : []

    return {
      id: merchant._id,
      merchantSlug: merchant.merchantSlug,
      businessName: merchant.businessName,
      bankAccounts,
      businessImageUrl:
        merchant.businessImageUrl || merchant.profilePhotoUrl,
      hasDetailedReceipts: Boolean(getEffectiveTier(merchant)),
      hasPaystackCollection,
      paystackCollectionChannels,
      savedCardsCheckoutEnabled:
        merchant.savedCardsCheckoutEnabled !== false,
    }
  }

  async initiateActivation(serialNumber: string, userId: string) {
    const qrKit = await this.qrKitModel.findOne({
      serialNumber: serialNumber.toUpperCase(),
    })

    if (!qrKit) {
      throw new HttpException('QR kit not found', HttpStatus.NOT_FOUND)
    }

    if (qrKit.activationStatus === 'activated') {
      throw new HttpException(
        'This QR kit is already activated and linked to another account',
        HttpStatus.BAD_REQUEST,
      )
    }

    if (qrKit.merchantId && qrKit.merchantId.toString() !== userId) {
      throw new HttpException(
        'This QR kit is being activated by another user',
        HttpStatus.BAD_REQUEST,
      )
    }

    if (
      qrKit.reservedForMerchantId &&
      qrKit.reservedForMerchantId.toString() !== userId
    ) {
      throw new HttpException(
        'This QR kit was ordered by another merchant',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Check if user has completed profile setup
    const user = await this.userModel.findById(userId)
    if (
      !user ||
      !user.businessName ||
      !user.bankAccounts ||
      user.bankAccounts.length === 0
    ) {
      throw new HttpException(
        'Please complete your profile setup before activating a QR kit',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Config is authoritative, not qrKit.activationAmount: kits created before
    // activation went free still carry a stale 200000 in the column, and
    // honouring that would keep charging them with no migration.
    const pricing = getQRKitPricing(this.configService)
    const activationAmount = nairaToKobo(pricing.activationAmount)

    const reference = `qrkit_${qrKit.serialNumber}_${generateReference('', 10)}`

    const isReservedForThisMerchant = Boolean(
      qrKit.reservedForMerchantId &&
      qrKit.reservedForMerchantId.toString() === userId,
    )

    const hasEntitlement =
      (!!user.availableKitEntitlements && user.availableKitEntitlements > 0) ||
      isReservedForThisMerchant

    // An online order already paid for activation. Do not charge twice.
    if (hasEntitlement) {
      return this.activateKitFree(qrKit, user, reference)
    }

    if (activationAmount <= 0) {
      throw new HttpException('QR kit activation pricing is unavailable. Please try again later.', HttpStatus.BAD_REQUEST)
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    const callbackUrl = `${frontendUrl}/payment-status?reference=${reference}`

    // Use phone number as pseudo-email for Paystack
    const email = `${user.phoneNumber}@firespot.co`

    // Handle split payment if agent is assigned to QR kit
    // Fallback: if no agent on QR kit, use merchant's referring agent
    let subaccount: string | undefined
    let transactionCharge: number | undefined

    // Agent keeps a fixed commission; the platform takes the rest. Derived from
    // the configured price so a changed activation fee doesn't skew the split.
    const platformChargeKobo = Math.max(
      activationAmount - nairaToKobo(AGENT_COMMISSION_NAIRA),
      0,
    )

    // Priority 1: Agent assigned to this QR kit
    if (qrKit.agentId) {
      const agent = await this.agentModel.findById(qrKit.agentId)
      if (agent && agent.subaccountCode) {
        subaccount = agent.subaccountCode
        // transactionCharge is the platform's (Firespot's) portion in kobo;
        // the agent's subaccount keeps the remainder.
        transactionCharge = platformChargeKobo
      }
    }
    // Priority 2: Agent who referred this merchant (via referral code at signup)
    else if (user.referredByAgent) {
      const referringAgent = await this.agentModel.findById(
        user.referredByAgent,
      )
      if (referringAgent && referringAgent.subaccountCode) {
        subaccount = referringAgent.subaccountCode
        // Same split, for the agent who referred this merchant
        transactionCharge = platformChargeKobo
      }
    }

    // Initialize Paystack payment
    const paystackResponse = await this.paystackService.initializeTransaction({
      email,
      amount: activationAmount,
      reference,
      callbackUrl,
      subaccount,
      transactionCharge,
      metadata: {
        qrKitId: qrKit._id.toString(),
        serialNumber: qrKit.serialNumber,
        userId: userId,
      },
    })

    // Link QR kit to merchant (pending payment)
    qrKit.merchantId = user._id as any
    qrKit.activationStatus = 'pending'
    qrKit.linkStatus = 'linked'
    qrKit.source = qrKit.source || 'admin-generated'
    qrKit.paystackReference = paystackResponse.reference
    qrKit.paystackAccessCode = paystackResponse.accessCode
    // Snapshot the expected kobo amount at initialization so a later pricing
    // change cannot alter what this payment must settle.
    qrKit.activationAmount = activationAmount
    qrKit.paystackExpectedAmountKobo = activationAmount
    await qrKit.save()

    return {
      message: 'Activation initiated. Please complete payment to activate.',
      serialNumber: qrKit.serialNumber,
      activationAmount: activationAmount / 100, // Convert to Naira
      qrKitId: qrKit._id,
      authorizationUrl: paystackResponse.authorizationUrl,
      reference: paystackResponse.reference,
    }
  }

  /**
   * Activate a kit without payment.
   *
   * Reached when the merchant prepaid for kits via an order and holds an
   * entitlement or a reserved kit. Note that no agent
   * commission is settled through Paystack on this path — the agent is still
   * notified so the commission can be reconciled out of band.
   */
  private async activateKitFree(
    qrKit: QRKitDocument,
    user: UserDocument,
    reference: string,
  ) {
    // Reservations can prove prepayment even if the legacy counter is empty.
    if (user.availableKitEntitlements && user.availableKitEntitlements > 0) {
      user.availableKitEntitlements -= 1
    }

    qrKit.merchantId = user._id as any
    qrKit.paymentStatus = 'successful'
    qrKit.activationStatus = 'activated'
    qrKit.linkStatus = 'linked'
    qrKit.source = qrKit.source || 'admin-generated'
    qrKit.paidAt = new Date()
    qrKit.activatedAt = new Date()
    qrKit.reservationFulfilledAt = qrKit.reservedForOrderId
      ? new Date()
      : undefined
    qrKit.paystackReference = reference // Store the reference anyway for tracking
    await qrKit.save()

    // Notify the assigned agent. No payment ran, so no commission was earned.
    const earningAgentId = qrKit.agentId || user.referredByAgent
    if (earningAgentId) {
      await this.notifyAgentOnActivation(
        earningAgentId.toString(),
        user.businessName || 'a merchant',
        qrKit.serialNumber,
        0,
      )
    }

    // Update user's merchantSlug if not set
    if (!user.merchantSlug) {
      user.merchantSlug = nanoid(6).toUpperCase()
    }

    await user.save()

    await this.grantLite(qrKit.merchantId.toString())

    return {
      message: 'QR kit activated',
      serialNumber: qrKit.serialNumber,
      activationAmount: 0,
      qrKitId: qrKit._id,
      isAutoActivated: true,
    }
  }

  async completeActivationByReference(reference: string) {
    const qrKit = await this.qrKitModel.findOne({
      paystackReference: reference,
    })

    if (!qrKit) {
      throw new HttpException(
        'QR kit not found for this payment reference',
        HttpStatus.NOT_FOUND,
      )
    }

    if (qrKit.activationStatus === 'activated') {
      await this.grantLite(qrKit.merchantId.toString())
      return {
        message: 'QR kit is already activated',
        serialNumber: qrKit.serialNumber,
        merchantId: qrKit.merchantId,
        alreadyActivated: true,
      }
    }

    // Verify payment with Paystack
    const verification = await this.paystackService.verifyTransaction(reference)

    const validation = validatePaystackPaidValue(verification, {
      reference,
      amountKobo:
        qrKit.paystackExpectedAmountKobo ??
        nairaToKobo(getQRKitPricing(this.configService).activationAmount),
    })
    if (validation.valid === false) {
      qrKit.paymentStatus = 'failed'
      await qrKit.save()
      throw new HttpException(
        {
          code: 'PAYSTACK_PAYMENT_VALIDATION_FAILED',
          message: 'Payment verification failed',
          reason: validation.reason,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    qrKit.paymentStatus = 'successful'
    qrKit.activationStatus = 'activated'
    qrKit.linkStatus = 'linked'
    qrKit.source = qrKit.source || 'admin-generated'
    qrKit.paidAt = new Date(verification.paidAt)
    qrKit.activatedAt = new Date()
    qrKit.reservationFulfilledAt = qrKit.reservedForOrderId
      ? new Date()
      : undefined

    // Auto-assign referring agent to QR kit if unassigned
    const user = await this.userModel.findById(qrKit.merchantId)
    if (!qrKit.agentId && user?.referredByAgent) {
      qrKit.agentId = user.referredByAgent as any
      qrKit.assignedToAgentAt = new Date()
    }

    await qrKit.save()

    // Notify agent who earned the commission
    const earningAgentId = qrKit.agentId || user?.referredByAgent
    if (earningAgentId) {
      await this.notifyAgentOnActivation(
        earningAgentId.toString(),
        user?.businessName || 'a merchant',
        qrKit.serialNumber,
        AGENT_COMMISSION_NAIRA,
      )
    }

    // Update user's merchantSlug if not set
    if (user && !user.merchantSlug) {
      user.merchantSlug = nanoid(6).toUpperCase()
      await user.save()
    }

    await this.grantLite(qrKit.merchantId.toString())

    return {
      message: 'QR kit activated successfully',
      serialNumber: qrKit.serialNumber,
      merchantId: qrKit.merchantId,
      alreadyActivated: false,
      // What Paystack actually charged, in naira, so the receipt doesn't have
      // to guess at a price that is now configurable.
      activationAmount: verification.amount / 100,
    }
  }

  async completeActivationByWebhook(reference: string, webhookData: any) {
    const qrKit = await this.qrKitModel.findOne({
      paystackReference: reference,
    })

    if (!qrKit) {
      return { success: false, message: 'QR kit not found' }
    }

    if (qrKit.activationStatus === 'activated') {
      await this.grantLite(qrKit.merchantId.toString())
      return { success: true, message: 'Already activated' }
    }

    const validation = validatePaystackPaidValue(webhookData, {
      reference,
      amountKobo:
        qrKit.paystackExpectedAmountKobo ??
        nairaToKobo(getQRKitPricing(this.configService).activationAmount),
    })
    if (validation.valid === false) {
      qrKit.paymentStatus = 'failed'
      await qrKit.save()
      throw new HttpException(
        {
          code: 'PAYSTACK_PAYMENT_VALIDATION_FAILED',
          message: 'Payment verification failed',
          reason: validation.reason,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    qrKit.paymentStatus = 'successful'
    qrKit.activationStatus = 'activated'
    qrKit.linkStatus = 'linked'
    qrKit.source = qrKit.source || 'admin-generated'
    qrKit.paidAt = new Date()
    qrKit.activatedAt = new Date()
    qrKit.reservationFulfilledAt = qrKit.reservedForOrderId
      ? new Date()
      : undefined

    // Auto-assign referring agent to QR kit if unassigned
    const user = await this.userModel.findById(qrKit.merchantId)
    if (!qrKit.agentId && user?.referredByAgent) {
      qrKit.agentId = user.referredByAgent as any
      qrKit.assignedToAgentAt = new Date()
    }

    await qrKit.save()

    // Notify agent who earned the commission
    const earningAgentId = qrKit.agentId || user?.referredByAgent
    if (earningAgentId) {
      await this.notifyAgentOnActivation(
        earningAgentId.toString(),
        user?.businessName || 'a merchant',
        qrKit.serialNumber,
        AGENT_COMMISSION_NAIRA,
      )
    }

    // Update user's merchantSlug if not set
    if (user && !user.merchantSlug) {
      user.merchantSlug = nanoid(6).toUpperCase()
      await user.save()
    }

    await this.grantLite(qrKit.merchantId.toString())
    return { success: true, message: 'Activated via webhook' }
  }

  /**
   * Notify an agent that a QR kit assigned to them was activated.
   *
   * Only claim a commission when one was actually settled. Free activations
   * run no Paystack split, so `commissionNaira` is 0 there and the message
   * must not promise money that will never arrive.
   */
  private async notifyAgentOnActivation(
    agentId: string,
    businessName: string,
    serialNumber: string,
    commissionNaira: number,
  ) {
    try {
      const agent = await this.agentModel.findById(agentId)
      if (!agent || !agent.phoneNumber) return

      // The split only pays out to a Paystack subaccount. Without one, no
      // money reached this agent even on a paid activation.
      const earnedCommission = commissionNaira > 0 && !!agent.subaccountCode

      const activationNote = `Hello ${agent.name}, the QR Kit (${serialNumber}) assigned to you has been activated by ${businessName}.`

      const message = earnedCommission
        ? `${activationNote} You have earned NGN ${commissionNaira.toLocaleString()} as commission.`
        : activationNote

      await this.smsService.sendSms(agent.phoneNumber, message)

      console.log(
        `Activation notification sent to agent ${agent.name} for QR kit ${serialNumber}`,
      )
    } catch (error) {
      console.error(`Failed to notify agent for QR kit ${serialNumber}:`, error)
    }
  }
  /**
   * Check how many unassigned QR kits are available for immediate fulfillment
   */
  async checkAvailability() {
    const availableCount = await this.qrKitModel
      .countDocuments({
        merchantId: null,
        agentId: null,
        activationStatus: 'pending',
        isDigital: { $ne: true },
        reservedForOrderId: null,
      })
      .exec()
    return { availableCount }
  }

  /**
   * Assign existing unassigned QR kits to a merchant (for online orders)
   */
  async assignKitsToMerchant(merchantId: string, quantity: number) {
    // Find internal "available" kits (no merchant, no agent)
    const availableKits = await this.qrKitModel
      .find({
        merchantId: null,
        agentId: null,
        activationStatus: 'pending',
        isDigital: { $ne: true },
        reservedForOrderId: null,
      })
      .limit(quantity)
      .exec()

    if (availableKits.length < quantity) {
      // Not enough kits available to fulfill immediately
      // This is a business/admin alert scenario, but for now we'll throw
      throw new HttpException(
        `Not enough available QR kits to fulfill this order. Required: ${quantity}, Available: ${availableKits.length}. Please contact support or check admin inventory.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    const assignedIds: Types.ObjectId[] = []
    const user = await this.userModel.findById(merchantId)

    for (const qrKit of availableKits) {
      qrKit.merchantId = new Types.ObjectId(merchantId) as any
      qrKit.activationStatus = 'activated'
      qrKit.paymentStatus = 'successful'
      qrKit.linkStatus = 'linked'
      qrKit.source = qrKit.source || 'admin-generated'
      qrKit.paidAt = new Date()
      qrKit.activatedAt = new Date()

      // Auto-assign referring agent to QR kit if unassigned (for commission/tracking)
      if (user?.referredByAgent) {
        qrKit.agentId = user.referredByAgent as any
        qrKit.assignedToAgentAt = new Date()
      }

      await qrKit.save()
      assignedIds.push(qrKit._id as Types.ObjectId)
    }

    // Update user's merchantSlug if not set
    if (user && !user.merchantSlug) {
      user.merchantSlug = nanoid(6).toUpperCase()
      await user.save()
    }

    return assignedIds
  }

  /**
   * Process a successful online order
   */
  async processOnlineOrder(
    merchantId: string,
    orderId: string,
    quantity: number,
  ) {
    const user = await this.userModel.findById(merchantId)
    if (!user) {
      throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND)
    }

    const merchantObjectId = new Types.ObjectId(merchantId)
    const orderObjectId = new Types.ObjectId(orderId)
    const reservedAt = new Date()
    const reservedIds: Types.ObjectId[] = []

    const existingReservations = await this.qrKitModel
      .find({ reservedForOrderId: orderObjectId })
      .select('_id')

    if (existingReservations.length === quantity) {
      return existingReservations.map((kit) => kit._id as Types.ObjectId)
    }

    user.availableKitEntitlements =
      (user.availableKitEntitlements || 0) + quantity
    await user.save()

    if (existingReservations.length > 0) {
      await this.qrKitModel.updateMany(
        { reservedForOrderId: orderObjectId },
        {
          $unset: {
            reservedForOrderId: 1,
            reservedForMerchantId: 1,
            reservedAt: 1,
          },
        },
      )
    }

    try {
      for (let index = 0; index < quantity; index += 1) {
        // findOneAndUpdate makes each reservation atomic, so concurrent paid
        // orders cannot receive the same physical serial number.
        const qrKit = await this.qrKitModel.findOneAndUpdate(
          {
            merchantId: null,
            agentId: null,
            activationStatus: 'pending',
            isDigital: { $ne: true },
            reservedForOrderId: null,
          },
          {
            $set: {
              reservedForOrderId: orderObjectId,
              reservedForMerchantId: merchantObjectId,
              reservedAt,
              linkStatus: 'unlinked',
              source: 'admin-generated',
            },
          },
          { returnDocument: 'after', sort: { createdAt: 1 } },
        )

        if (!qrKit) {
          throw new HttpException(
            `Not enough physical QR kits to fulfil this order. Required: ${quantity}, reserved: ${reservedIds.length}.`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }

        reservedIds.push(qrKit._id as Types.ObjectId)
      }

      return reservedIds
    } catch (error) {
      // Do not leave a partially fulfilled order holding inventory.
      await this.qrKitModel.updateMany(
        { reservedForOrderId: orderObjectId },
        {
          $unset: {
            reservedForOrderId: 1,
            reservedForMerchantId: 1,
            reservedAt: 1,
          },
        },
      )
      throw error
    }
  }

  /**
   * Recover an existing paid digital kit without creating another one.
   */
  async claimDigitalKit(merchantId: string) {
    const kit = await this.qrKitModel.findOne({
      merchantId, isDigital: true, activationStatus: 'activated', paymentStatus: 'successful',
    })
    if (!kit) {
      throw new HttpException('Purchase a digital QR kit to continue.', HttpStatus.BAD_REQUEST)
    }
    return kit
  }

  generateDigitalKit() {
    throw new HttpException('Purchase a digital QR kit to continue.', HttpStatus.BAD_REQUEST)
  }

  private async grantLite(merchantId: string) {
    await grantKitLite(this.userModel, merchantId)
    await this.paystackSubaccountsService.ensureForUserId(merchantId)
  }

  /** Called only for a verified first PRO/PRO MAX purchase. */
  async ensureFirstPlanDigitalKit(merchantId: string) {
    const existing = await this.qrKitModel.findOne({
      $or: [{ merchantId }, { reservedForMerchantId: merchantId }],
    })
    if (existing && (existing._id.toString() !== merchantId || !existing.isDigital)) {
      return existing
    }
    // A stable merchant-based ID prevents two paid callbacks or two first-plan
    // orders from issuing multiple included kits. Retries also repair the SVG.
    return this.createPaidDigitalKit(merchantId, merchantId)
  }

  /** Only called after verified payment, with a stable issuance ID. */
  async createPaidDigitalKit(merchantId: string, issuanceId: string): Promise<QRKitDocument> {
    const kitId = new Types.ObjectId(issuanceId)
    const user = await this.userModel.findById(merchantId)
    if (!user) throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND)
    let kit = await this.qrKitModel.findById(kitId)
    if (!kit) {
      const serialNumber = await this.generateUniqueDigitalSerialNumber()
      // Paid kit orders use their order ID; included first-plan kits use the
      // merchant ID. Atomic upsert covers callback/webhook races and retries.
      kit = await this.qrKitModel.findOneAndUpdate(
        { _id: kitId },
        { $setOnInsert: {
          serialNumber, merchantId: user._id, isDigital: true,
          activationStatus: 'activated', linkStatus: 'unlinked', source: 'online-order',
          paymentStatus: 'successful', paidAt: new Date(), activatedAt: new Date(), activationAmount: 0,
        } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
    }
    if (!kit.qrCodeSvgUrl) {
      const svgString = await this.qrCodeService.generateQRCodeSVG(kit.serialNumber)
      const { url, publicId } = await this.qrCodeService.uploadQRCodeSVG(svgString, kit.serialNumber)
      await this.qrKitModel.updateOne({ _id: kitId }, {
        $set: { qrCodeSvgUrl: url, qrCodeSvgPublicId: publicId },
      })
      kit.qrCodeSvgUrl = url
      kit.qrCodeSvgPublicId = publicId
    }
    if (!user.merchantSlug) {
      await this.userModel.updateOne({ _id: user._id, merchantSlug: { $in: [null, ''] } }, {
        $set: { merchantSlug: nanoid(6).toUpperCase() },
      })
    }
    return kit
  }

  /**
   * Generate unique serial number with FSD- prefix
   */
  private async generateUniqueDigitalSerialNumber(): Promise<string> {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const serialNumber = `FSD-${generateDigitalSerial()}`
      const existing = await this.qrKitModel.findOne({ serialNumber })
      if (!existing) return serialNumber
      attempts++
    }

    throw new HttpException(
      'Failed to generate unique digital serial number',
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
}
