import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { QROrder, QROrderDocument } from '../schemas/qr-order.schema'
import { User } from '../schemas/user.schema'
import { QRKit, QRKitDocument } from '../schemas/qrkit.schema'
import { CreateQROrderDto } from './dto/create-qr-order.dto'
import { PaystackService } from '../users/services/paystack.service'
import { ConfigService } from '@nestjs/config'
import { QRKitsService } from '../qr-kits/qr-kits.service'
import { getQRKitPricing, nairaToKobo } from '../config/pricing.config'
import { SmsService } from '../services/sms/sms.service'
import { PaystackSubaccountsService } from '../users/services/paystack-subaccounts.service'
import { grantKitLite } from '../merchant-plans/kit-lite'
import { validatePaystackPaidValue } from '../payments/payment-validation'

@Injectable()
export class QROrdersService {
  constructor(
    @InjectModel(QROrder.name) private orderModel: Model<QROrderDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private qrKitsService: QRKitsService,
    private smsService: SmsService,
    private paystackSubaccountsService: PaystackSubaccountsService,
  ) {}

  getPricing() {
    const pricing = getQRKitPricing(this.configService)

    return {
      ...pricing,
      maxKitsPerOrder: Math.min(
        100,
        Math.max(1, Math.floor(pricing.maxKitsPerOrder)),
      ),
    }
  }

  async createOrder(merchantId: string, dto: CreateQROrderDto) {
    const user = await this.userModel
      .findById(merchantId)
      .select('fullPhoneNumber businessName bankAccounts')
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const kitType = dto.kitType || 'physical'
    if (kitType === 'digital' && (dto.quantity !== 1 || dto.qrKitId)) {
      throw new BadRequestException('Digital orders require one new QR kit')
    }

    if (kitType === 'digital' && (!user.businessName || !user.bankAccounts?.length)) {
      throw new BadRequestException('Please complete your profile setup before purchasing a digital QR kit')
    }

    const qrKit = dto.qrKitId
      ? await this.qrKitModel.findOne({
          _id: new Types.ObjectId(dto.qrKitId),
          merchantId: new Types.ObjectId(merchantId),
          activationStatus: 'activated',
        })
      : null

    if (dto.qrKitId && !qrKit) {
      throw new NotFoundException(
        'QR kit not found, inactive, or does not belong to you',
      )
    }

    const pricing = this.getPricing()
    if (!Number.isFinite(pricing.kitPrice) || pricing.kitPrice <= 0) {
      throw new BadRequestException('QR kit pricing is unavailable. Please try again later.')
    }
    const maximumQuantity = qrKit ? 1 : pricing.maxKitsPerOrder

    // A selected/self-generated kit is ordered one at a time. Direct online
    // orders may use the configured multi-kit quantity.
    if (dto.quantity > maximumQuantity) {
      throw new BadRequestException(
        `You can order at most ${maximumQuantity} kit${maximumQuantity === 1 ? '' : 's'} at a time`,
      )
    }

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`

    const subtotal = pricing.kitPrice * dto.quantity
    const deliveryFee = kitType === 'digital' ? 0 : pricing.deliveryFee
    const totalAmount = subtotal + deliveryFee

    // Create DB Record
    const order = new this.orderModel({
      merchantId: new Types.ObjectId(merchantId),
      ...(qrKit && { qrKitId: qrKit._id }),
      kitType,
      quantity: dto.quantity,
      phoneNumber: dto.phoneNumber,
      state: dto.state,
      lga: dto.lga,
      deliveryAddress: dto.deliveryAddress,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentStatus: 'PENDING',
      assignedKitIds: qrKit ? [qrKit._id] : [],
    })

    await order.save()

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'

    // Initialize Paystack transaction
    try {
      const paymentResponse = await this.paystackService.initializeTransaction({
        email,
        amount: nairaToKobo(totalAmount),
        reference: `ORD-${order._id}-${Date.now()}`,
        callbackUrl: `${frontendUrl}/order-status?kitType=${kitType}`,
        metadata: {
          merchantId,
          orderId: order._id.toString(),
          ...(qrKit && { qrKitId: qrKit._id.toString() }),
          type: 'QR_KIT_ORDER',
        },
      })

      order.paystackReference = paymentResponse.reference
      order.paystackAccessCode = paymentResponse.accessCode
      await order.save()

      return {
        authorizationUrl: paymentResponse.authorizationUrl,
        reference: paymentResponse.reference,
        orderId: order._id,
      }
    } catch {
      throw new BadRequestException('Could not initialize payment for order')
    }
  }

  private async grantOrderLite(order: QROrderDocument) {
    if (await grantKitLite(this.userModel, order.merchantId)) {
      order.liteGranted = true
      await order.save()
    }
    await this.paystackSubaccountsService.ensureForUserId(order.merchantId.toString())
  }

  /**
   * Reserve physical inventory for a settled direct online order.
   *
   * A selected-kit delivery already has its QR kit, so it needs no inventory
   * reservation or serial SMS. Direct online orders reserve pending physical
   * kits and tell the merchant which serials to activate after delivery.
   */
  private async fulfilOrder(order: QROrderDocument) {
    await this.grantOrderLite(order)
    if (order.kitType === 'digital') {
      const kit = await this.qrKitsService.createPaidDigitalKit(
        order.merchantId.toString(), order._id.toString(),
      )
      order.assignedKitIds = [kit._id]
      order.orderStatus = 'COMPLETED'
      await order.save()
      return
    }

    // The ordered physical unit is a print of an existing merchant-owned QR
    // kit. It is already linked on the order and must not grant a new kit or
    // entitlement.
    if (order.qrKitId) {
      return
    }

    try {
      let assignedKitIds = order.assignedKitIds || []

      // Reuse existing reservations if fulfilment is retried, so an order
      // cannot consume another batch of inventory or receive new serials.
      if (assignedKitIds.length === 0) {
        assignedKitIds = await this.qrKitsService.processOnlineOrder(
          order.merchantId.toString(),
          order._id.toString(),
          order.quantity,
        )

        order.assignedKitIds = assignedKitIds
        order.fulfilmentError = undefined
        order.fulfilmentFailedAt = undefined
        await order.save()
      }

      const orderedKits = await this.qrKitModel
        .find({ _id: { $in: assignedKitIds } })
        .select('serialNumber')

      const serialById = new Map(
        orderedKits.map((kit) => [kit._id.toString(), kit.serialNumber]),
      )
      const serialNumbers = assignedKitIds
        .map((id) => serialById.get(id.toString()))
        .filter((serialNumber): serialNumber is string => !!serialNumber)

      if (serialNumbers.length === assignedKitIds.length) {
        await this.sendOnlineOrderSerialSms(order, serialNumbers)
      } else {
        throw new Error(
          'One or more reserved QR kit serials could not be found',
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown fulfilment error'
      order.fulfilmentError = message
      order.fulfilmentFailedAt = new Date()
      await order.save().catch((saveError) => {
        console.error(
          `Failed to record fulfilment error for order ${order._id}:`,
          saveError,
        )
      })
      console.error(`Failed to fulfil QR kit order ${order._id}:`, message)
    }
  }

  private async sendOnlineOrderSerialSms(
    order: QROrderDocument,
    serialNumbers: string[],
  ) {
    if (order.serialSmsSentAt) {
      return
    }

    const merchant = await this.userModel
      .findById(order.merchantId)
      .select('fullPhoneNumber')

    if (!merchant?.fullPhoneNumber) {
      const message =
        'Merchant phone number is missing; serial SMS was not sent'
      order.fulfilmentError = message
      order.fulfilmentFailedAt = new Date()
      await order.save()
      console.error(
        `Could not send QR kit serial SMS for order ${order._id}: ${message}`,
      )
      return
    }

    const serialLabel =
      serialNumbers.length === 1 ? 'Serial number' : 'Serial numbers'
    const message = `Your Firespot QR kit order is confirmed. ${serialLabel}: ${serialNumbers.join(', ')}. Activate ${serialNumbers.length === 1 ? 'it' : 'them'} from the Activate QR kit screen.`

    try {
      await this.smsService.sendSms(merchant.fullPhoneNumber, message)
      order.serialSmsSentAt = new Date()
      order.fulfilmentError = undefined
      order.fulfilmentFailedAt = undefined
      await order.save()
    } catch (error) {
      order.fulfilmentError =
        'Physical kits were reserved, but the serial SMS could not be sent'
      order.fulfilmentFailedAt = new Date()
      await order.save().catch((saveError) => {
        console.error(
          `Failed to record SMS error for order ${order._id}:`,
          saveError,
        )
      })
      console.error(
        `Failed to send QR kit serial SMS for order ${order._id}:`,
        error,
      )
    }
  }

  async verifyPayment(reference: string) {
    const existingOrder = await this.orderModel.findOne({
      paystackReference: reference,
    })
    if (!existingOrder) {
      throw new NotFoundException('QR order not found')
    }
    if (existingOrder.paymentStatus === 'SUCCESSFUL') {
      // Digital fulfilment uses the order ID as the kit ID, so retries repair
      // interrupted fulfilment without ever issuing a second kit.
      if (existingOrder.kitType === 'digital') await this.fulfilOrder(existingOrder)
      else {
        await this.grantOrderLite(existingOrder)
      }
      return existingOrder
    }

    const verification = await this.paystackService.verifyTransaction(reference)

    const validation = validatePaystackPaidValue(verification, {
      reference,
      amountKobo: Math.round(existingOrder.totalAmount * 100),
    })

    if (validation.valid === true) {
      // Both the Paystack webhook and the frontend callback land here, and
      // Paystack retries webhooks. Match on paymentStatus so only the first
      // caller flips the order — otherwise entitlements are granted twice.
      const order = await this.orderModel.findOneAndUpdate(
        { paystackReference: reference, paymentStatus: { $ne: 'SUCCESSFUL' } },
        {
          paymentStatus: 'SUCCESSFUL',
          orderStatus: 'PROCESSING',
          paidAt: verification.paidAt
            ? new Date(verification.paidAt)
            : new Date(),
        },
        { returnDocument: 'after' },
      )

      // Already settled by a previous call — return it without re-fulfilling.
      if (!order) {
        const settled = await this.orderModel.findOne({ paystackReference: reference })
        if (settled?.kitType === 'digital') await this.fulfilOrder(settled)
        return settled
      }

      await this.fulfilOrder(order)

      return order
    }

    // In case of failure or reversed
    await this.orderModel.findOneAndUpdate(
      { paystackReference: reference },
      { paymentStatus: 'FAILED' },
    )
    throw new BadRequestException({
      code: 'PAYSTACK_PAYMENT_VALIDATION_FAILED',
      message: 'Payment could not be verified for this order',
      reason: validation.reason,
    })
  }
}
