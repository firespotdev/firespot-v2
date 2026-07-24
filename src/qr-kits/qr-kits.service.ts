import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Model, Types } from 'mongoose'
import { nanoid } from 'nanoid'
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
import { customAlphabet } from 'nanoid'
import { getQRKitPricing, nairaToKobo } from '../config/pricing.config'

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

    return { status: 'available' as const, serialNumber: qrKit.serialNumber }
  }

  async getQRKitBySerial(
    serialNumber: string,
    ipAddress?: string,
    userAgent?: string,
    customerFingerprint?: string,
  ) {
    const qrKit = await this.qrKitModel
      .findOne({ serialNumber: serialNumber.toUpperCase() })
      .populate(
        'merchantId',
        'businessName bankAccounts profilePhotoUrl merchantSlug',
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
      merchant.bankAccounts && merchant.bankAccounts.length > 0
        ? merchant.bankAccounts.map((acc) => ({
            bankName: acc.bankName,
            bankCode: acc.bankCode,
            accountNumber: acc.accountNumber,
            accountName: acc.accountName,
            isPrimary: acc.isPrimary,
          }))
        : []

    return {
      id: merchant._id,
      merchantSlug: merchant.merchantSlug,
      businessName: merchant.businessName,
      bankAccounts,
      profilePhotoUrl: merchant.profilePhotoUrl,
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

    const reference = `qrkit_${qrKit.serialNumber}_${nanoid(10)}`

    const hasEntitlement =
      !!user.availableKitEntitlements && user.availableKitEntitlements > 0

    // Free activation, either because it's free for everyone or because this
    // merchant pre-paid via an order. No Paystack round trip in either case.
    if (activationAmount === 0 || hasEntitlement) {
      return this.activateKitFree(qrKit, user, reference)
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    const callbackUrl = `${frontendUrl}/activate?mode=callback&reference=${reference}`

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
   * Reached when activation is priced at zero, or when the merchant pre-paid
   * for kits via an order and holds an entitlement. Note that no agent
   * commission is settled through Paystack on this path — the agent is still
   * notified so the commission can be reconciled out of band.
   */
  private async activateKitFree(
    qrKit: QRKitDocument,
    user: UserDocument,
    reference: string,
  ) {
    // Only consume an entitlement if one exists: when activation is free for
    // everyone the counter stays put, so it keeps meaning "kits still owed".
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
      return {
        message: 'QR kit is already activated',
        serialNumber: qrKit.serialNumber,
        merchantId: qrKit.merchantId,
        alreadyActivated: true,
      }
    }

    // Verify payment with Paystack
    const verification = await this.paystackService.verifyTransaction(reference)

    if (verification.status !== 'success') {
      qrKit.paymentStatus = 'failed'
      await qrKit.save()
      throw new HttpException(
        'Payment verification failed',
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

  async completeActivationByWebhook(reference: string) {
    const qrKit = await this.qrKitModel.findOne({
      paystackReference: reference,
    })

    if (!qrKit) {
      return { success: false, message: 'QR kit not found' }
    }

    if (qrKit.activationStatus === 'activated') {
      return { success: true, message: 'Already activated' }
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
          { new: true, sort: { createdAt: 1 } },
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
   * Claim a digital QR kit if the user has entitlements but no kits yet (Recovery)
   */
  async claimDigitalKit(merchantId: string) {
    const user = await this.userModel.findById(merchantId)
    if (!user) {
      throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND)
    }

    // Check if user has any kits (digital or physical)
    const existingKit = await this.qrKitModel.findOne({ merchantId: user._id })
    if (existingKit) {
      throw new HttpException(
        'Merchant already has a QR kit',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Entitlements only gate the digital kit while kits cost money. Once
    // activation is free, requiring a prior paid order would lock out every
    // merchant who never ordered.
    const { activationAmount } = getQRKitPricing(this.configService)
    const requiresEntitlement = activationAmount > 0

    if (
      requiresEntitlement &&
      (!user.availableKitEntitlements || user.availableKitEntitlements <= 0)
    ) {
      throw new HttpException(
        'No available kit entitlements found. Please order a kit first.',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Create a digital kit (does not consume an entitlement)
    return this.createDigitalKit(merchantId, 'online-order')
  }

  /**
   * Generate a new digital kit directly on a merchant's account.
   *
   * This is the "proceed without linking" path. It intentionally creates a
   * fresh kit on every successful request so merchants can run separate QR
   * kits for separate counters or locations.
   */
  async generateDigitalKit(merchantId: string) {
    const user = await this.userModel.findById(merchantId)

    if (
      !user ||
      !user.businessName ||
      !user.bankAccounts ||
      user.bankAccounts.length === 0
    ) {
      throw new HttpException(
        'Please complete your profile setup before generating a QR kit',
        HttpStatus.BAD_REQUEST,
      )
    }

    const qrKit = await this.createDigitalKit(merchantId)

    return {
      message: 'QR kit generated successfully',
      qrKit,
    }
  }

  /**
   * Create a digital QR kit for immediate use
   */
  private async createDigitalKit(
    merchantId: string,
    source: 'self-generated' | 'online-order' = 'self-generated',
  ): Promise<QRKitDocument> {
    const user = await this.userModel.findById(merchantId)
    const serialNumber = await this.generateUniqueDigitalSerialNumber()

    // Generate and upload QR code
    const svgString = await this.qrCodeService.generateQRCodeSVG(serialNumber)
    const { url, publicId } = await this.qrCodeService.uploadQRCodeSVG(
      svgString,
      serialNumber,
    )

    const digitalKit = new this.qrKitModel({
      serialNumber,
      merchantId: user?._id,
      isDigital: true,
      activationStatus: 'activated',
      linkStatus: 'unlinked',
      source,
      paymentStatus: 'successful',
      qrCodeSvgUrl: url,
      qrCodeSvgPublicId: publicId,
      paidAt: new Date(),
      activatedAt: new Date(),
      activationAmount: 0, // Digital kit is free with order
    })

    await digitalKit.save()

    // Ensure user has merchantSlug
    if (user && !user.merchantSlug) {
      user.merchantSlug = nanoid(6).toUpperCase()
      await user.save()
    }

    return digitalKit
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
