import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Scan, ScanDocument } from '../schemas/scan.schema'
import { QRKit, QRKitDocument } from '../schemas/qrkit.schema'

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
  ) {}

  async createScan(dto: CreateScanDto) {
    const scan = await this.scanModel.create({
      qrKitId: dto.qrKitId,
      merchantId: dto.merchantId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      customerFingerprint: dto.customerFingerprint,
      deviceType: dto.deviceType,
      browserType: dto.browserType,
      scannedAt: new Date(),
    })

    // Check and set firstScannedAt for QR kit
    const qrKit = await this.qrKitModel.findById(dto.qrKitId)
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

  async recordAccountCopyBySerial(serialNumber: string) {
    // Find the QR kit by serial number
    const qrKit = await this.qrKitModel.findOne({
      serialNumber: serialNumber.toUpperCase(),
    })

    if (!qrKit) {
      throw new HttpException('QR kit not found', HttpStatus.NOT_FOUND)
    }

    // Find the most recent scan for this QR kit and update it
    const scan = await this.scanModel
      .findOne({ qrKitId: qrKit._id })
      .sort({ scannedAt: -1 })
      .exec()

    if (scan) {
      scan.accountCopied = true
      await scan.save()
      return { success: true, message: 'Copy event recorded' }
    }

    // If no scan found, still return success (scan might not have been created yet)
    return { success: true, message: 'Copy event recorded (no scan found)' }
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
}
