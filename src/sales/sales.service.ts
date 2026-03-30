import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model, Types } from 'mongoose'
import { Sale, SaleDocument } from '../schemas/sale.schema'
import { User, UserDocument } from '../schemas/user.schema'
import { QRKit, QRKitDocument } from '../schemas/qrkit.schema'
import { EventsGateway } from '../events/events/events.gateway'
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto'
import { RecordSaleDto } from './dto/record-sale.dto'
import { EditSaleDto } from './dto/edit-sale.dto'
import { SalesQueryDto } from './dto/sales-query.dto'
import { nanoid } from 'nanoid'

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  async createPendingSale(dto: CreatePendingSaleDto): Promise<Sale> {
    // Check if this fingerprint has any confirmed sales for this merchant already
    const confirmedSalesCount = await this.saleModel.countDocuments({
      merchantId: dto.merchantId,
      customerFingerprint: dto.customerFingerprint,
      status: 'CONFIRMED',
    })

    const customerType = confirmedSalesCount > 0 ? 'Repeat' : 'New'
    const customerPurchaseCount = confirmedSalesCount + 1 // Including this potential sale

    // Generate unique reference
    const reference = `FS-${nanoid(8).toUpperCase()}`

    let qrKitName = undefined
    if (dto.serialNumber) {
      const qrKit = await this.qrKitModel.findOne({
        serialNumber: dto.serialNumber.toUpperCase(),
      })
      if (qrKit) {
        qrKitName = qrKit.name || qrKit.serialNumber
      }
    }

    const merchantObjectId = new Types.ObjectId(dto.merchantId)
    const sale = new this.saleModel({
      ...dto,
      merchantId: merchantObjectId,
      customerType,
      customerPurchaseCount,
      reference,
      qrKitName,
      status: 'PENDING',
    })

    await sale.save()

    // Emit event to the merchant's room
    this.eventsGateway.server.to(dto.merchantId).emit('sale.pending', sale)

    return sale
  }

  async createManualSale(
    merchantId: string,
    dto: RecordSaleDto,
  ): Promise<Sale> {
    let targetBankName = dto.targetBankName

    // Default to primary bank for manual records if it's a bank transfer
    if (!targetBankName && dto.paymentMethod === 'Bank Transfer') {
      const merchant = await this.userModel.findById(merchantId).exec()
      if (
        merchant &&
        merchant.bankAccounts &&
        merchant.bankAccounts.length > 0
      ) {
        const primaryBank =
          merchant.bankAccounts.find((b) => b.isPrimary) ||
          merchant.bankAccounts[0]
        targetBankName = primaryBank.bankName
      }
    }

    // Find the merchant's first activated QR kit to attribute this manual sale to
    const firstKit = await this.qrKitModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        activationStatus: 'activated',
      })
      .sort({ createdAt: 1 })
      .exec()

    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = new this.saleModel({
      merchantId: merchantObjectId,
      amount: dto.amount,
      description: dto.description,
      paymentMethod: dto.paymentMethod || 'Other',
      targetBankName,
      status: 'CONFIRMED',
      recordedAt: new Date(),
      customerType: 'New', // Default for manual as per request
      source: 'Manual',
      reference: `FS-${nanoid(8).toUpperCase()}`,
      serialNumber: firstKit?.serialNumber,
      qrKitName: firstKit?.name || firstKit?.serialNumber,
    })

    return sale.save()
  }

  async getSales(merchantId: string, query: SalesQueryDto) {
    const {
      status,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '10',
    } = query
    const skip = (Number(page) - 1) * Number(limit)
    const merchantObjectId = new Types.ObjectId(merchantId)
    const filter: any = { merchantId: merchantObjectId }

    if (status && status !== 'ALL') {
      filter.status = status
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } },
      ]
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate)
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
    ])

    return {
      data: sales,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)) || 1,
      },
    }
  }

  async getSaleById(merchantId: string, saleId: string): Promise<Sale> {
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId }).exec()
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }
    return sale
  }
  private calculateDateRange(query: SalesQueryDto): {
    startDate: Date | null
    endDate: Date | null
  } {
    const now = new Date()
    const preset = query.preset || 'today'

    switch (preset) {
      case 'all_time':
        return { startDate: null, endDate: null }
      case 'today': {
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        return { startDate: startOfDay, endDate: now }
      }
      case 'this_week': {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return { startDate: startOfWeek, endDate: now }
      }
      case 'last_7_days': {
        const last7 = new Date(now)
        last7.setDate(now.getDate() - 7)
        last7.setHours(0, 0, 0, 0)
        return { startDate: last7, endDate: now }
      }
      case 'last_30_days': {
        const last30 = new Date(now)
        last30.setDate(now.getDate() - 30)
        last30.setHours(0, 0, 0, 0)
        return { startDate: last30, endDate: now }
      }
      case 'last_90_days': {
        const last90 = new Date(now)
        last90.setDate(now.getDate() - 90)
        last90.setHours(0, 0, 0, 0)
        return { startDate: last90, endDate: now }
      }
      case 'custom': {
        return {
          startDate: query.startDate ? new Date(query.startDate) : null,
          endDate: query.endDate ? new Date(query.endDate) : null,
        }
      }
      default:
        return { startDate: null, endDate: null }
    }
  }

  async getSalesStats(merchantId: string, query?: SalesQueryDto) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const pendingCount = await this.saleModel.countDocuments({
      merchantId: merchantObjectId,
      status: 'PENDING',
    })

    // For filtered stats
    const dateRange = this.calculateDateRange(query || {})

    const filter: Record<string, any> = { merchantId: merchantObjectId, status: 'CONFIRMED' }
    if (dateRange.startDate) {
      const end = dateRange.endDate || new Date()
      filter.$or = [
        { recordedAt: { $gte: dateRange.startDate, $lte: end } },
        { 
          recordedAt: { $exists: false }, 
          createdAt: { $gte: dateRange.startDate, $lte: end } 
        }
      ]
    }

    const filteredConfirmed = await this.saleModel
      .find(filter)
      .select('amount recordedAt createdAt')
      .lean()
    const totalConfirmed = await this.saleModel
      .find({ merchantId: merchantObjectId, status: 'CONFIRMED' })
      .select('amount')
      .lean()

    const statsAmount = filteredConfirmed.reduce(
      (sum, sale) => sum + (sale.amount || 0),
      0,
    )
    const totalSalesAmount = totalConfirmed.reduce(
      (sum, sale) => sum + (sale.amount || 0),
      0,
    )

    const preset = query?.preset || 'today'
    const trend = this.calculateTrendData(
      filteredConfirmed,
      preset,
      dateRange.startDate,
      dateRange.endDate
    )

    const response: any = {
      pendingSalesCount: pendingCount,
      todaySalesCount: filteredConfirmed.length, // This now reflects filtered count
      todaySalesAmount: statsAmount, // This now reflects filtered amount
      totalSalesAmount,
      trend,
    }

    if (preset !== 'all_time' && dateRange.startDate) {
      let previousStatsAmount = 0
      let previousPeriodLabel = 'yesterday'

      const end = dateRange.endDate || new Date()
      const diffMs = end.getTime() - dateRange.startDate.getTime()
      const prevEnd = new Date(dateRange.startDate.getTime() - 1)
      const prevStart = new Date(prevEnd.getTime() - diffMs)

      const prevFilter: any = { merchantId, status: 'CONFIRMED' }
      prevFilter.createdAt = { $gte: prevStart, $lte: prevEnd }

      const prevSales = await this.saleModel
        .find(prevFilter)
        .select('amount')
        .lean()
      previousStatsAmount = prevSales.reduce(
        (sum, sale) => sum + (sale.amount || 0),
        0
      )

      if (preset === 'today') previousPeriodLabel = 'yesterday'
      else if (preset === 'this_week') previousPeriodLabel = 'last week'
      else if (preset === 'last_7_days') previousPeriodLabel = 'previous 7 days'
      else if (preset === 'last_30_days') previousPeriodLabel = 'previous 30 days'
      else if (preset === 'last_90_days') previousPeriodLabel = 'previous 90 days'
      else if (preset === 'custom') previousPeriodLabel = 'previous period'

      let percentageChange = 0
      if (previousStatsAmount === 0) {
        if (statsAmount > 0) percentageChange = 100
      } else {
        percentageChange = Math.round(
          ((statsAmount - previousStatsAmount) / previousStatsAmount) * 100
        )
      }

      response.percentageChange = percentageChange
      response.previousPeriodLabel = previousPeriodLabel
    }

    return response
  }

  async recordSale(merchantId: string, saleId: string, dto: RecordSaleDto) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId: merchantObjectId })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    sale.status = 'CONFIRMED'
    sale.amount = dto.amount
    sale.description = dto.description
    sale.paymentMethod = dto.paymentMethod || 'Other'
    sale.recordedAt = new Date()

    // If no QR kit is linked (e.g., manual entry confirmed later or link share), attribute to first kit
    if (!sale.serialNumber) {
      const firstKit = await this.qrKitModel
        .findOne({
          merchantId: new Types.ObjectId(merchantId),
          activationStatus: 'activated',
        })
        .sort({ createdAt: 1 })
        .exec()

      if (firstKit) {
        sale.serialNumber = firstKit.serialNumber
        sale.qrKitName = firstKit.name || firstKit.serialNumber
      }
    }

    return sale.save()
  }

  async cancelSale(merchantId: string, saleId: string) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId: merchantObjectId })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    sale.status = 'CANCELLED'
    return sale.save()
  }

  async editSale(merchantId: string, saleId: string, dto: EditSaleDto) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({ _id: saleId, merchantId: merchantObjectId })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    if (sale.status !== 'CONFIRMED') {
      throw new UnprocessableEntityException(
        'Only confirmed sales can be edited',
      )
    }

    if (sale.hasBeenEdited) {
      throw new UnprocessableEntityException(
        'This sale has already been edited once',
      )
    }

    const creationTime = sale.createdAt
      ? new Date(sale.createdAt).getTime()
      : Date.now()
    const diffHours = (Date.now() - creationTime) / (1000 * 60 * 60)

    if (diffHours > 24) {
      throw new UnprocessableEntityException(
        'Sales can only be edited within 24 hours of creation',
      )
    }

    if (dto.amount !== undefined) sale.amount = dto.amount
    if (dto.description !== undefined) sale.description = dto.description
    if (dto.paymentMethod !== undefined) sale.paymentMethod = dto.paymentMethod

    sale.hasBeenEdited = true

    return sale.save()
  }

  private calculateTrendData(
    sales: any[],
    preset: string,
    startDate: Date | null,
    endDate: Date | null
  ) {
    const now = new Date()
    const trend: { label: string; amount: number; count: number }[] = []

    if (preset === 'today') {
      const buckets = Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, '0')}:00`,
        amount: 0,
        count: 0,
      }))
      for (const sale of sales) {
        const timestamp = sale.recordedAt || sale.createdAt
        if (!timestamp) continue
        const h = new Date(timestamp).getHours()
        buckets[h].amount += sale.amount || 0
        buckets[h].count += 1
      }
      return buckets
    }

    if (!startDate || preset === 'all_time') {
      const monthsMap = new Map<string, { amount: number; count: number }>()
      for (const sale of sales) {
        const timestamp = sale.recordedAt || sale.createdAt
        if (!timestamp) continue
        const d = new Date(timestamp)
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
        const curr = monthsMap.get(key) || { amount: 0, count: 0 }
        curr.amount += sale.amount || 0
        curr.count += 1
        monthsMap.set(key, curr)
      }
      const sortedKeys = Array.from(monthsMap.keys()).sort()
      for (const k of sortedKeys) {
        const dateObj = new Date(k + '-01')
        const label = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        })
        trend.push({
          label,
          amount: monthsMap.get(k)!.amount,
          count: monthsMap.get(k)!.count,
        })
      }
      return trend
    }

    const dayMap = new Map<string, { amount: number; count: number }>()
    let currentDate = new Date(startDate)
    const end = endDate || now

    const daysDiff = Math.ceil(
      (end.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
    )

    while (currentDate <= end) {
      const dStr = currentDate.toISOString().split('T')[0]
      dayMap.set(dStr, { amount: 0, count: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    const dStrNow = end.toISOString().split('T')[0]
    if (!dayMap.has(dStrNow)) {
      dayMap.set(dStrNow, { amount: 0, count: 0 })
    }

    for (const sale of sales) {
      if (!sale.createdAt) continue
      const dStr = new Date(sale.createdAt).toISOString().split('T')[0]
      if (dayMap.has(dStr)) {
        const curr = dayMap.get(dStr)!
        curr.amount += sale.amount || 0
        curr.count += 1
      }
    }

    for (const [k, v] of dayMap.entries()) {
      const dateObj = new Date(k)
      let label = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
      if (daysDiff > 7) {
        label = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      }
      trend.push({ label, amount: v.amount, count: v.count })
    }
    return trend
  }
}
