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

@Injectable()
export class QROrdersService {
  constructor(
    @InjectModel(QROrder.name) private orderModel: Model<QROrderDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private qrKitsService: QRKitsService,
  ) {}

  async createOrder(merchantId: string, dto: CreateQROrderDto) {
    const user = await this.userModel
      .findById(merchantId)
      .select('fullPhoneNumber')
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const email = `${user.fullPhoneNumber.replace('+', '')}@firespot.co`
    const KIT_PRICE = 2500
    const DELIVERY_FEE = 3000

    const subtotal = dto.quantity * KIT_PRICE
    const totalAmount = subtotal + DELIVERY_FEE

    // Create DB Record
    const order = new this.orderModel({
      merchantId: new Types.ObjectId(merchantId),
      quantity: dto.quantity,
      phoneNumber: dto.phoneNumber,
      state: dto.state,
      deliveryAddress: dto.deliveryAddress,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      totalAmount,
      paymentStatus: 'PENDING',
    })

    await order.save()

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'

    // Initialize Paystack transaction
    try {
      const paymentResponse = await this.paystackService.initializeTransaction({
        email,
        amount: totalAmount * 100, // Paystack uses kobo
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

  async verifyPayment(reference: string) {
    const verification = await this.paystackService.verifyTransaction(reference)

    if (verification.status === 'success') {
      const order = await this.orderModel.findOneAndUpdate(
        { paystackReference: reference },
        {
          paymentStatus: 'SUCCESSFUL',
          orderStatus: 'PROCESSING',
          paidAt: new Date(verification.paidAt),
        },
        { new: true },
      )

      if (order && order.paymentStatus === 'SUCCESSFUL') {
        try {
          // Assign available kits to the merchant
          const assignedKitIds = await this.qrKitsService.assignKitsToMerchant(
            order.merchantId.toString(),
            order.quantity,
          )

          // Link assigned kits to the order
          order.assignedKitIds = assignedKitIds
          await order.save()
        } catch (error) {
          console.error('Failed to auto-assign kits to order:', error.message)
          // We don't throw here to avoid failing the payment verification
          // An admin can manually assign kits if auto-assignment fails
        }
      }

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
