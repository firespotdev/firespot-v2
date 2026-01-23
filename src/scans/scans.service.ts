import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Scan, ScanDocument } from '../schemas/scan.schema'
import { QRKit, QRKitDocument } from '../schemas/qrkit.schema'
import { User, UserDocument } from '../schemas/user.schema'
import {
  InsightsQueryDto,
  DateRangePreset,
  MerchantInsightsResponse,
} from './dto/insights-query.dto'

export interface CreateScanDto {
  qrKitId: string
  merchantId: string
  ipAddress: string
  userAgent: string
  customerFingerprint?: string
  deviceType?: string
  browserType?: string
}

@Injectable()
export class ScansService {
  constructor(
    @InjectModel(Scan.name) private scanModel: Model<ScanDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createScan(dto: CreateScanDto) {
    // Convert string IDs to ObjectIds for proper type matching
    const qrKitId = new Types.ObjectId(dto.qrKitId)
    const merchantId = new Types.ObjectId(dto.merchantId)

    const scan = await this.scanModel.create({
      qrKitId,
      merchantId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      customerFingerprint: dto.customerFingerprint,
      deviceType: dto.deviceType,
      browserType: dto.browserType,
      scannedAt: new Date(),
    })

    // Check and set firstScannedAt for QR kit
    const qrKit = await this.qrKitModel.findById(qrKitId)
    if (qrKit && !qrKit.firstScannedAt) {
      qrKit.firstScannedAt = new Date()
      await qrKit.save()
    }

    return scan
  }

  async recordAccountCopy(scanId: string) {
    return this.scanModel.findByIdAndUpdate(
      scanId,
      { accountCopied: true },
      { new: true },
    )
  }

  async recordAccountCopyBySerial(
    serialNumber: string,
    accountNumber?: string,
    bankName?: string,
  ) {
    // Find the QR kit by serial number
    const qrKit = await this.qrKitModel.findOne({
      serialNumber: serialNumber.toUpperCase(),
    })

    if (!qrKit) {
      throw new HttpException('QR kit not found', HttpStatus.NOT_FOUND)
    }

    // Find the most recent scan for this QR kit within the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    // First, try to find a scan that hasn't been marked as copied yet
    let scan = await this.scanModel
      .findOne({
        qrKitId: qrKit._id,
        scannedAt: { $gte: tenMinutesAgo },
        accountCopied: { $ne: true },
      })
      .sort({ scannedAt: -1 })
      .exec()

    // If not found, get the most recent scan regardless of copied status
    if (!scan) {
      scan = await this.scanModel
        .findOne({
          qrKitId: qrKit._id,
          scannedAt: { $gte: tenMinutesAgo },
        })
        .sort({ scannedAt: -1 })
        .exec()
    }

    // If still not found, try without time restriction (fallback)
    if (!scan) {
      scan = await this.scanModel
        .findOne({ qrKitId: qrKit._id })
        .sort({ scannedAt: -1 })
        .exec()
    }

    if (scan) {
      scan.accountCopied = true
      if (accountNumber) {
        scan.copiedAccountNumber = accountNumber
      }
      if (bankName) {
        scan.copiedBankName = bankName
      }
      await scan.save()
      return { success: true, message: 'Copy event recorded' }
    }

    // If no scan found at all, throw exception
    const scanCount = await this.scanModel.countDocuments({
      qrKitId: qrKit._id,
    })

    console.error(
      `No scan found for QR kit ${qrKit.serialNumber}. Total scans: ${scanCount}`,
    )

    throw new HttpException(
      {
        success: false,
        message: `Copy event not recorded: no scan found (total scans: ${scanCount})`,
      },
      HttpStatus.NOT_FOUND,
    )
  }

  async getScanCountByQRKit(qrKitId: string): Promise<number> {
    return this.scanModel.countDocuments({ qrKitId })
  }

  async getScanCountByMerchant(merchantId: string): Promise<number> {
    return this.scanModel.countDocuments({ merchantId })
  }

  async getScansByQRKit(qrKitId: string, limit: number = 50, skip: number = 0) {
    return this.scanModel
      .find({ qrKitId })
      .sort({ scannedAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec()
  }

  async getScansByMerchant(
    merchantId: string,
    limit: number = 50,
    skip: number = 0,
  ) {
    return this.scanModel
      .find({ merchantId })
      .populate('qrKitId', 'serialNumber')
      .sort({ scannedAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec()
  }

  async getScanCountThisWeek(merchantId: string): Promise<number> {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    return this.scanModel.countDocuments({
      merchantId,
      scannedAt: { $gte: startOfWeek },
    })
  }

  async getReturningCustomersCount(merchantId: string): Promise<number> {
    // Get all scans for this merchant with fingerprints
    const scans = await this.scanModel
      .find({
        merchantId,
        customerFingerprint: { $exists: true, $ne: null },
      })
      .select('customerFingerprint')
      .exec()

    // Count fingerprints that appear more than once
    const fingerprintCounts = new Map<string, number>()
    scans.forEach((scan) => {
      const fp = scan.customerFingerprint
      if (fp) {
        fingerprintCounts.set(fp, (fingerprintCounts.get(fp) || 0) + 1)
      }
    })

    // Count how many fingerprints have been used more than once (returning customers)
    let returningCount = 0
    fingerprintCounts.forEach((count) => {
      if (count > 1) {
        returningCount++
      }
    })

    return returningCount
  }

  async getMerchantStats(merchantId: string) {
    const [totalScans, scansThisWeek, returningCustomers] = await Promise.all([
      this.getScanCountByMerchant(merchantId),
      this.getScanCountThisWeek(merchantId),
      this.getReturningCustomersCount(merchantId),
    ])

    return {
      totalScans,
      scansThisWeek,
      returningCustomers,
    }
  }

  /**
   * Calculate date range from preset or custom dates
   */
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

  /**
   * Get comprehensive merchant insights with date range filtering
   */
  async getMerchantInsights(
    merchantId: string,
    query: InsightsQueryDto,
  ): Promise<MerchantInsightsResponse> {
    const dateRange = this.calculateDateRange(query)

    // Build match stage with date filter
    const matchStage: Record<string, unknown> = {
      merchantId: new Types.ObjectId(merchantId),
    }

    if (dateRange.startDate) {
      matchStage.scannedAt = {
        $gte: dateRange.startDate,
        ...(dateRange.endDate && { $lte: dateRange.endDate }),
      }
    }

    // Use $facet for efficient multi-result aggregation
    const [result] = await this.scanModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // QR kit scans breakdown
          qrKitScans: [
            {
              $group: {
                _id: '$qrKitId',
                scanCount: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: 'qrkits',
                localField: '_id',
                foreignField: '_id',
                as: 'qrKit',
              },
            },
            { $unwind: { path: '$qrKit', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                qrKitId: { $toString: '$_id' },
                serialNumber: { $ifNull: ['$qrKit.serialNumber', 'Unknown'] },
                scanCount: 1,
              },
            },
            { $sort: { scanCount: -1 } },
          ],
          // Account copies with bank breakdown
          accountCopies: [
            { $match: { accountCopied: true } },
            {
              $group: {
                _id: '$copiedBankName',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                bankName: { $ifNull: ['$_id', 'Unknown'] },
                count: 1,
                _id: 0,
              },
            },
            { $sort: { count: -1 } },
          ],
          // Customer breakdown (new vs returning)
          customers: [
            {
              $group: {
                _id: '$customerFingerprint',
                visitCount: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                returning: {
                  $sum: { $cond: [{ $gt: ['$visitCount', 1] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ])

    // Get linked counts from User and QRKit collections
    const [user, qrKitsCount] = await Promise.all([
      this.userModel.findById(merchantId).select('bankAccounts'),
      this.qrKitModel.countDocuments({
        merchantId: new Types.ObjectId(merchantId),
        activationStatus: 'activated',
      }),
    ])

    // Transform aggregation result
    const customerData = result.customers[0] || { total: 0, returning: 0 }
    const totalScans = result.qrKitScans.reduce(
      (sum: number, kit: { scanCount: number }) => sum + kit.scanCount,
      0,
    )
    const totalCopies = result.accountCopies.reduce(
      (sum: number, bank: { count: number }) => sum + bank.count,
      0,
    )

    return {
      traffic: {
        totalCustomers: customerData.total,
        customerBreakdown: {
          newCustomers: customerData.total - customerData.returning,
          returningCustomers: customerData.returning,
          totalCustomers: customerData.total,
        },
      },
      qrKitScans: {
        totalScans,
        breakdown: result.qrKitScans,
      },
      accountCopies: {
        totalCopies,
        bankBreakdown: result.accountCopies,
      },
      linkedCounts: {
        bankAccounts: user?.bankAccounts?.length || 0,
        qrKits: qrKitsCount,
      },
      dateRange: {
        startDate: dateRange.startDate?.toISOString() || null,
        endDate: dateRange.endDate?.toISOString() || null,
        preset: query.preset || DateRangePreset.ALL_TIME,
      },
    }
  }
}
