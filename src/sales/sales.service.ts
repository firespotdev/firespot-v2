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
import { FirebaseService } from '../services/firebase/firebase.service'
import { CreatePendingSaleDto } from './dto/create-pending-sale.dto'
import { RecordSaleDto } from './dto/record-sale.dto'
import { EditSaleDto } from './dto/edit-sale.dto'
import { SalesQueryDto } from './dto/sales-query.dto'
import { nanoid } from 'nanoid'
import { Customer, CustomerDocument } from '../schemas/customer.schema'
import { CloudinaryService } from '../users/services/cloudinary.service'
import { AccountLinkingService } from '../account-linking/account-linking.service'

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private eventsGateway: EventsGateway,
    private firebaseService: FirebaseService,
    private cloudinaryService: CloudinaryService,
    private accountLinkingService: AccountLinkingService,
  ) {}

  /**
   * Resolves the Firespot account behind a merchant's Customer record so a
   * merchant-recorded sale surfaces in that customer's Activity. Uses the
   * Customer's cached userId, else resolves/creates by phone and backfills the
   * Customer (covers records created before account-linking existed).
   * Best-effort: returns undefined on any failure so recording never breaks.
   */
  private async resolveCustomerUserId(
    customerId?: string | Types.ObjectId,
  ): Promise<Types.ObjectId | undefined> {
    if (!customerId) return undefined
    try {
      const customer = await this.customerModel.findById(customerId).exec()
      if (!customer) return undefined
      if (customer.userId) return customer.userId as Types.ObjectId

      const user = await this.accountLinkingService.resolveOrCreateUserByPhone(
        customer.phoneNumber,
      )
      if (!user?._id) return undefined

      customer.userId = user._id as Types.ObjectId
      await customer.save()
      return user._id as Types.ObjectId
    } catch {
      return undefined
    }
  }

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
      customerUserId: dto.customerUserId
        ? new Types.ObjectId(dto.customerUserId)
        : undefined,
      customerType,
      customerPurchaseCount,
      reference,
      qrKitName,
      status: 'PENDING',
    })

    await sale.save()

    // Emit event to the merchant's room
    this.eventsGateway.server.to(dto.merchantId).emit('sale.pending', sale)

    // Send Firebase push notification
    try {
      const merchant = await this.userModel
        .findById(dto.merchantId)
        .select('fcmTokens businessName')
        .exec()
      if (merchant?.fcmTokens?.length) {
        const title = 'New Pending Sale 💰'
        const body = `You have a new pending sale ${sale.amount ? `of ₦${sale.amount.toLocaleString()}` : ''} at ${sale.qrKitName || 'your terminal'}.`

        await this.firebaseService.sendPushNotification(
          merchant.fcmTokens,
          title,
          body,
          {
            saleId: sale._id.toString(),
            type: 'sale.pending',
            click_action: '/history', // Link to history page or relevant drawer
          },
        )
      }
    } catch (error) {
      // Don't fail the request if notification fails
      console.error('Failed to send push notification:', error)
    }

    return sale
  }

  //RANDOM REF?
  async createPendingCollectSale(
    merchantId: string,
    dto: CreatePendingSaleDto,
  ): Promise<Sale> {
    const firstKit = await this.qrKitModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        activationStatus: 'activated',
      })
      .sort({ createdAt: 1 })
      .exec()

    // Link a merchant-selected customer to their Firespot account.
    const linkedUserId = await this.resolveCustomerUserId(dto.customerId)

    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = new this.saleModel({
      ...dto,
      merchantId: merchantObjectId,
      status: 'PENDING',
      source: 'QR scan',
      isCollection: true,
      reference: `FS-${nanoid(8).toUpperCase()}`,
      serialNumber: firstKit?.serialNumber,
      qrKitName: firstKit?.name || firstKit?.serialNumber,
      isPaidInFull: dto.isPaidInFull,
      amountPaid: dto.amountPaid,
      totalDue: dto.totalDue,
      balanceOwed: dto.balanceOwed,
      customerId: dto.customerId
        ? new Types.ObjectId(dto.customerId)
        : undefined,
      customerUserId:
        linkedUserId ??
        (dto.customerUserId
          ? new Types.ObjectId(dto.customerUserId)
          : undefined),
      items: dto.items || [],
    })

    await sale.save()

    // Emit event to merchant room
    this.eventsGateway.server.to(merchantId).emit('sale.pending', sale)
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

    // Link a merchant-selected customer to their Firespot account so this
    // recorded sale appears in the customer's Activity.
    const linkedUserId = await this.resolveCustomerUserId(dto.customerId)

    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = new this.saleModel({
      merchantId: merchantObjectId,
      amount: dto.amount,
      description: dto.description,
      paymentMethod: dto.paymentMethod || 'Other',
      targetBankName,
      status:
        dto.isPaidInFull === false || (dto.balanceOwed && dto.balanceOwed > 0)
          ? 'OUTSTANDING'
          : 'CONFIRMED',
      recordedAt: new Date(),
      customerType: 'New', // Default for manual as per request
      source: 'Manual',
      reference: `FS-${nanoid(8).toUpperCase()}`,
      serialNumber: firstKit?.serialNumber,
      qrKitName: firstKit?.name || firstKit?.serialNumber,
      isPaidInFull: dto.isPaidInFull,
      amountPaid: dto.amountPaid,
      totalDue: dto.totalDue,
      balanceOwed: dto.balanceOwed,
      customerId: dto.customerId
        ? new Types.ObjectId(dto.customerId)
        : undefined,
      customerUserId: linkedUserId,
      items: dto.items || [],
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      repayments: dto.amountPaid && dto.amountPaid > 0 ? [{
        amount: dto.amountPaid,
        paymentMethod: dto.paymentMethod || 'Other',
        recordedAt: new Date(),
      }] : [],
    })

    await sale.save()
    return sale.populate('customerId')
  }

  async getSales(merchantId: string, query: SalesQueryDto) {
    const {
      status,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '10',
      mode,
      paymentMethod,
      qrKitName,
      location,
      customerId,
    } = query
    const skip = (Number(page) - 1) * Number(limit)
    const merchantObjectId = new Types.ObjectId(merchantId)
    const filter: any = { merchantId: merchantObjectId }

    if (customerId) {
      filter.customerId = new Types.ObjectId(customerId)
    }

    if (status && status !== 'ALL') {
      const upperStatus = status.toUpperCase()
      if (upperStatus === 'PAID' || upperStatus === 'CONFIRMED') {
        filter.status = 'CONFIRMED'
      } else if (upperStatus === 'UNCONFIRMED' || upperStatus === 'PENDING') {
        filter.status = 'PENDING'
      } else if (upperStatus === 'ARCHIVED' || upperStatus === 'CANCELLED') {
        filter.$or = [
          { isArchived: true },
          { status: 'CANCELLED' },
          { status: 'ARCHIVED' },
        ]
      } else if (upperStatus === 'OWING' || upperStatus === 'OUTSTANDING') {
        filter.$or = [
          { status: 'OUTSTANDING' },
          { balanceOwed: { $gt: 0 } },
        ]
      } else {
        filter.status = status
      }
    }

    if (mode === 'recorded') {
      filter.isCollection = { $ne: true }
    } else if (mode === 'collected') {
      filter.isCollection = true
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      filter.paymentMethod = paymentMethod
    }

    if (qrKitName && qrKitName !== 'ALL') {
      filter.qrKitName = qrKitName
    }

    if (location && location !== 'ALL') {
      filter.location = location
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
        .populate('customerId')
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

  /**
   * Public, unauthenticated sale view for the customer pay page
   * (/pay/:serial?saleId=...). Exposes only the fields the payer needs —
   * never the merchant's phone number or bank account list.
   */
  async getPublicSaleById(saleId: string) {
    if (!mongoose.isValidObjectId(saleId)) {
      throw new NotFoundException('Sale not found')
    }

    const sale = await this.saleModel
      .findById(saleId)
      .populate('merchantId', 'businessName merchantSlug profilePhotoUrl')
      .exec()

    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    const merchant = sale.merchantId as any

    return {
      id: sale._id,
      status: sale.status,
      amount: sale.amount,
      items: (sale.items || []).map((item: any) => ({
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
      })),
      location: sale.location,
      createdAt: (sale as any).createdAt,
      recordedAt: sale.recordedAt,
      reference: sale.reference,
      receiptUrl: sale.receiptUrl,
      isCopied: sale.isCopied,
      targetBankName: sale.targetBankName,
      paymentMethod: sale.paymentMethod,
      description: sale.description,
      serialNumber: sale.serialNumber,
      merchant: merchant
        ? {
            businessName: merchant.businessName,
            merchantSlug: merchant.merchantSlug,
            profilePhotoUrl: merchant.profilePhotoUrl,
          }
        : null,
    }
  }

  async getSaleById(merchantId: string, saleId: string): Promise<Sale> {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel
      .findOne({ _id: saleId, merchantId: merchantObjectId })
      .populate('customerId')
      .exec()

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
    const pendingFilter: any = {
      merchantId: merchantObjectId,
      status: 'PENDING',
    }
    if (query?.mode === 'recorded') {
      pendingFilter.isCollection = { $ne: true }
    } else if (query?.mode === 'collected') {
      pendingFilter.isCollection = true
    }
    const pendingCount = await this.saleModel.countDocuments(pendingFilter)

    // Helper to get actual recorded money from a sale
    const getSaleRecordedAmount = (sale: any) => {
      if (sale.status === 'CONFIRMED') {
        return sale.amountPaid !== undefined && sale.amountPaid !== null
          ? sale.amountPaid
          : sale.amount || 0
      }
      if (sale.status === 'OUTSTANDING') {
        return sale.amountPaid || 0
      }
      return 0
    }

    // For filtered stats
    const dateRange = this.calculateDateRange(query || {})

    const filter: Record<string, any> = {
      merchantId: merchantObjectId,
      status: { $in: ['CONFIRMED', 'OUTSTANDING'] },
    }
    if (query?.mode === 'recorded') {
      filter.isCollection = { $ne: true }
    } else if (query?.mode === 'collected') {
      filter.isCollection = true
    }

    if (query?.paymentMethod && query.paymentMethod !== 'ALL') {
      filter.paymentMethod = query.paymentMethod
    }

    if (query?.qrKitName && query.qrKitName !== 'ALL') {
      filter.qrKitName = query.qrKitName
    }

    if (query?.location && query.location !== 'ALL') {
      filter.location = query.location
    }

    if (dateRange.startDate) {
      const end = dateRange.endDate || new Date()
      filter.$or = [
        { recordedAt: { $gte: dateRange.startDate, $lte: end } },
        {
          recordedAt: { $exists: false },
          createdAt: { $gte: dateRange.startDate, $lte: end },
        },
      ]
    }

    const filteredConfirmed = await this.saleModel
      .find(filter)
      .select('amount amountPaid status recordedAt createdAt')
      .lean()

    const totalConfirmedFilter: any = {
      merchantId: merchantObjectId,
      status: { $in: ['CONFIRMED', 'OUTSTANDING'] },
    }
    if (query?.mode === 'recorded') {
      totalConfirmedFilter.isCollection = { $ne: true }
    } else if (query?.mode === 'collected') {
      totalConfirmedFilter.isCollection = true
    }
    const totalConfirmed = await this.saleModel
      .find(totalConfirmedFilter)
      .select('amount amountPaid status')
      .lean()

    const statsAmount = filteredConfirmed.reduce(
      (sum, sale) => sum + getSaleRecordedAmount(sale),
      0,
    )
    const totalSalesAmount = totalConfirmed.reduce(
      (sum, sale) => sum + getSaleRecordedAmount(sale),
      0,
    )

    const preset = query?.preset || 'today'
    const trend = this.calculateTrendData(
      filteredConfirmed,
      preset,
      dateRange.startDate,
      dateRange.endDate,
    )

    const response: any = {
      pendingSalesCount: pendingCount,
      todaySalesCount: filteredConfirmed.filter((s) => getSaleRecordedAmount(s) > 0 || s.status === 'CONFIRMED').length,
      todaySalesAmount: statsAmount,
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

      const prevFilter: any = { merchantId, status: { $in: ['CONFIRMED', 'OUTSTANDING'] } }
      prevFilter.createdAt = { $gte: prevStart, $lte: prevEnd }

      const prevSales = await this.saleModel
        .find(prevFilter)
        .select('amount amountPaid status')
        .lean()
      previousStatsAmount = prevSales.reduce(
        (sum, sale) => sum + getSaleRecordedAmount(sale),
        0,
      )

      if (preset === 'today') previousPeriodLabel = 'yesterday'
      else if (preset === 'this_week') previousPeriodLabel = 'last week'
      else if (preset === 'last_7_days') previousPeriodLabel = 'previous 7 days'
      else if (preset === 'last_30_days')
        previousPeriodLabel = 'previous 30 days'
      else if (preset === 'last_90_days')
        previousPeriodLabel = 'previous 90 days'
      else if (preset === 'custom') previousPeriodLabel = 'previous period'

      let percentageChange = 0
      if (previousStatsAmount === 0) {
        if (statsAmount > 0) percentageChange = 100
      } else {
        percentageChange = Math.round(
          ((statsAmount - previousStatsAmount) / previousStatsAmount) * 100,
        )
      }

      response.percentageChange = percentageChange
      response.previousPeriodLabel = previousPeriodLabel
    }

    return response
  }

  async recordSale(merchantId: string, saleId: string, dto: RecordSaleDto) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({
      _id: saleId,
      merchantId: merchantObjectId,
    })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    sale.status =
      dto.isPaidInFull === false || (dto.balanceOwed && dto.balanceOwed > 0)
        ? 'OUTSTANDING'
        : 'CONFIRMED'
    sale.amount = dto.amount
    sale.description = dto.description
    sale.paymentMethod = dto.paymentMethod || 'Other'
    sale.recordedAt = new Date()
    if (dto.isPaidInFull !== undefined) sale.isPaidInFull = dto.isPaidInFull
    if (dto.amountPaid !== undefined) sale.amountPaid = dto.amountPaid
    if (dto.totalDue !== undefined) sale.totalDue = dto.totalDue
    if (dto.balanceOwed !== undefined) sale.balanceOwed = dto.balanceOwed

    if (dto.amountPaid && dto.amountPaid > 0) {
      sale.repayments = [{
        amount: dto.amountPaid,
        paymentMethod: dto.paymentMethod || 'Other',
        recordedAt: new Date(),
      }]
    } else {
      sale.repayments = []
    }

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

    // Persist a customer selected at confirm time, and link them to their
    // Firespot account if the sale isn't already linked (covers collect sales
    // and customer selection during the confirm step).
    if (dto.customerId) {
      sale.customerId = new Types.ObjectId(dto.customerId)
    }
    if (!sale.customerUserId && sale.customerId) {
      const linkedUserId = await this.resolveCustomerUserId(sale.customerId)
      if (linkedUserId) sale.customerUserId = linkedUserId
    }

    const savedSale = await sale.save()
    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('sale.confirmed', savedSale)
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('sale.confirmed', savedSale)
    return savedSale
  }

  async cancelSale(merchantId: string, saleId: string) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({
      _id: saleId,
      merchantId: merchantObjectId,
    })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }

    sale.status = 'CANCELLED'
    const savedSale = await sale.save()
    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('sale.cancelled', savedSale)
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('sale.cancelled', savedSale)
    return savedSale
  }

  async editSale(merchantId: string, saleId: string, dto: EditSaleDto) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({
      _id: saleId,
      merchantId: merchantObjectId,
    })
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

  async archiveSale(merchantId: string, saleId: string): Promise<Sale> {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const sale = await this.saleModel.findOne({
      _id: saleId,
      merchantId: merchantObjectId,
    })
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }
    sale.isArchived = true
    return sale.save()
  }

  async uploadReceipt(saleId: string, fileBuffer: Buffer): Promise<Sale> {
    const sale = await this.saleModel.findById(saleId)
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }
    const upload = await this.cloudinaryService.uploadDocument(fileBuffer)
    sale.receiptUrl = upload.url
    sale.receiptPublicId = upload.publicId
    const savedSale = await sale.save()

    // Emit event to merchant room and sale room
    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('receipt.uploaded', savedSale)
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('receipt.uploaded', savedSale)
    return savedSale
  }

  async deleteReceipt(saleId: string): Promise<Sale> {
    const sale = await this.saleModel.findById(saleId)
    if (!sale) {
      throw new NotFoundException('Sale not found')
    }
    if (sale.status !== 'PENDING') {
      throw new UnprocessableEntityException(
        'Receipt can only be removed while the sale is pending',
      )
    }

    if (sale.receiptPublicId) {
      await this.cloudinaryService.deleteImage(sale.receiptPublicId)
    }
    sale.receiptUrl = undefined
    sale.receiptPublicId = undefined
    const savedSale = await sale.save()

    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('receipt.deleted', savedSale)
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('receipt.deleted', savedSale)
    return savedSale
  }

  /**
   * The personal user's own activity feed: confirmed payments they made,
   * matched by the customerUserId attached when they paid. This is the
   * customer's perspective — NOT the merchant's customer ledger.
   */
  async getMyActivity(userId: string): Promise<Sale[]> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return []
    }

    return this.saleModel
      .find({
        customerUserId: new Types.ObjectId(userId),
        status: 'CONFIRMED',
      })
      .sort({ createdAt: -1 })
      .populate(
        'merchantId',
        'businessName profilePhotoUrl merchantSlug businessIndustry',
      )
      .exec()
  }

  /**
   * Attach a logged-in payer to a sale when they commit to paying (copy the
   * account). Only touches pending sales, and won't reassign a sale that is
   * already claimed by a different user.
   */
  async claimSalePayer(
    saleId: string,
    userId: string,
    customerName?: string,
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(saleId) || !Types.ObjectId.isValid(userId)) {
      return { success: false }
    }

    const userObjectId = new Types.ObjectId(userId)
    const update: Record<string, unknown> = { customerUserId: userObjectId }
    if (customerName) {
      update.customerName = customerName
    }

    await this.saleModel
      .updateOne(
        {
          _id: new Types.ObjectId(saleId),
          status: 'PENDING',
          $or: [
            { customerUserId: { $exists: false } },
            { customerUserId: null },
            { customerUserId: userObjectId },
          ],
        },
        { $set: update },
      )
      .exec()

    return { success: true }
  }

  private calculateTrendData(
    sales: any[],
    preset: string,
    startDate: Date | null,
    endDate: Date | null,
  ) {
    const getRecordedAmt = (s: any) => {
      if (s.status === 'CONFIRMED') return s.amountPaid !== undefined && s.amountPaid !== null ? s.amountPaid : (s.amount || 0)
      if (s.status === 'OUTSTANDING') return s.amountPaid || 0
      return 0
    }

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
        const recAmt = getRecordedAmt(sale)
        buckets[h].amount += recAmt
        if (recAmt > 0 || sale.status === 'CONFIRMED') {
          buckets[h].count += 1
        }
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
        const recAmt = getRecordedAmt(sale)
        curr.amount += recAmt
        if (recAmt > 0 || sale.status === 'CONFIRMED') {
          curr.count += 1
        }
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
        const recAmt = getRecordedAmt(sale)
        curr.amount += recAmt
        if (recAmt > 0 || sale.status === 'CONFIRMED') {
          curr.count += 1
        }
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

  async getCustomerOutstandingSales(merchantId: string, customerId: string) {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const customerObjectId = new Types.ObjectId(customerId)

    return this.saleModel
      .find({
        merchantId: merchantObjectId,
        customerId: customerObjectId,
        $or: [
          { status: 'OUTSTANDING' },
          { balanceOwed: { $gt: 0 } },
          { isPaidInFull: false },
        ],
      })
      .sort({ createdAt: 1, dueDate: 1 })
      .populate('customerId')
      .exec()
  }

  async recordRepayment(
    merchantId: string | undefined,
    targetIdentifier: string,
    dto: { amountPaid: number; paymentMethod?: string; customerId?: string },
  ): Promise<any> {
    const repaymentAmount = dto.amountPaid || 0
    let targetCustomerId: string | undefined = dto.customerId
    let primarySale: any = null

    if (targetIdentifier) {
      primarySale = await this.saleModel.findById(targetIdentifier).exec()
      if (primarySale && primarySale.customerId) {
        targetCustomerId = primarySale.customerId.toString()
      }
    }

    if (!targetCustomerId && primarySale) {
      const currentAmountPaid = primarySale.amountPaid || 0
      const currentBalanceOwed =
        primarySale.balanceOwed !== undefined && primarySale.balanceOwed !== null
          ? primarySale.balanceOwed
          : primarySale.amount
            ? Math.max(0, primarySale.amount - currentAmountPaid)
            : 0

      const newAmountPaid = currentAmountPaid + repaymentAmount
      const newBalanceOwed = Math.max(0, currentBalanceOwed - repaymentAmount)
      const isPaidInFull = newBalanceOwed <= 0

      primarySale.amountPaid = newAmountPaid
      primarySale.balanceOwed = newBalanceOwed
      primarySale.isPaidInFull = isPaidInFull
      if (dto.paymentMethod) primarySale.paymentMethod = dto.paymentMethod
      primarySale.status = isPaidInFull ? 'CONFIRMED' : 'OUTSTANDING'

      if (!primarySale.repayments) {
        primarySale.repayments = []
      }
      if (currentAmountPaid > 0 && primarySale.repayments.length === 0) {
        primarySale.repayments.push({
          amount: currentAmountPaid,
          paymentMethod: primarySale.paymentMethod || 'Other',
          recordedAt: primarySale.recordedAt || primarySale.createdAt || new Date(),
        })
      }
      primarySale.repayments.push({
        amount: repaymentAmount,
        paymentMethod: dto.paymentMethod || 'Other',
        recordedAt: new Date(),
      })

      if (!primarySale.customerUserId && primarySale.customerId) {
        const linkedUserId = await this.resolveCustomerUserId(
          primarySale.customerId,
        )
        if (linkedUserId) primarySale.customerUserId = linkedUserId
      }

      await primarySale.save()
      await primarySale.populate('customerId')
      return primarySale
    }

    if (!targetCustomerId) {
      throw new NotFoundException('Customer or Sale not found')
    }

    const filter: any = {
      customerId: new Types.ObjectId(targetCustomerId),
      $or: [
        { status: 'OUTSTANDING' },
        { balanceOwed: { $gt: 0 } },
        { isPaidInFull: false },
      ],
    }
    if (merchantId) {
      filter.merchantId = new Types.ObjectId(merchantId)
    }

    const outstandingSales = await this.saleModel
      .find(filter)
      .sort({ createdAt: 1, dueDate: 1 })
      .exec()

    let remainingRepayment = repaymentAmount
    const updatedSales: any[] = []

    for (const sale of outstandingSales) {
      if (remainingRepayment <= 0) break

      const currentBalance =
        sale.balanceOwed !== undefined && sale.balanceOwed !== null
          ? sale.balanceOwed
          : sale.amount
            ? Math.max(0, sale.amount - (sale.amountPaid || 0))
            : 0

      if (currentBalance <= 0) continue

      const allocated = Math.min(remainingRepayment, currentBalance)
      const newAmountPaid = (sale.amountPaid || 0) + allocated
      const newBalanceOwed = currentBalance - allocated
      const isPaidInFull = newBalanceOwed <= 0

      sale.amountPaid = newAmountPaid
      sale.balanceOwed = newBalanceOwed
      sale.isPaidInFull = isPaidInFull
      sale.status = isPaidInFull ? 'CONFIRMED' : 'OUTSTANDING'
      if (dto.paymentMethod) {
        sale.paymentMethod = dto.paymentMethod
      }

      if (!sale.repayments) {
        sale.repayments = []
      }
      const prevPaid = newAmountPaid - allocated
      if (prevPaid > 0 && sale.repayments.length === 0) {
        sale.repayments.push({
          amount: prevPaid,
          paymentMethod: sale.paymentMethod || 'Other',
          recordedAt: sale.recordedAt || sale.createdAt || new Date(),
        })
      }
      sale.repayments.push({
        amount: allocated,
        paymentMethod: dto.paymentMethod || 'Other',
        recordedAt: new Date(),
      })

      if (!sale.customerUserId && sale.customerId) {
        const linkedUserId = await this.resolveCustomerUserId(sale.customerId)
        if (linkedUserId) sale.customerUserId = linkedUserId
      }

      await sale.save()
      await sale.populate('customerId')
      updatedSales.push(sale)

      remainingRepayment -= allocated

      if (sale.merchantId) {
        this.eventsGateway.server
          .to(sale.merchantId.toString())
          .emit('sale.updated', sale)
      }
    }

    const remainingDebts = await this.saleModel
      .find({
        customerId: new Types.ObjectId(targetCustomerId),
        $or: [
          { status: 'OUTSTANDING' },
          { balanceOwed: { $gt: 0 } },
          { isPaidInFull: false },
        ],
      })
      .exec()

    const totalRemainingBalance = remainingDebts.reduce(
      (sum, s) => sum + (s.balanceOwed || 0),
      0,
    )

    const resultSale = primarySale || updatedSales[0] || {}
    const resObj = typeof (resultSale as any).toObject === 'function' ? (resultSale as any).toObject() : resultSale

    return {
      ...resObj,
      waterfall: {
        amountPaid: repaymentAmount,
        totalRemainingBalance,
        affectedSales: updatedSales,
      },
    }
  }

  async getOutstandingSummary(merchantId: string) {
    const merchantObjectId = new Types.ObjectId(merchantId)

    const owingSales = await this.saleModel
      .find({
        merchantId: merchantObjectId,
        $or: [
          { status: 'OUTSTANDING' },
          { balanceOwed: { $gt: 0 } },
          { isPaidInFull: false },
        ],
      })
      .populate('customerId')
      .exec()

    const customerMap = new Map<
      string,
      {
        customerId: string
        customerName: string
        customerPhone: string
        customerAvatar?: string
        transactionCount: number
        totalOwed: number
      }
    >()

    let totalOutstandingAmount = 0

    for (const sale of owingSales) {
      const bal =
        sale.balanceOwed !== undefined && sale.balanceOwed !== null
          ? sale.balanceOwed
          : sale.amount
            ? Math.max(0, sale.amount - (sale.amountPaid || 0))
            : 0

      if (bal <= 0) continue

      totalOutstandingAmount += bal

      let custId = 'anonymous'
      let custName = 'Anonymous Customer'
      let custPhone = ''
      let custAvatar = ''

      if (sale.customerId) {
        const customer = sale.customerId as any
        custId = customer._id ? customer._id.toString() : 'anonymous'
        custName = customer.name || 'Anonymous Customer'
        custPhone = customer.phoneNumber || ''
        custAvatar = customer.profilePhotoUrl || ''
      } else if (sale.customerFingerprint) {
        custId = `fingerprint-${sale.customerFingerprint}`
        custName =
          sale.customerType === 'Repeat' ? 'Repeat Customer' : 'New Customer'
      }

      const existing = customerMap.get(custId)
      if (existing) {
        existing.transactionCount += 1
        existing.totalOwed += bal
      } else {
        customerMap.set(custId, {
          customerId: custId,
          customerName: custName,
          customerPhone: custPhone,
          customerAvatar: custAvatar,
          transactionCount: 1,
          totalOwed: bal,
        })
      }
    }

    return {
      totalOutstandingAmount,
      customers: Array.from(customerMap.values()),
    }
  }

  async recordScan(saleId: string): Promise<Sale> {
    const sale = await this.saleModel.findById(saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    sale.isScanned = true;
    const savedSale = await sale.save();

    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('sale.scanned', savedSale);
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('sale.scanned', savedSale);

    return savedSale;
  }

  async recordCopy(saleId: string): Promise<Sale> {
    const sale = await this.saleModel.findById(saleId);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    sale.isCopied = true;
    const savedSale = await sale.save();

    this.eventsGateway.server
      .to(sale.merchantId.toString())
      .emit('sale.copied', savedSale);
    this.eventsGateway.server
      .to(`sale-${sale._id.toString()}`)
      .emit('sale.copied', savedSale);

    return savedSale;
  }
}
