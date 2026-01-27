import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Model } from 'mongoose'
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

    const activationAmount = qrKit.activationAmount || 200000 // NGN 2,000 in kobo
    const reference = `qrkit_${qrKit.serialNumber}_${nanoid(10)}`
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    const callbackUrl = `${frontendUrl}/activate?mode=callback&reference=${reference}`

    // Use phone number as pseudo-email for Paystack
    const email = `${user.phoneNumber}@firespot.co`

    // Handle split payment if agent is assigned
    let subaccount: string | undefined
    let transactionCharge: number | undefined

    if (qrKit.agentId) {
      const agent = await this.agentModel.findById(qrKit.agentId)
      if (agent && agent.subaccountCode) {
        subaccount = agent.subaccountCode
        // Split: 1500 to Firespot (minus fees), 500 to Agent
        // transactionCharge is the portion for the platform (Firespot) in kobo
        transactionCharge = 150000
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
    qrKit.paidAt = new Date(verification.paidAt)
    qrKit.activatedAt = new Date()
    await qrKit.save()

    // Notify agent if assigned
    if (qrKit.agentId) {
      await this.notifyAgentOnActivation(qrKit)
    }

    // Update user's merchantSlug if not set
    if (qrKit.merchantId) {
      const user = await this.userModel.findById(qrKit.merchantId)
      if (user && !user.merchantSlug) {
        user.merchantSlug = nanoid(6).toUpperCase()
        await user.save()
      }
    }

    return {
      message: 'QR kit activated successfully',
      serialNumber: qrKit.serialNumber,
      merchantId: qrKit.merchantId,
      alreadyActivated: false,
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
    qrKit.paidAt = new Date()
    qrKit.activatedAt = new Date()
    await qrKit.save()

    // Notify agent if assigned
    if (qrKit.agentId) {
      await this.notifyAgentOnActivation(qrKit)
    }

    // Update user's merchantSlug if not set
    if (qrKit.merchantId) {
      const user = await this.userModel.findById(qrKit.merchantId)
      if (user && !user.merchantSlug) {
        user.merchantSlug = nanoid(6).toUpperCase()
        await user.save()
      }
    }

    return { success: true, message: 'Activated via webhook' }
  }

  private async notifyAgentOnActivation(qrKit: QRKitDocument) {
    try {
      if (!qrKit.agentId) return

      const agent = await this.agentModel.findById(qrKit.agentId)
      if (!agent || !agent.phoneNumber) return

      const user = await this.userModel.findById(qrKit.merchantId)
      const businessName = user?.businessName || 'a merchant'

      const message = `Hello ${agent.name}, the QR Kit (${qrKit.serialNumber}) assigned to you has been activated by ${businessName}.`

      await this.smsService.sendSms(agent.phoneNumber, message)

      console.log(`Notification sent to agent ${agent.name} for QR kit ${qrKit.serialNumber}`)
    } catch (error) {
      console.error(
        `Failed to notify agent for QR kit ${qrKit.serialNumber}:`,
        error,
      )
    }
  }
}
