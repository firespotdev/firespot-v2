import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from '../schemas/sale.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { EventsGateway } from '../events/events/events.gateway';
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto';
import { RecordSaleDto } from './dto/record-sale.dto';
import { SalesQueryDto } from './dto/sales-query.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  async createPendingSale(dto: CreatePendingSaleDto): Promise<Sale> {
    // Check if this fingerprint has any confirmed sales for this merchant already
    const existingConfirmedSale = await this.saleModel.findOne({
      merchantId: dto.merchantId,
      customerFingerprint: dto.customerFingerprint,
      status: 'CONFIRMED',
    });

    const customerType = existingConfirmedSale ? 'Repeat' : 'New';

    const sale = new this.saleModel({
      ...dto,
      customerType,
      status: 'PENDING',
    });
    
    await sale.save();

    // Emit event to the merchant's room
    this.eventsGateway.server.to(dto.merchantId).emit('sale.pending', sale);

    return sale;
  }

  async createManualSale(merchantId: string, dto: RecordSaleDto): Promise<Sale> {
    let targetBankName = dto.targetBankName;

    // Default to primary bank for manual records if it's a bank transfer
    if (!targetBankName && dto.paymentMethod === 'Bank Transfer') {
      const merchant = await this.userModel.findById(merchantId).exec();
      if (merchant && merchant.bankAccounts && merchant.bankAccounts.length > 0) {
        const primaryBank =
          merchant.bankAccounts.find((b) => b.isPrimary) ||
          merchant.bankAccounts[0];
        targetBankName = primaryBank.bankName;
      }
    }

    const sale = new this.saleModel({
      merchantId,
      amount: dto.amount,
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      targetBankName,
      status: 'CONFIRMED',
      recordedAt: new Date(),
      customerType: 'New', // Default for manual as per request
      source: 'Manual',
    });
    
    return sale.save();
  }

  async getSales(merchantId: string, query: SalesQueryDto) {
    const { status, startDate, endDate, page = '1', limit = '10' } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { merchantId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const [sales, total] = await Promise.all([
      this.saleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.saleModel.countDocuments(filter).exec(),
    ]);

    return {
      data: sales,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  async getSalesStats(merchantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [pendingCount, todayConfirmed, totalConfirmed] = await Promise.all([
      this.saleModel.countDocuments({ merchantId, status: 'PENDING' }),
      this.saleModel.find({ merchantId, status: 'CONFIRMED', createdAt: { $gte: startOfDay } }).select('amount').lean(),
      this.saleModel.find({ merchantId, status: 'CONFIRMED' }).select('amount').lean(),
    ]);

    const todaySalesCount = todayConfirmed.length;
    const todaySalesAmount = todayConfirmed.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalSalesAmount = totalConfirmed.reduce((sum, sale) => sum + (sale.amount || 0), 0);

    return {
      pendingSalesCount: pendingCount,
      todaySalesCount,
      todaySalesAmount,
      totalSalesAmount,
    };
  }

  async recordSale(merchantId: string, saleId: string, dto: RecordSaleDto) {
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    sale.status = 'CONFIRMED';
    sale.amount = dto.amount;
    sale.description = dto.description;
    sale.paymentMethod = dto.paymentMethod;
    sale.recordedAt = new Date();

    return sale.save();
  }

  async cancelSale(merchantId: string, saleId: string) {
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    sale.status = 'CANCELLED';
    return sale.save();
  }
}
