import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Order, OrderDocument } from '../schemas/order.schema'
import { User } from '../schemas/user.schema'
import { CreateOrderDto } from './dto/create-order.dto'
import { PaystackService } from '../users/services/paystack.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  async createOrder(merchantId: string, dto: CreateOrderDto) {
    const user = await this.userModel
      .findById(merchantId)
      .select('fullPhoneNumber')
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const email = `${user.phoneNumber}@firespot.co`
    const KIT_PRICE = 2500
    const DELIVERY_FEE = 2000

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
          paidAt: new Date(verification.paidAt),
        },
        { new: true },
      )

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
