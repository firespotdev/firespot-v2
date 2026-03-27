import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async listOrders(filters: { orderStatus?: string; paymentStatus?: string } = {}) {
    const query: any = {};
    if (filters.orderStatus) query.orderStatus = filters.orderStatus;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    return this.orderModel
      .find(query)
      .populate('merchantId', 'businessName fullPhoneNumber merchantSlug')
      .populate('assignedKitIds', 'serialNumber activationStatus')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOrderById(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate('merchantId', 'businessName fullPhoneNumber merchantSlug')
      .populate('assignedKitIds', 'serialNumber activationStatus qrCodeSvgUrl')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: string) {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { orderStatus: status },
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
