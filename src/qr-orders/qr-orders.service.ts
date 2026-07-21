import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { QROrder, QROrderDocument } from '../schemas/qr-order.schema'
import { User } from '../schemas/user.schema'
import { CreateQROrderDto } from './dto/create-qr-order.dto'
import { PaystackService } from '../users/services/paystack.service'
import { ConfigService } from '@nestjs/config'
import { QRKitsService } from '../qr-kits/qr-kits.service'
import { getQRKitPricing, nairaToKobo } from '../config/pricing.config'

@Injectable()
export class QROrdersService {
  constructor(
    @InjectModel(QROrder.name) private orderModel: Model<QROrderDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private qrKitsService: QRKitsService,
  ) {}

  getPricing() {
    return getQRKitPricing(this.configService)
  }

  async createOrder(merchantId: string, dto: CreateQROrderDto) {
    const user = await this.userModel
      .findById(merchantId)
      .select('fullPhoneNumber')
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const pricing = this.getPricing()

    // The DTO caps quantity too, but that bound is compile-time. This one
    // honours QR_KIT_MAX_PER_ORDER at runtime.
    if (dto.quantity > pricing.maxKitsPerOrder) {
      throw new BadRequestException(
        `You can order at most ${pricing.maxKitsPerOrder} kits at a time`,
      )
    }

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`

    const subtotal = dto.quantity * pricing.kitPrice
    const totalAmount = subtotal + pricing.deliveryFee

    // Create DB Record
    const order = new this.orderModel({
      merchantId: new Types.ObjectId(merchantId),
      quantity: dto.quantity,
      phoneNumber: dto.phoneNumber,
      state: dto.state,
      lga: dto.lga,
      deliveryAddress: dto.deliveryAddress,
      subtotal,
      deliveryFee: pricing.deliveryFee,
      totalAmount,
      paymentStatus: 'PENDING',
    })

    // Free order: no Paystack hop at all. Mark it settled and fulfil inline so
    // the merchant lands straight on the success screen.
    if (totalAmount === 0) {
      order.paymentStatus = 'SUCCESSFUL'
      order.orderStatus = 'PROCESSING'
      order.paidAt = new Date()
      await order.save()

      await this.fulfilOrder(order)

      return {
        orderId: order._id,
        isFree: true,
        totalAmount: 0,
      }
    }

    await order.save()

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'

    // Initialize Paystack transaction
    try {
      const paymentResponse = await this.paystackService.initializeTransaction({
        email,
        amount: nairaToKobo(totalAmount),
        reference: `ORD-${order._id}-${Date.now()}`,
        callbackUrl: `${frontendUrl}/order-status`, // Or wherever they verify
        metadata: {
          merchantId,
          orderId: order._id.toString(),
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
    } catch (error) {
      throw new BadRequestException('Could not initialize payment for order')
    }
  }

  /**
   * Grant entitlements and a digital kit for a settled order.
   *
   * Fulfilment failures are logged, not thrown: for the paid path this stops a
   * Cloudinary/kit error from failing an otherwise valid payment verification.
   * An admin can assign kits manually if this fails.
   */
  private async fulfilOrder(order: QROrderDocument) {
    try {
      const assignedKitIds = await this.qrKitsService.processOnlineOrder(
        order.merchantId.toString(),
        order.quantity,
      )

      // Link assigned kits to the order
      order.assignedKitIds = assignedKitIds
      await order.save()
    } catch (error) {
      console.error('Failed to auto-assign kits to order:', error.message)
    }
  }

  async verifyPayment(reference: string) {
    const verification = await this.paystackService.verifyTransaction(reference)

    if (verification.status === 'success') {
      // Both the Paystack webhook and the frontend callback land here, and
      // Paystack retries webhooks. Match on paymentStatus so only the first
      // caller flips the order — otherwise entitlements are granted twice.
      const order = await this.orderModel.findOneAndUpdate(
        { paystackReference: reference, paymentStatus: { $ne: 'SUCCESSFUL' } },
        {
          paymentStatus: 'SUCCESSFUL',
          orderStatus: 'PROCESSING',
          paidAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
        },
        { new: true },
      )

      // Already settled by a previous call — return it without re-fulfilling.
      if (!order) {
        return this.orderModel.findOne({ paystackReference: reference })
      }

      await this.fulfilOrder(order)

      return order
    }

    // In case of failure or reversed
    await this.orderModel.findOneAndUpdate(
      { paystackReference: reference },
      { paymentStatus: 'FAILED' },
    )
    throw new BadRequestException('Payment was not successful')
  }
}
