import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { User, UserDocument } from '../../schemas/user.schema'
import { QRKit, QRKitDocument } from '../../schemas/qrkit.schema'
import { Sale, SaleDocument } from '../../schemas/sale.schema'
import { Scan, ScanDocument } from '../../schemas/scan.schema'
import { QROrder, QROrderDocument } from '../../schemas/qr-order.schema'
import {
  InsightsQueryDto,
  DateRangePreset,
} from '../../scans/dto/insights-query.dto'

interface MerchantFilters {
  page: number
  limit: number
  search?: string
  status?: 'active' | 'inactive'
}

@Injectable()
export class AdminMerchantsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Scan.name) private scanModel: Model<ScanDocument>,
    @InjectModel(QROrder.name) private qrOrderModel: Model<QROrderDocument>,
  ) {}

  async getMerchants(filters: MerchantFilters) {
    const { page, limit, search, status } = filters
    const skip = (page - 1) * limit

    // Build query
    const query: Record<string, any> = {}

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { fullPhoneNumber: { $regex: search, $options: 'i' } },
        { merchantSlug: { $regex: search, $options: 'i' } },
      ]
    }

    // Get merchants with their activation status
    const merchants = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get activated merchant IDs for status filtering
    const activatedMerchantIds = await this.qrKitModel.distinct('merchantId', {
      activationStatus: 'activated',
      merchantId: { $ne: null },
    })

    const activatedIdStrings = activatedMerchantIds.map((id) => id.toString())

    // Add isActive flag to each merchant
    let merchantsWithStatus = merchants.map((merchant) => ({
      ...merchant,
      isActive: activatedIdStrings.includes(merchant._id.toString()),
    }))

    // Filter by status if provided
    if (status === 'active') {
      merchantsWithStatus = merchantsWithStatus.filter((m) => m.isActive)
    } else if (status === 'inactive') {
      merchantsWithStatus = merchantsWithStatus.filter((m) => !m.isActive)
    }

    // Get total count
    const total = await this.userModel.countDocuments(query)

    return {
      data: merchantsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getMerchantById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid merchant ID')
    }

    const merchant = await this.userModel.findById(id).lean()

    if (!merchant) {
      throw new NotFoundException('Merchant not found')
    }

    // Get QR kits for this merchant
    const qrKits = await this.qrKitModel
      .find({ merchantId: merchant._id })
      .sort({ createdAt: -1 })
      .lean()

    // Check if merchant has any activated QR kit
    const isActive = qrKits.some((kit) => kit.activationStatus === 'activated')

    return {
      ...merchant,
      isActive,
      qrKits,
      qrKitCount: qrKits.length,
      activatedQrKitCount: qrKits.filter(
        (kit) => kit.activationStatus === 'activated',
      ).length,
    }
  }

  async getStats() {
    const now = new Date()

    // Start of today (midnight)
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // Start of this week (Sunday)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all counts in parallel
    const [
      totalMerchants,
      newToday,
      newThisWeek,
      newThisMonth,
      activatedQRKits,
    ] = await Promise.all([
      // Total merchants
      this.userModel.countDocuments(),

      // New merchants today
      this.userModel.countDocuments({
        createdAt: { $gte: startOfToday },
      }),

      // New merchants this week
      this.userModel.countDocuments({
        createdAt: { $gte: startOfWeek },
      }),

      // New merchants this month
      this.userModel.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),

      // Get distinct merchant IDs with activated QR kits
      this.qrKitModel.distinct('merchantId', {
        activationStatus: 'activated',
        merchantId: { $ne: null },
      }),
    ])

    const activeMerchants = activatedQRKits.length
    const inactiveMerchants = totalMerchants - activeMerchants

    return {
      total: totalMerchants,
      newToday,
      newThisWeek,
      newThisMonth,
      active: activeMerchants,
      inactive: inactiveMerchants,
      activationRate:
        totalMerchants > 0
          ? Math.round((activeMerchants / totalMerchants) * 100)
          : 0,
    }
  }

  async getMerchantStats(id: string, query: InsightsQueryDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid merchant ID')
    }

    const merchantObjectId = new Types.ObjectId(id)
    const dateRange = this.calculateDateRange(query)

    // Filters for date-specific queries
    const dateFilter: any = {}
    if (dateRange.startDate) {
      dateFilter.$gte = dateRange.startDate
      if (dateRange.endDate) {
        dateFilter.$lte = dateRange.endDate
      }
    }

    // 1. Scans Count
    const scanMatch: any = { merchantId: merchantObjectId }
    if (dateRange.startDate) {
      scanMatch.scannedAt = dateFilter
    }
    const totalScans = await this.scanModel.countDocuments(scanMatch)

    // 2. Sales Stats (Confirmed & Pending)
    const salesMatch: any = { merchantId: merchantObjectId }

    // Confirmed Sales in range
    const confirmedMatch = { ...salesMatch, status: 'CONFIRMED' }
    if (dateRange.startDate) {
      confirmedMatch.createdAt = dateFilter
    }

    const [confirmedSales, pendingSalesCount, totalQRKits] = await Promise.all([
      this.saleModel.aggregate([
        { $match: confirmedMatch },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.saleModel.countDocuments({ ...salesMatch, status: 'PENDING' }),
      this.qrKitModel.countDocuments({ merchantId: merchantObjectId }),
    ])

    const salesStats = confirmedSales[0] || { totalAmount: 0, count: 0 }

    // 3. Unique Customers
    const uniqueCustomers = await this.scanModel.distinct(
      'customerFingerprint',
      scanMatch,
    )

    // 4. Pending QR Orders
    const pendingOrders = await this.qrOrderModel
      .find({
        merchantId: merchantObjectId,
        orderStatus: 'PENDING',
      })
      .sort({ createdAt: -1 })
      .lean()

    return {
      scans: totalScans,
      uniqueCustomers: uniqueCustomers.length,
      sales: {
        confirmedAmount: salesStats.totalAmount,
        confirmedCount: salesStats.count,
        pendingCount: pendingSalesCount,
      },
      qrKits: totalQRKits,
      pendingOrders: pendingOrders.map((order) => ({
        _id: order._id,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
      })),
      dateRange: {
        startDate: dateRange.startDate?.toISOString() || null,
        endDate: dateRange.endDate?.toISOString() || null,
        preset: query.preset || DateRangePreset.ALL_TIME,
      },
    }
  }

  private calculateDateRange(query: InsightsQueryDto): {
    startDate: Date | null
    endDate: Date | null
  } {
    const now = new Date()
    const preset = query.preset || DateRangePreset.ALL_TIME

    switch (preset) {
      case DateRangePreset.ALL_TIME:
        return { startDate: null, endDate: null }
      case DateRangePreset.TODAY: {
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        return { startDate: startOfDay, endDate: now }
      }
      case DateRangePreset.THIS_WEEK: {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return { startDate: startOfWeek, endDate: now }
      }
      case DateRangePreset.LAST_7_DAYS: {
        const last7 = new Date(now)
        last7.setDate(now.getDate() - 7)
        last7.setHours(0, 0, 0, 0)
        return { startDate: last7, endDate: now }
      }
      case DateRangePreset.LAST_30_DAYS: {
        const last30 = new Date(now)
        last30.setDate(now.getDate() - 30)
        last30.setHours(0, 0, 0, 0)
        return { startDate: last30, endDate: now }
      }
      case DateRangePreset.LAST_90_DAYS: {
        const last90 = new Date(now)
        last90.setDate(now.getDate() - 90)
        last90.setHours(0, 0, 0, 0)
        return { startDate: last90, endDate: now }
      }
      case DateRangePreset.CUSTOM: {
        return {
          startDate: query.startDate ? new Date(query.startDate) : null,
          endDate: query.endDate ? new Date(query.endDate) : null,
        }
      }
      default:
        return { startDate: null, endDate: null }
    }
  }
}
